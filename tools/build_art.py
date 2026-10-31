"""Cut my own art into the game's textures, and write art/manifest.json to match.

Reads art/source/ (git-ignored, never committed). Run:  python tools/build_art.py
(needs pymupdf + pillow + numpy). Every texture is a power of two, in two tiers: _hi for desktop and tablets,
_lo (half size) for phones.

Editions (a deck = back + faces + tuck), each into art/<edition>/:
  original  USPCC print file (Palm Tree Playing Cards.pdf, 5 pages, CMYK images at ~396 dpi with 1/8 in bleed):
              p1 tuck dieline art (1570x1570), card back, Joker (x2, same image); p2-p5 spades, diamonds, clubs,
              hearts. Only MY art is taken: back, custom Ace of Spades (p2 top-left), Joker, tuck. The other faces
              are Daniel Schneider's licensed redraws and stay out until the licence covers digital use.
  winter    Winter Edition (Fiverr commission, all rights mine): winter/<Suit>/<Suit>/<Rank>.ai, Back, Box.
              The .ai files are PDF-compatible; each card page is 196x266 pt with the 180x252 pt trim centred.
Boxes (the title menu), into art/box/: the half brick (6 decks) and brick (12 decks) dielines.

Card sheets: a grid of equal cells, each card stretched to fill its cell (the mesh UVs undo it), with a gutter
the UVs skip so mip levels don't bleed between cells; transparent pixels carry white RGB so alpha-tested edges
don't darken. Dielines (tucks and bricks) are their own atlases: each face of the 3D box samples its panel
rect, so neighbouring panels are neighbouring art and need no gutter.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'source'
PRINT = SRC / 'Palm Tree Playing Cards.pdf'
WINTER = SRC / 'winter'
CORNER = 18 / 300  # corner radius as a fraction of card width, same as the canvas cards (CR / CW in src/art.js)
HAIRLINE = (0xc9, 0xdf, 0xe1, 255)  # C.hairline, the canvas cards' edge stroke
TRIM_IN = (2.5, 3.5)
SUITS, RANKS = 'SHDC', ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

# Tuck dieline panels in the source's units (original: pixels of the 1570 px art layer, mapped from the die lines
# in 'Palm Tree Playing Cards Tuck Box.png' through the back panel's white frame; winter: points, read from the
# die path in Box Design.ai). The lid and its tongue hang off the front panel's top edge, the bottom off the back
# panel's bottom edge, and the thumb notch is on the back.
TUCK_PANELS = {
    'original': dict(front=(278, 429, 767, 1126), left=(151, 429, 278, 1126), right=(767, 429, 893, 1126),
                     back=(893, 429, 1382, 1126), top=(278, 303, 767, 429), tongue=(278, 157, 767, 303),
                     bottom=(893, 1126, 1382, 1253)),
    'winter': dict(front=(139, 279.2, 322, 556.7), left=(87, 279.2, 139, 556.7), right=(322, 279.2, 374, 556.7),
                   back=(374, 279.2, 557, 556.7), top=(139, 230.4, 322, 279.2), tongue=(139, 168.6, 322, 230.4),
                   bottom=(374, 556.7, 557, 608.7)),
}
# Brick dielines (pixels of the uspcc_files jpgs): the logo wall, back wall, two ends and the lid.
BOX_PANELS = {
    'half': ('Half Brick Box (1).jpg', dict(front=(2708, 1400, 4140, 2312), back=(268, 1400, 1700, 2312),
             left=(1700, 1400, 2708, 2312), right=(4140, 1400, 5140, 2312), lid=(2708, 280, 4140, 1400))),
    'brick': ('Full Brick Box.jpg', dict(front=(2720, 1520, 4432, 2400), back=(208, 1520, 1920, 2400),
              left=(1920, 1520, 2720, 2400), right=(4432, 1520, 5240, 2400), lid=(2720, 260, 4432, 1520))),
}


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


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print(path.relative_to(ROOT).as_posix(), img.size, f'{path.stat().st_size / 1024:.0f} KB')
    return path.relative_to(ROOT / 'art').as_posix()


def ai_page(path, dpi, clip=None):
    """First page of a PDF-compatible .ai file, rasterised to RGB."""
    try:
        page = pymupdf.open(path)[0]
    except Exception as e:  # not PDF-compatible: say which, rather than skip it
        sys.exit(f'cannot open {path} as PDF ({e}); re-save it from Illustrator with "Create PDF Compatible File"')
    pix = page.get_pixmap(dpi=dpi, clip=clip, alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)


def winter_card(path, dpi=220):
    """Winter card: the page is the card plus bleed; clip to the 180 x 252 pt trim in the middle."""
    page = pymupdf.open(path)[0].rect
    tw, th = TRIM_IN[0] * 72, TRIM_IN[1] * 72
    x, y = (page.width - tw) / 2, (page.height - th) / 2
    return ai_page(path, dpi, pymupdf.Rect(x, y, x + tw, y + th))


def card_sheet(edition, cells, hi, lo=None):
    """Cells (name -> image, in order) into a grid sheet per tier. hi / lo are (cell size, gutter, columns) in that
    tier's pixels; lo defaults to hi at half size. A tier may use its own grid: the Winter phone sheet uses square
    cells so each card keeps 256 px across instead of 128. Returns the manifest's sheet entry."""
    lo = lo or ((hi[0][0] // 2, hi[0][1] // 2), hi[1] // 2, hi[2])
    files, layouts = {}, {}
    for tier, ((cw, ch), g, cols) in (('hi', hi), ('lo', lo)):
        rows = -(-len(cells) // cols)
        rows = (1 << (ch * rows - 1).bit_length()) // ch  # pad with empty rows to a power-of-two height
        sheet = Image.new('RGBA', (cw * cols, ch * rows), (255, 255, 255, 0))
        for i, (k, img) in enumerate(cells.items()):
            make = flat_cell if k == 'tuck' else card_cell
            sheet.paste(make(img, cw, ch, g), ((i % cols) * cw, (i // cols) * ch))
        files[tier] = save(sheet, ROOT / 'art' / edition / f'sheet_{tier}.png')
        layouts[tier] = {'cell': [cw, ch], 'gutter': g, 'cols': cols, 'rows': rows}
    return {'files': files, 'layouts': layouts, 'cells': list(cells)}


def die_atlas(img, panels, out_dir, name, size):
    """A dieline cropped to its panels and squeezed into a power-of-two texture; panel rects as 0-1 UVs, top-down."""
    x0 = min(r[0] for r in panels.values()); y0 = min(r[1] for r in panels.values())
    x1 = max(r[2] for r in panels.values()); y1 = max(r[3] for r in panels.values())
    crop = img.crop((round(x0), round(y0), round(x1), round(y1)))
    files = {}
    for tier, scale in (('hi', 1), ('lo', 2)):
        files[tier] = save(crop.resize((size[0] // scale, size[1] // scale), Image.LANCZOS).convert('RGB'), out_dir / f'{name}_{tier}.png')
    w, h = x1 - x0, y1 - y0
    uv = {k: [round((r[0] - x0) / w, 5), round((r[1] - y0) / h, 5), round((r[2] - x0) / w, 5), round((r[3] - y0) / h, 5)] for k, r in panels.items()}
    return {'files': files, 'panels': uv}


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


def original():
    doc = pymupdf.open(PRINT)
    back = pdf_image(doc, 0, lambda x, r: r.y0 < 100 and r.x0 > 300)     # top-right on p1
    joker = pdf_image(doc, 0, lambda x, r: r.y0 > 380)                  # bottom row on p1
    die = pdf_image(doc, 0, lambda x, r: r.x0 < 100 and r.y0 < 100)     # the tuck dieline art
    ace = pdf_image(doc, 1, lambda x, r: r.x0 < 100 and r.y0 < 100)     # p2, first card
    panels = TUCK_PANELS['original']
    cells = {'back': trim(back), 'AS': trim(ace), 'JK': trim(joker), 'tuck': die.crop(panels['front'])}
    return {
        'id': 'original', 'name': 'Original',
        'sheet': card_sheet('original', cells, ((512, 1024), 8, 4)),
        'back': 'sheet:back', 'joker': 'sheet:JK', 'faces': {'AS': 'sheet:AS'}, 'atlas': None,
        'tuck': {'front': 'sheet:tuck', 'die': die_atlas(die, panels, ROOT / 'art' / 'original', 'tuck', (1024, 1024))},
    }


def winter():
    names = {'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king'}
    folders = {'S': 'spades', 'H': 'Hearts', 'D': 'Diamonds', 'C': 'Clubs'}
    pt = 4  # render the box at 4 px per point; the panel rects are in points
    die = ai_page(WINTER / 'Box' / 'Box' / 'Box Design.ai', 72 * pt)
    panels = {k: tuple(v * pt for v in r) for k, r in TUCK_PANELS['winter'].items()}
    cells = {'back': winter_card(WINTER / 'Back' / 'Back' / 'Back.ai'), 'tuck': die.crop(tuple(round(v) for v in panels['front']))}
    for s in SUITS:
        d = WINTER / folders[s] / folders[s]
        for r in RANKS:
            want = names.get(r, r)
            path = next((p for p in d.glob('*.ai') if p.stem.lower() == want), None)  # Hearts has 'king.ai'
            if path is None:
                sys.exit(f'winter: no file for {r}{s} in {d}')
            cells[r + s] = winter_card(path)
    return {
        'id': 'winter', 'name': 'Winter',
        'sheet': card_sheet('winter', cells, ((256, 512), 6, 16), lo=((256, 256), 4, 8)),
        'back': 'sheet:back', 'joker': None, 'faces': 'sheet', 'atlas': None,
        'tuck': {'front': 'sheet:tuck', 'die': die_atlas(die, panels, ROOT / 'art' / 'winter', 'tuck', (1024, 1024))},
    }


def boxes():
    out = {}
    for kind, (file, panels) in BOX_PANELS.items():
        img = Image.open(SRC / 'uspcc_files' / file).convert('RGB')
        out[kind] = die_atlas(img, panels, ROOT / 'art' / 'box', kind, (2048, 1024))
    return out


def main():
    for need in (PRINT, WINTER):
        if not need.exists():
            sys.exit(f'missing {need} (art/source is git-ignored; copy the sources in first)')
    manifest = {
        '_comment': 'Written by tools/build_art.py; see README "Where real art goes".',
        'editions': [original(), winter()],
        'boxes': boxes(),
    }
    (ROOT / 'art' / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('art/manifest.json')


if __name__ == '__main__':
    main()
