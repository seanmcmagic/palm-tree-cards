"""Cut my own art into the game's textures, and write art/manifest.json to match.

Reads art/source/ (git-ignored, never committed). Run:  python tools/build_art.py
(needs pymupdf + pillow + numpy). Every texture is a power of two, in two tiers: _hi for desktop and tablets,
_lo (half size) for phones.

Editions (a deck = back + faces + tuck), each into art/<edition>/:
  original  USPCC print file (Palm Tree Playing Cards.pdf, 5 pages, CMYK images at ~396 dpi with 1/8 in bleed):
              p1 tuck dieline art (1570x1570), card back, Joker (x2, same image); p2-p5 spades, diamonds, clubs,
              hearts. Only MY art is taken: back, custom Ace of Spades (p2 top-left), Joker, tuck. The other faces
              are Daniel Schneider's licensed redraws and stay out until the licence covers digital use.
  winter    Winter Edition (Fiverr commission, all rights mine). Faces: winter/<Suit>/<Suit>/<Rank>.ai (PDF-compatible;
              each page is 196x266 pt with the 180x252 pt trim centred). The printed deck changed after those files:
              its navy-and-pink back and tuck, custom Ace of Spades, Joker and brick come from my album
              (winter-album/: the print sheets, a render, photos of the printed tuck, the brick dielines). The
              Fiverr Back.ai and Box Design.ai are the earlier pale-blue design and are no longer used.
  concepts  Deck ideas from my mockups in variants/ (mostly AI renders): a back and a tuck cut from one render each,
              standard faces. They sit in the brick's spare slots as "coming soon" decks with an "I'd buy this" vote.
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
from PIL import Image, ImageDraw, ImageFilter

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
    if path.suffix == '.webp':  # lossy WebP with lossless alpha: a quarter of the PNG size or less, crisp at card size
        img.save(path, quality=90, method=6, alpha_quality=100)
    else:
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
        files[tier] = save(sheet, ROOT / 'art' / edition / f'sheet_{tier}.webp')
        layouts[tier] = {'cell': [cw, ch], 'gutter': g, 'cols': cols, 'rows': rows}
    return {'files': files, 'layouts': layouts, 'cells': list(cells)}


def die_atlas(img, panels, out_dir, name, size):
    """A dieline cropped to its panels and squeezed into a power-of-two texture; panel rects as 0-1 UVs, top-down."""
    x0 = min(r[0] for r in panels.values()); y0 = min(r[1] for r in panels.values())
    x1 = max(r[2] for r in panels.values()); y1 = max(r[3] for r in panels.values())
    crop = img.crop((round(x0), round(y0), round(x1), round(y1)))
    files = {}
    for tier, scale in (('hi', 1), ('lo', 2)):
        files[tier] = save(crop.resize((size[0] // scale, size[1] // scale), Image.LANCZOS).convert('RGB'), out_dir / f'{name}_{tier}.webp')
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


def white_border(card, frac):
    """Re-seat a back's art inside a wider white border (frac of the card's width on every side). The print file's
    art sits about 2.2% in; on the printed Original (from my album) the border measures about 4.5%."""
    a = np.asarray(card.convert('RGB')).astype(int); ys, xs = np.where(a.min(axis=2) < 235)
    art = card.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = card.size; b = round(w * frac)
    out = Image.new('RGB', card.size, (252, 252, 252))
    out.paste(art.resize((w - 2 * b, h - 2 * b), Image.LANCZOS), (b, b))
    return out


# Daniel Schneider's redrawn standard faces (print file p2-p5: spades, diamonds, clubs, hearts; A to K in reading
# order). NOT public until Daniel agrees in writing: they go to art/schneider/ (git-ignored) with their own
# faces.json, and the game reads them only with ?faces=schneider. The committed manifest never names them.
SCHNEIDER_SUITS = 'SDCH'


def schneider(orig):
    doc = pymupdf.open(PRINT)
    out = ROOT / 'art' / 'schneider'
    cells = {}
    for k in ('back', 'AS', 'JK', 'tuck'):  # my own cells first, copied from the Original sheet build
        cells[k] = orig[k]
    for pg, suit in enumerate(SCHNEIDER_SUITS, 1):
        page = doc[pg]
        found = sorted((round(r.y0), round(r.x0), info[0]) for info in page.get_images(full=True) for r in page.get_image_rects(info[0]))
        for (y, x, xref), rank in zip(found, RANKS):
            if rank + suit == 'AS':
                continue  # my custom Ace of Spades, not Daniel's
            cells[rank + suit] = trim(pdf_image(doc, pg, lambda X, R, xref=xref: X == xref))
    sheet = card_sheet('schneider', cells, ((256, 512), 6, 16), lo=((256, 256), 4, 8))
    (out / 'faces.json').write_text(json.dumps({'_comment': "Daniel Schneider's faces; local only until he agrees.",
                                                 'sheet': sheet, 'faces': 'sheet'}, indent=2) + '\n', encoding='utf-8')
    print('art/schneider/faces.json')


def original():
    doc = pymupdf.open(PRINT)
    back = pdf_image(doc, 0, lambda x, r: r.y0 < 100 and r.x0 > 300)     # top-right on p1
    joker = pdf_image(doc, 0, lambda x, r: r.y0 > 380)                  # bottom row on p1
    die = pdf_image(doc, 0, lambda x, r: r.x0 < 100 and r.y0 < 100)     # the tuck dieline art
    ace = pdf_image(doc, 1, lambda x, r: r.x0 < 100 and r.y0 < 100)     # p2, first card
    panels = TUCK_PANELS['original']
    cells = {'back': white_border(trim(back), 0.045), 'AS': trim(ace), 'JK': trim(joker), 'tuck': die.crop(panels['front'])}
    schneider(cells)  # local only, never in the manifest
    return {
        'id': 'original', 'name': 'Original',
        'sheet': card_sheet('original', cells, ((512, 1024), 8, 4)),
        'back': 'sheet:back', 'joker': 'sheet:JK', 'faces': {'AS': 'sheet:AS'}, 'atlas': None,
        'tuck': {'front': 'sheet:tuck', 'die': die_atlas(die, panels, ROOT / 'art' / 'original', 'tuck', (1024, 1024))},
    }


# Winter album sources (winter-album/, numbered as downloaded). Quads are TL, TR, BR, BL in the image's pixels.
WA = {
    'back_render': ('01 ', [(700, 672), (1478, 548), (1554, 1462), (697, 1600)]),  # the card back in the mockup render
    'tuck_photo': ('04 ', [(1103, 861), (2333, 822), (2356, 2578), (1105, 2565)]),  # the printed tuck front, in hand (inset past its edges)
    'back_sheet': '10 ', 'face_sheet': '11 ',  # uncut print sheets: 8 x 7 cards, centres from (201, 229), pitch 166 x 223
    'half': ('12 ', dict(front=(700, 286, 1090, 540), back=(46, 286, 436, 540), left=(436, 286, 700, 540),
                         right=(1090, 286, 1354, 540), lid=(700, 22, 1090, 286))),
    'brick': ('13 ', dict(front=(885, 408, 1458, 666), back=(47, 408, 620, 666), left=(620, 408, 885, 666),
                          right=(1458, 408, 1727, 666), lid=(885, 143, 1458, 408))),
}


def album(prefix):
    return Image.open(next((SRC / 'winter-album').glob(prefix + '*'))).convert('RGB')


def sheet_card(img, col, row):
    """One card off an uncut print sheet (about 125 x 175 px each)."""
    cx, cy, w, h = 201 + col * 166.3, 229 + row * 223.3, 126, 176
    return img.crop((round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2)))


def match_colour(img, ref):
    """Scale img's channels so its mean matches ref's (the render is lit; the print sheet is the true colour)."""
    a = np.asarray(img, float); m = a.reshape(-1, 3).mean(0); r = np.asarray(ref, float).reshape(-1, 3).mean(0)
    return Image.fromarray(np.clip(a * (r / m), 0, 255).astype(np.uint8))


def winter():
    names = {'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king'}
    folders = {'S': 'spades', 'H': 'Hearts', 'D': 'Diamonds', 'C': 'Clubs'}
    backs, faces = album(WA['back_sheet']), album(WA['face_sheet'])
    flat_back = sheet_card(backs, 3, 3)
    f, q = WA['back_render']; back = match_colour(rectify(album(f), q, (500, 700)), flat_back)
    f, q = WA['tuck_photo']; front = rectify(album(f), q, (500, 700))
    navy = tuple(int(v) for v in np.asarray(front.crop((8, 8, 30, 680))).reshape(-1, 3).mean(0))  # the tuck's border
    cells = {'back': back, 'tuck': front}
    for s in SUITS:
        d = WINTER / folders[s] / folders[s]
        for r in RANKS:
            want = names.get(r, r)
            path = next((p for p in d.glob('*.ai') if p.stem.lower() == want), None)  # Hearts has 'king.ai'
            if path is None:
                sys.exit(f'winter: no file for {r}{s} in {d}')
            cells[r + s] = winter_card(path)
    cells['AS'] = sheet_card(faces, 2, 0)  # the printed custom Ace of Spades (the Fiverr Ace.ai is a plain one)
    cells['JK'] = sheet_card(faces, 1, 0)
    out = ROOT / 'art' / 'winter'
    boxes = {}
    for kind in ('half', 'brick'):
        f, panels = WA[kind]
        boxes[kind] = die_atlas(album(f), panels, out, kind, (2048, 1024))
    return {
        'id': 'winter', 'name': 'Winter',
        'sheet': card_sheet('winter', cells, ((256, 512), 6, 16), lo=((256, 256), 4, 8)),
        'back': 'sheet:back', 'joker': 'sheet:JK', 'faces': 'sheet', 'atlas': None,
        'tuck': {'front': 'sheet:tuck', 'die': concept_tuck(front, back, None, navy, out)},
        'boxes': boxes,
    }


# Concepts: corners of the tuck front (and of the back, where a render shows one) in the source image, clockwise
# from top-left, read off a grid at the image's own size. Where no back is shown, the back is the front's emblem
# (rect as 0-1 fractions of the rectified front) on a field colour with a frame, the way many tucks echo the back.
CONCEPTS = [
    dict(id='spring', name='Spring Edition', file='OIG2.jpeg',
         front=[(262, 172), (765, 172), (765, 875), (262, 875)], emblem=(0.19, 0.22, 0.81, 0.72),
         field=(24, 60, 58), frame=(230, 205, 170), board=(26, 62, 60)),
    dict(id='fall', name='Fall Edition', file='IMG_20231104_193101_715.jpg',
         front=[(240, 176), (742, 176), (742, 796), (240, 796)], emblem=(0.19, 0.18, 0.81, 0.7),
         field=(246, 241, 233), frame=(140, 40, 40), board=(214, 190, 160)),
    dict(id='midnight', name='Midnight Edition', file='file-Df6JtqD947uXUEE7qCKey7Xu.jpg',
         front=[(292, 198), (730, 198), (730, 815), (292, 815)], emblem=(0.2, 0.21, 0.8, 0.74),
         field=(14, 13, 12), frame=(214, 178, 118), board=(18, 17, 16)),
    dict(id='ornate', name='White Ornate', file='file-mYCeWxmaW7hZnWaeupoorzrV.jpg',
         front=[(480, 100), (932, 275), (562, 885), (67, 615)], emblem=(0.1, 0.12, 0.9, 0.84),
         field=(16, 14, 12), frame=(205, 170, 110), board=(226, 218, 204)),
    dict(id='navywinter', name='Navy Winter', file='OIG.jpeg',
         front=[(281, 190), (752, 190), (752, 822), (281, 822)], emblem=(0.15, 0.23, 0.85, 0.78),
         field=(31, 45, 74), frame=(230, 184, 181), board=(33, 47, 76)),
    dict(id='summer', name='Summer Edition', file='file-fZozkBvAJRkghUTzrX2PfunL.jpg',
         front=[(318, 250), (702, 250), (700, 775), (320, 775)], emblem=(0.15, 0.25, 0.85, 0.8),
         field=(244, 176, 178), frame=(20, 80, 80), board=(240, 170, 172)),
    dict(id='midnightwhite', name='Midnight White', file='file-EkD1gpF1tnb2CmbzMfNImXWy.jpg',
         front=[(440, 123), (855, 287), (591, 873), (156, 686)], emblem=(0.15, 0.22, 0.85, 0.75),
         field=(240, 238, 234), frame=(20, 20, 20), board=(236, 234, 230)),
    dict(id='aceofspades', name='Ace of Spades', file='file-wjrrGJSne8pxaLD6TQVu6YYL.jpg',
         front=[(269, 161), (748, 161), (748, 846), (274, 846)], emblem=(0.15, 0.25, 0.85, 0.78),
         field=(244, 240, 232), frame=(150, 100, 50), board=(240, 236, 228)),
]


def rectify(img, quad, size):
    """Perspective-warp the quad (TL, TR, BR, BL) of img onto a flat size[0] x size[1] rectangle."""
    w, h = size
    dst = [(0, 0), (w, 0), (w, h), (0, h)]
    rows, rhs = [], []
    for (x, y), (u, v) in zip(quad, dst):  # solve for the map from output (u, v) back to source (x, y)
        rows.append([u, v, 1, 0, 0, 0, -x * u, -x * v]); rhs.append(x)
        rows.append([0, 0, 0, u, v, 1, -y * u, -y * v]); rhs.append(y)
    coeffs = np.linalg.solve(np.array(rows, float), np.array(rhs, float))
    return img.transform((w, h), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC)


def emblem_back(front, c, size=(500, 700)):
    """A card back designed to match a concept tuck (the renders show no backs). Built like a printed back: a white
    border, the tuck's field colour under a fine lattice, a double frame and corner lozenges in its accent colour,
    and an oval medallion holding the tuck's emblem, feathered in. twoway: the emblem fills the medallion's top half
    and again turned 180 in the bottom half. Drawn at 2x and reduced, so lines stay crisp."""
    k = 2; W, H = size[0] * k, size[1] * k
    field, acc = c['field'], c['frame']
    mix = lambda t: tuple(round(f + (a - f) * t) for f, a in zip(field, acc))
    back = Image.new('RGB', (W, H), (252, 252, 252))
    d = ImageDraw.Draw(back)
    bw = round(W * 0.055)  # the white border
    x0, y0, x1, y1 = bw, bw, W - bw, H - bw
    d.rectangle((x0, y0, x1, y1), fill=field)
    lat = Image.new('L', (W, H), 0); dl = ImageDraw.Draw(lat); step = W / 13  # diagonal lattice, both ways
    for i in range(-30, 60):
        o = i * step
        dl.line([(o, 0), (o + H, H)], fill=255, width=2 * k); dl.line([(o + H, 0), (o, H)], fill=255, width=2 * k)
    clip = Image.new('L', (W, H), 0); ImageDraw.Draw(clip).rectangle((x0, y0, x1, y1), fill=255)
    back.paste(Image.new('RGB', (W, H), mix(0.22)), (0, 0), Image.fromarray((np.asarray(lat, float) * np.asarray(clip, float) / 255).astype(np.uint8)))
    f1 = round(W * 0.035); f2 = f1 + round(W * 0.022)  # double frame
    d.rectangle((x0 + f1, y0 + f1, x1 - f1, y1 - f1), outline=acc, width=3 * k)
    d.rectangle((x0 + f2, y0 + f2, x1 - f2, y1 - f2), outline=acc, width=1 * k)
    r = W * 0.035  # corner lozenges with a dot, the same at all four corners (a two-way back)
    for cx, cy in ((x0 + f2 + r * 1.9, y0 + f2 + r * 1.9), (x1 - f2 - r * 1.9, y0 + f2 + r * 1.9),
                   (x0 + f2 + r * 1.9, y1 - f2 - r * 1.9), (x1 - f2 - r * 1.9, y1 - f2 - r * 1.9)):
        d.polygon([(cx, cy - r), (cx + r * 0.7, cy), (cx, cy + r), (cx - r * 0.7, cy)], fill=acc)
        d.ellipse((cx - r * 0.22, cy - r * 0.22, cx + r * 0.22, cy + r * 0.22), fill=field)
    mw, mh = W * 0.66, H * 0.56  # the medallion
    mx0, my0 = (W - mw) / 2, (H - mh) / 2
    d.ellipse((mx0 - 7 * k, my0 - 7 * k, mx0 + mw + 7 * k, my0 + mh + 7 * k), fill=acc)
    d.ellipse((mx0 - 3 * k, my0 - 3 * k, mx0 + mw + 3 * k, my0 + mh + 3 * k), fill=field)
    d.ellipse((mx0, my0, mx0 + mw, my0 + mh), fill=field, outline=acc, width=k)
    fw, fh = front.size; ex0, ey0, ex1, ey1 = c['emblem']
    em = front.crop((round(ex0 * fw), round(ey0 * fh), round(ex1 * fw), round(ey1 * fh)))
    def feathered(img, box):
        sc = min(box[0] / img.width, box[1] / img.height)  # fit the box, enlarging as well as shrinking
        img = img.resize((round(img.width * sc), round(img.height * sc)), Image.LANCZOS)
        m = Image.new('L', img.size, 0)
        ImageDraw.Draw(m).ellipse((img.width * 0.05, img.height * 0.05, img.width * 0.95, img.height * 0.95), fill=255)
        return img, m.filter(ImageFilter.GaussianBlur(min(img.size) * 0.07))
    if c.get('twoway'):
        e, m = feathered(em, (round(mw * 0.86), round(mh * 0.46)))
        back.paste(e, (round((W - e.width) / 2), round(H / 2 - e.height - k * 4)), m)
        back.paste(e.rotate(180), (round((W - e.width) / 2), round(H / 2 + k * 4)), m.rotate(180))
    else:
        e, m = feathered(em, (round(mw * 0.86), round(mh * 0.9)))
        back.paste(e, (round((W - e.width) / 2), round((H - e.height) / 2)), m)
    return back.resize(size, Image.LANCZOS)


def concept_tuck(front, back, side, board, out_dir):
    """A tuck dieline put together from the rectified faces; the narrow panels are the side art or plain board."""
    W = 1024
    layout = dict(front=(0, 0, 400, 560), back=(400, 0, 800, 560), left=(800, 0, 880, 560), right=(880, 0, 960, 560),
                  top=(0, 560, 400, 672), tongue=(400, 560, 800, 672), bottom=(0, 672, 400, 784))
    die = Image.new('RGB', (W, W), board)
    for k, img in (('front', front), ('back', back)):
        x0, y0, x1, y1 = layout[k]; die.paste(img.resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0))
    if side is not None:
        for k in ('left', 'right'):
            x0, y0, x1, y1 = layout[k]; die.paste(side.resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0))
    files = {}
    for tier, scale in (('hi', 1), ('lo', 2)):
        files[tier] = save(die.resize((W // scale, W // scale), Image.LANCZOS), out_dir / f'tuck_{tier}.webp')
    return {'files': files, 'panels': {k: [r[0] / W, r[1] / W, r[2] / W, r[3] / W] for k, r in layout.items()}}


def open_photo(path):
    """Open an image; a few phone photos are HEIC saved as .jpg, which Pillow can't read: decode those with ffmpeg."""
    try:
        return Image.open(path).convert('RGB')
    except Exception:
        import subprocess, tempfile
        out = Path(tempfile.gettempdir()) / (path.stem + '_heic.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-frames:v', '1', str(out)], check=True)
        return Image.open(out).convert('RGB')


# The concept renders are AI images with garbled lettering. Fixes, in pixels of the 750 x 1050 rectified front:
#   ('erase', box)                          remove every letter shape that lies wholly inside box, fill from around it
#   ('wipe', box)                           fill the whole box (for a letter fused to artwork outside the box)
#   ('respace', box, keep)                  keep only the ink in these x ranges (touching letters can be split this
#                                           way), drop the rest, close the gaps and recentre the word
#   ('swap', box, xr, src_box, src_xr)      replace the letter at x range xr with the one at src_xr in src_box, scaled
# Only shapes wholly inside a box are touched, so artwork that crosses the box edge survives.
TEXT_FIXES = {
    'midnightwhite': [('erase', (148, 186, 562, 234)), ('wipe', (160, 207, 205, 236)),                     # "PLAYING CADES"
                      ('erase', (178, 238, 298, 278)), ('erase', (462, 238, 582, 278))],  # "24 -", "315 ="
    'navywinter': [('respace', (395, 125, 610, 232), [(397, 435), (469, 513), (521, 549), (564, 596)]),  # TRREE -> TREE
                   ('swap', (270, 925, 480, 957), (353, 369), (185, 872, 580, 920), (485, 507))],  # WINTEB -> WINTER
    'aceofspades': [('erase', (105, 235, 315, 365)), ('erase', (440, 235, 645, 365)),  # "ALNE CARD", "CARD TADD"
                    ('erase', (150, 815, 575, 876)), ('erase', (305, 922, 450, 955)),  # nonsense lines, "THE BADS"
                    ('erase', (140, 728, 255, 756)), ('erase', (495, 728, 610, 756)),
                    ('erase', (588, 778, 678, 958))],  # the stray heart and "V" in the corner
    'spring': [('erase', (115, 55, 245, 90)), ('erase', (505, 55, 640, 90)),  # "AC LACE", "ATCC OOTI"
               ('erase', (140, 740, 290, 820)), ('erase', (460, 740, 610, 820))],  # "SPPRING", "EDITION"
    'midnight': [('erase', (188, 740, 225, 766)), ('erase', (530, 740, 566, 766))],  # "Z3", "7?R"
}


def _letters(a, box, thr=70):
    """Letter shapes wholly inside box: (x0, x1, mask) per letter, left to right. Ink is anything far from the
    box's border colour; shapes touching the box edge belong to the artwork and are left alone."""
    import scipy.ndimage as ndi
    x0, y0, x1, y1 = box
    region = a[y0:y1, x0:x1].astype(float)
    border = np.concatenate([region[0], region[-1], region[:, 0], region[:, -1]])
    ink = np.linalg.norm(region - np.median(border, axis=0), axis=2) > thr
    lab, n = ndi.label(ink)
    shapes = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == ink.shape[0] or sl[1].stop == ink.shape[1]:
            continue
        m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = lab == i
        shapes.append((sl[1].start + x0, sl[1].stop + x0, m))
    shapes.sort(key=lambda t: t[0])
    letters = []  # shapes overlapping in x are one letter (dots, accents, broken strokes)
    for sx0, sx1, m in shapes:
        if letters and sx0 <= letters[-1][1]:
            px0, px1, pm = letters[-1]; letters[-1] = (px0, max(px1, sx1), pm | m)
        else:
            letters.append((sx0, sx1, m))
    return letters


def _erase(a, mask, grow=5):
    """Fill the mask (grown a little) with the colour and grain of the ring just around it, feathered at the edge.
    Inpainting smeared nearby shading into soft grey blobs on the plain paper tucks; this keeps the paper flat."""
    import cv2
    m = cv2.dilate(mask.astype(np.uint8), np.ones((grow, grow), np.uint8)) > 0
    ring = cv2.dilate(m.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool) & ~m
    if not ring.any():
        return a
    px = a[ring].astype(float); med, std = np.median(px, axis=0), px.std(axis=0).clip(0, 12)
    rng = np.random.default_rng(0)
    fill = (med + rng.normal(0, 1, a.shape[:2] + (1,)) * std).clip(0, 255)
    alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)[..., None]
    return (a * (1 - alpha) + fill * alpha).astype(np.uint8)


def _paste(a, src, mask, dx, dy):
    ys, xs = np.nonzero(mask)
    a[ys + dy, xs + dx] = src[ys, xs]


def fix_text(img, fixes):
    a = np.asarray(img.convert('RGB')).copy()
    for f in fixes:
        if f[0] == 'erase':
            for _, _, m in _letters(a, f[1], thr=50):  # lower threshold: catch the letters' soft edges too
                a = _erase(a, m, grow=9)
        elif f[0] == 'wipe':
            x0, y0, x1, y1 = f[1]; m = np.zeros(a.shape[:2], bool); m[y0:y1, x0:x1] = True
            a = _erase(a, m, grow=1)
        elif f[0] == 'respace':
            letters = _letters(a, f[1]); src = a.copy()
            ink = np.zeros(a.shape[:2], bool)
            for _, _, m in letters: ink |= m
            cols = np.arange(a.shape[1])
            keep = [(x0, x1, ink & (cols >= x0)[None, :] & (cols < x1)[None, :]) for x0, x1 in f[2]]
            gap = int(np.median([keep[i + 1][0] - keep[i][1] for i in range(len(keep) - 1)])) if len(keep) > 1 else 0
            gap = min(gap, 14)
            width = sum(x1 - x0 for x0, x1, _ in keep) + gap * (len(keep) - 1)
            x = (letters[0][0] + letters[-1][1]) // 2 - width // 2  # recentre on the old word
            a = _erase(a, ink)
            for x0, x1, m in keep:
                _paste(a, src, m, x - x0, 0); x += (x1 - x0) + gap
        elif f[0] == 'swap':
            _, box, xr, sbox, sxr = f
            pick = lambda letters, r: [l for l in letters if l[0] < r[1] and l[1] > r[0]]
            tl, sl = pick(_letters(a, box), xr), pick(_letters(a, sbox), sxr)
            tm = np.any([l[2] for l in tl], axis=0); sm = np.any([l[2] for l in sl], axis=0)
            tx0 = min(l[0] for l in tl); sx0, sx1 = min(l[0] for l in sl), max(l[1] for l in sl)
            ty, sy = np.nonzero(tm)[0], np.nonzero(sm)[0]
            th, sh = ty.max() - ty.min() + 1, sy.max() - sy.min() + 1
            glyph = Image.fromarray(a[sy.min():sy.max() + 1, sx0:sx1])
            gm = Image.fromarray((sm[sy.min():sy.max() + 1, sx0:sx1] * 255).astype(np.uint8))
            size = (max(1, round((sx1 - sx0) * th / sh)), th)
            glyph = np.asarray(glyph.resize(size, Image.LANCZOS)); gm = np.asarray(gm.resize(size, Image.LANCZOS)) > 110
            tint = a[tm].reshape(-1, 3).mean(0) / glyph[gm].reshape(-1, 3).mean(0).clip(1)  # take on the old letter's colour
            glyph = (glyph * tint).clip(0, 255).astype(np.uint8)
            a = _erase(a, tm)
            ys, xs = np.nonzero(gm); a[ys + ty.min(), xs + tx0] = glyph[ys, xs]
    return Image.fromarray(a)


def concepts():
    out = []
    for c in CONCEPTS:
        img = open_photo(SRC / 'variants' / c['file'])
        front = fix_text(rectify(img, c['front'], (750, 1050)), TEXT_FIXES.get(c['id'], []))
        back = rectify(img, c['back'], (500, 700)) if 'back' in c else emblem_back(front, c)
        side = rectify(img, c['side'], (80, 700)) if 'side' in c else None
        d = ROOT / 'art' / 'concepts' / c['id']
        out.append({
            'id': c['id'], 'name': c['name'], 'concept': True, 'source': c['file'],
            'sheet': card_sheet(f"concepts/{c['id']}", {'back': back, 'tuck': front}, ((512, 1024), 8, 2)),
            'back': 'sheet:back', 'joker': None, 'faces': {}, 'atlas': None,
            'tuck': {'front': 'sheet:tuck', 'die': concept_tuck(front, back, side, c['board'], d)},
        })
    return out


# Uncut print sheets, framed on the casino wall behind the title table. Only art I own outright: the Original's
# faces sheet (album #21) is Daniel Schneider's faces and stays off the wall until the licence covers digital use.
POSTERS = [('original_backs', '20 ', 'Original backs'), ('winter_backs', '10 ', 'Winter backs'), ('winter_faces', '11 ', 'Winter faces')]


def posters():
    out = []
    for key, prefix, name in POSTERS:
        img = album(prefix)
        files = {}
        for tier, size in (('hi', 1024), ('lo', 512)):
            files[tier] = save(img.resize((size, size), Image.LANCZOS), ROOT / 'art' / 'room' / f'{key}_{tier}.webp')
        out.append({'id': key, 'name': name, 'files': files, 'aspect': round(img.width / img.height, 4)})
    return out


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
        'version': __import__('time').strftime('%Y%m%d%H%M%S'),  # appended to art URLs so browsers fetch a rebuild
        'editions': [original(), winter(), *concepts()],
        'boxes': boxes(),
        'room': {'posters': posters()},
    }
    (ROOT / 'art' / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print('art/manifest.json')


if __name__ == '__main__':
    main()
