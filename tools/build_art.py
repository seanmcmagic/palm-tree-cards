"""Cut my own art out of the USPCC print file into the game's texture sheets.

Reads art/source/ (git-ignored, never committed) and writes art/deck_hi.png (2048x1024) and
art/deck_lo.png (1024x512, phones). Run:  python tools/build_art.py   (needs pymupdf + pillow + numpy)

Only MY art is taken: the card back, the custom Ace of Spades, the Joker and the tuck front.
The other faces in the print file are Daniel Schneider's licensed redraws and stay out until the
licence is confirmed to cover digital use.

Print file layout (Palm Tree Playing Cards.pdf, 5 pages, CMYK images at ~396 dpi with 1/8 in bleed):
  p1  tuck dieline (1570x1570), card back, Joker (x2, same image)
  p2  spades   p3 diamonds   p4 clubs   p5 hearts   (Ace of Spades = p2, top-left)

Sheet: 4 cells of 512x1024 in a row: back, AS, JK, tuck. Cards are 5:7, so each cell stores the card
stretched vertically (the mesh UVs undo it). An 8 px gutter (4 px on the lo sheet) keeps mip levels
from bleeding between cells; transparent pixels carry white RGB so alpha-tested edges don't darken.
"""
import sys
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'source' / 'Palm Tree Playing Cards.pdf'
CELL_W, CELL_H, GUTTER = 512, 1024, 8
CELLS = ['back', 'AS', 'JK', 'tuck']
CORNER = 18 / 300  # corner radius as a fraction of card width, same as the canvas cards (CR / CW in src/art.js)
HAIRLINE = (0xc9, 0xdf, 0xe1, 255)  # C.hairline, the canvas cards' edge stroke
TRIM_IN = (2.5, 3.5)
TUCK_FRONT = (272, 432, 772, 1127)  # front panel on the 1570 px dieline art, between the two side strips


def pdf_image(doc, page, xref_pick):
    """Embedded image on a page as RGB, picked by a function of (xref, rect)."""
    p = doc[page]
    for info in p.get_images(full=True):
        x = info[0]
        rects = p.get_image_rects(x)
        if rects and xref_pick(x, rects[0]):
            pix = pymupdf.Pixmap(doc, x)
            if pix.n - pix.alpha != 3:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            if pix.alpha:
                pix = pymupdf.Pixmap(pix, 0)
            return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    raise SystemExit(f'image not found on page {page + 1}')


def trim(img):
    """Cut a bleed image to the 2.5 x 3.5 in trim, centred (the bleed is even on all four sides)."""
    w, h = img.size
    dpi = (w / (TRIM_IN[0] + 0.25) + h / (TRIM_IN[1] + 0.25)) / 2
    tw, th = round(TRIM_IN[0] * dpi), round(TRIM_IN[1] * dpi)
    x, y = (w - tw) // 2, (h - th) // 2
    return img.crop((x, y, x + tw, y + th))


def card_cell(img, cw, ch, g):
    """Card into a cell: stretched to the inner rect, rounded alpha corners, hairline edge, white gutter."""
    iw, ih = cw - 2 * g, ch - 2 * g
    sy = (ih / iw) / (TRIM_IN[1] / TRIM_IN[0])  # vertical stretch; corners are round on the real card, elliptical here
    ss = 4  # supersample the masks so the corners are smooth
    W, H, rx, lw = iw * ss, ih * ss, CORNER * iw * ss, max(1, round(iw / 150)) * ss

    def shape(inset_x):
        m = Image.new('L', (W, H), 0)
        ellipse_rect(ImageDraw.Draw(m), W, H, rx - inset_x, (rx - inset_x) * sy, (inset_x, inset_x * sy))
        return m

    outer, inner = shape(0), shape(lw)
    ring = Image.fromarray(np.clip(np.asarray(outer, int) - np.asarray(inner, int), 0, 255).astype(np.uint8))
    card = img.convert('RGBA').resize((iw, ih), Image.LANCZOS)
    card.paste(Image.new('RGBA', (iw, ih), HAIRLINE), (0, 0), ring.resize((iw, ih), Image.LANCZOS))
    card.putalpha(outer.resize((iw, ih), Image.LANCZOS))
    cell = Image.new('RGBA', (cw, ch), (255, 255, 255, 0))
    cell.paste(card, (g, g))
    a = np.asarray(cell).copy()
    a[a[..., 3] == 0, :3] = 255
    return Image.fromarray(a)


def ellipse_rect(d, w, h, rx, ry, inset=(0, 0)):
    """Rounded rectangle with elliptical corners (rx != ry), drawn as a polygon."""
    ix, iy = inset
    pts = []
    for cx, cy, a0 in ((w - ix - rx, iy + ry, -90), (w - ix - rx, h - iy - ry, 0), (ix + rx, h - iy - ry, 90), (ix + rx, iy + ry, 180)):
        for k in range(17):
            t = np.radians(a0 + k * 90 / 16)
            pts.append((cx + rx * np.cos(t), cy + ry * np.sin(t)))
    d.polygon(pts, fill=255)


def flat_cell(img, cw, ch, g):
    """Opaque art (the tuck): inner rect plus an edge-replicated gutter."""
    inner = np.asarray(img.convert('RGB').resize((cw - 2 * g, ch - 2 * g), Image.LANCZOS))
    a = np.pad(inner, ((g, g), (g, g), (0, 0)), mode='edge')
    return Image.fromarray(np.dstack([a, np.full(a.shape[:2], 255, np.uint8)]))


def main():
    if not SRC.exists():
        sys.exit(f'missing {SRC} (art/source is git-ignored; copy the print file in first)')
    doc = pymupdf.open(SRC)
    back = pdf_image(doc, 0, lambda x, r: r.y0 < 100 and r.x0 > 300)     # top-right on p1
    joker = pdf_image(doc, 0, lambda x, r: r.y0 > 380)                  # bottom row on p1
    tuck = pdf_image(doc, 0, lambda x, r: r.x0 < 100 and r.y0 < 100)    # the dieline art
    ace = pdf_image(doc, 1, lambda x, r: r.x0 < 100 and r.y0 < 100)     # p2, first card
    src = {'back': trim(back), 'AS': trim(ace), 'JK': trim(joker), 'tuck': tuck.crop(TUCK_FRONT)}
    for name, scale in (('hi', 1), ('lo', 2)):
        cw, ch, g = CELL_W // scale, CELL_H // scale, GUTTER // scale
        sheet = Image.new('RGBA', (cw * len(CELLS), ch), (255, 255, 255, 0))
        for i, k in enumerate(CELLS):
            make = flat_cell if k == 'tuck' else card_cell
            sheet.paste(make(src[k], cw, ch, g), (i * cw, 0))
        out = ROOT / 'art' / f'deck_{name}.png'
        sheet.save(out, optimize=True)
        print(out.relative_to(ROOT), sheet.size, f'{out.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
