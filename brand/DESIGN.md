# Palm Tree Playing Cards — DESIGN.md

**Version 2.0 · "launch edition" · 2026-11-13.** The single source of truth for the brand system.
Every later file in this project — brand book, social kit, motion, GitHub, landing page, the game — is
built from this document. If a file and this doc disagree, this doc wins until this doc is revised.

## 0. Provenance and ground rules

- **Facts** come only from `BRIEF.md` ("Facts you may use publicly") and `SOURCE_PACK.md`. Anything not
  in those sources is either a **rule set by this doc** (a design decision — allowed) or is marked
  **[unverified]**. Nothing else may be asserted publicly.
- **Colour hexes** are the measured table in `BRIEF.md` (sampled 2026-11-13, k-means on the RGB print
  files in `assets/`). The measured table beats every older eyeballed hex, including the Kickstarter
  extraction's (~#15294B, ~#2FB4B0, ~#F09AA0, ~#F5C22E) and the older vault note (#16305A, #2E9E9E,
  #F09199, #F0C05A). Tints and shades in §2 are computed mixes of measured hexes, with the recipe shown.
- **Contrast ratios** in §2 were computed with the WCAG 2.1 relative-luminance formula on the exact hexes
  in this doc, 2026-11-13. They are arithmetic, not eyeballs.
- **Geometry of the logo assets** (pixel dimensions, colour composition) was read directly from the PNG
  files on 2026-11-13; sizes stated as px are those files' true pixel sizes.
- **Never put anywhere:** where stock is stored, any address, any cost/price breakdown other than $14,
  fake metrics, fake press quotes, fake partner logos, a real exchange name or price chart pretending to
  be real (an IPO look is a styling device: a ticker-style mark must read playful, e.g. "PALM · est. 2020"),
  other companies' logos or trademarks (Theory11 and Art of Play are references only), generated photos of
  real people.
- The **Winter Edition** exists as a concept/commission. It is never announced as for sale.
- Assets in `assets/` are real USPCC print art. **Use them; never redraw them.** Art rights reserved;
  game code MIT (repo: `github.com/seanmcmagic/palm-tree-cards`).

---

## 1. The brand in one paragraph, and three pillars

**Palm Tree Playing Cards.** Est. 2020. A deck about rest and relaxation — palms against a low sun,
water going flat — printed by the United States Playing Card Company at poker size, and made by one
person: Sean McMagic, an LA magician and cardist. It funded on Kickstarter in 2020 (196 backers,
$8,721 against an $8,500 goal), and the first edition still exists: about 1,600 decks, $14 a deck,
bricks of twelve in a night-beach box. The custom pieces are the card back, the Ace of Spades, the
Joker, the tuck case and the brick; the number cards and courts are traditional on purpose, because
this is a deck made to be played. There is a free browser game — Klondike and Blackjack with the real
deck — and the voice throughout is the maker's own: first person, warm, unhurried, no hype.

- **Pillar 1 — Rest and relaxation.** The deck was made to signify rest (the maker's own words from the
  2020 campaign). Every surface should feel like the end of a warm day: low sun, flat water, palm shade.
  If a design feels urgent, loud, or busy, it is off-brand.
- **Pillar 2 — A deck made to be played.** Traditional pips and courts, poker size, USPCC stock. The
  custom art lives on the back, the Ace, the Joker, the tuck and the brick. The brand never pretends to
  be a collectible display piece first; it is played, shuffled, cardistried and dealt.
- **Pillar 3 — A maker's object.** One person designs, prints and signs this work — the origin story
  comes before the product, collaborators are credited by name, and the numbers stated are real
  (2020, 196 backers, $8,721, ~1,600 decks, $14). Small and honest beats big and polished.

---

## 2. Colour

### 2.1 Core tokens (measured 2026-11-13 from `assets/`)

| Token | Hex | Role | Where it comes from in the print art |
|---|---|---|---|
| `midnight` | `#012E4F` | Dominant field, brand ground, dark UI base | Card back dominant field. (The game's token `#002A4F` differs by one unit in the blue channel — the same colour; v2 adopts `#012E4F`. The game should update its token to match.) |
| `tuck-ink` | `#1F273B` | Tuck-case ground; panels and modals | Tuck front background, corner-pixel measured `#1F273B` exactly. A darker, warmer navy than the back field. |
| `lagoon (print)` | `#6AA2AA` | Teal in **print** contexts: card back, tuck "playing cards" script (measured `#689898`) | Card-back rays; tuck title band histogram `#689898`. Dusty, muted teal. |
| `lagoon (screen)` | `#39979F` | Teal in **screen** contexts: app/game background | The game's background teal; brighter because screens emit light and print absorbs it. Use only on screen; never as the teal on tuck/brick print artwork. |
| `sun-gold` | `#E4BF6C` | Sun disc, contained palm, CTAs, "2020" | Sun disc and palm fronds on the back; tuck palm measured `#DFBB6A`; tuck "2020" numerals (measured `#D8B868`/`#E8B868` band). |
| `sand` | `#F2C167` | Brick-box dune; price badge; warm light fields | Brick-box dune (print). Brick-only hue; do not introduce it into card/tuck surfaces. |
| `flamingo` | `#CF848E` | The sun's lower half, accent rays, chips, "bust" state | Tuck sun (measured `#D88898`); Ace sun `#D78A97`; back ray accents `#C98CA1`. |
| `card-white` | `#FCFCFA` | Card stock; light fields; text on dark | Card stock; measured card-face background `#FEFEFE`/`#FCFCFA`. |
| `court-red` | `#CC2229` | Hearts and diamonds only — **never a brand colour** | Printed court/face red. May appear incidentally in card photography; must never be a UI, logo, or marketing colour. |
| `ink-black` | `#181818` | Joker silhouette; script wordmark on light grounds | The Joker's palm and script "Joker" (measured warm near-black `#281808`–`#181808` range; the warm cast is a scan/CMYK artefact — specify neutral `#181818`, treated as black). |

**Print vs screen rule.** Where a colour differs between print and screen it exists twice, and the
context chooses: `lagoon-print` on physical/deck artwork, `lagoon-screen` in the app, game, web and
social-on-screen. A social post rendered for phone viewing uses screen variants; a print sheet or
deck-artwork mock uses print variants. No other token has a print/screen split, though `midnight`
panels in the game currently carry the one-unit-off `#002A4F` and should be reconciled (see note above).

### 2.2 Tints and shades (computed mixes — recipe given, hex is exact)

All values below are linear RGB mixes of the core hexes, computed 2026-11-13; contrast column is the
ratio against `midnight` (the usual ground).

| Token | Mix recipe | Hex | On `midnight` |
|---|---|---|---|
| `midnight-deep` | midnight → black, 40% | `#011C2F` | 1.25 (never text; shadows/depth only) |
| `midnight-lift` | midnight → card-white, 6% | `#103A59` | 1.18 (hover state on midnight surfaces) |
| `hairline-dark` | midnight → card-white, 12% | `#1F4764` | 1.42 (borders on midnight; replaces the game's eyeballed `#1D4166`) |
| `ink-muted` | midnight → card-white, 76% | `#C0CBD1` | 8.44 (secondary text on dark; replaces game's `#B7C8D6`) |
| `tuck-ink-soft` | tuck-ink → card-white, 10% | `#353C4E` | 1.27 (hover on tuck-ink surfaces) |
| `card-white-95` | card-white → midnight, 5% | `#EFF2F1` | 12.39 with `midnight` text (layered light surfaces) |
| `lagoon-deep` | lagoon-screen → midnight, 35% | `#257283` | 2.53 (gradients, pressed chips) |
| `lagoon-light` | lagoon-screen → card-white, 25% | `#6AB0B6` | 5.65 (AA text on midnight; soft fills) |
| `sun-gold-light` | sun-gold → card-white, 30% | `#EBD197` | 9.37 (tints, light accent fields) |
| `sun-gold-deep` | sun-gold → midnight, 35% | `#958C62` | 4.12 (pressed gold, aged gold fills) |
| `flamingo-light` | flamingo → card-white, 30% | `#DDA8AE` | 6.84 (soft pink fields) |
| `flamingo-deep` | flamingo → midnight, 30% | `#916A7B` | 3.02 (deep accents; large text only on midnight) |
| `sand-light` | sand → card-white, 30% | `#F5D393` | 9.72 (light fields) |
| `sand-deep` | sand → midnight, 30% | `#AA9560` | 4.77 (pressed brick fills, print shadow tint) |

### 2.3 Usage ratio — 60 / 25 / 10 / 5

- **60% midnight family** (`midnight`, `midnight-deep`, `tuck-ink` where a tuck is the subject): the
  night ground the deck lives on. The back, the tuck, the game, the landing hero.
- **25% card-white**: the cards themselves, panels, text on dark, light grounds for full-colour logos.
- **10% lagoon family**: teal accents and fields — `lagoon-screen` on screens, `lagoon-print` on print,
  `lagoon-deep`/`lagoon-light` as its gradients and tints.
- **5% sun family** (`sun-gold`, `flamingo`, plus `sand` in brick/print contexts): the sun itself and
  the single loud accent — CTAs, chips, price badges. One decisive flourish, not three.
- `court-red` is 0% of brand usage (it exists only inside card faces).

### 2.4 Approved pairings (WCAG 2.1, computed 2026-11-13)

| Foreground | Background | Ratio | Verdict / use |
|---|---|---|---|
| `card-white` | `midnight` | **13.58** | AAA body — default dark UI text |
| `card-white` | `tuck-ink` | **14.48** | AAA body — panels, modals; the tuck's white script |
| `sun-gold` | `midnight` | **7.95** | AAA body — wordmark on midnight, banners, numerals |
| `sun-gold` | `tuck-ink` | **8.48** | AAA body — the tuck's gold "2020" |
| `flamingo` | `midnight` | **4.88** | AA body / AAA large — script accents, bust states |
| `ink-muted` | `midnight` | **8.44** | AAA — secondary/caption text on dark |
| `ink-muted` | `tuck-ink` | **9.00** | AAA — secondary text on panels |
| `lagoon-screen` | `tuck-ink` | **4.32** | AA body — teal script on panels (tuck pattern) |
| `lagoon-print` | `tuck-ink` | **5.21** | AA body — print teal script on panels; the tuck's own measured ink `#689898` holds **4.63** |
| `flamingo` | `tuck-ink` | **5.20** | AA body — sun accents on tuck-ink |
| `midnight` | `card-white` | **13.58** | AAA body — default light UI text |
| `midnight` | `sun-gold` | **7.95** | AAA body — primary button label, gold fields |
| `midnight` | `sand` | **8.37** | AAA body — price badge, brick copy |
| `midnight` | `flamingo` | **4.88** | AA body — flamingo chips (the game's `c5` pattern) |
| `midnight` | `lagoon-print` | **4.89** | AA body — print teal bands |
| `midnight` | `lagoon-screen` | **4.05** | AA large only (≥24 px bold or ≥ 28 px) — teal screen fields |
| `lagoon-screen` | `midnight` | **4.05** | AA large only — never teal body text on midnight |
| `ink-black` | `card-white` | **17.29** | AAA — Joker ink, print text |
| `court-red` | `card-white` | **5.34** | card faces only, never brand UI |
| `card-white` | `lagoon-screen` | **3.35** | AA large only — big numerals on teal; never teal body |
| `hairline-dark` | `card-white` | **9.54** | AA body / any stroke — links and strokes on light UI |
| `lagoon-screen` | `card-white` | **3.35** | AA large only — teal accent numerals on paper |
| `midnight` | `card-white-95` | **12.39** | AAA body — layered light surfaces |
| `lagoon-deep` | `card-white` | **5.36** | AA body — teal as ink for accents on paper |

### 2.5 Forbidden pairings (computed)

| Pair | Ratio | Why forbidden |
|---|---|---|
| `card-white` on `flamingo` | 2.78 | under 3:1 even for large text |
| `card-white` on `lagoon-print` | 2.78 | under 3:1 |
| `card-white` on `sand` | 1.62 | white on sand is invisible |
| `card-white` on `sun-gold` | 1.71 | same failure |
| `sun-gold` on `lagoon-screen` | 1.96 | gold loses the teal field |
| `sun-gold` on `lagoon-print` | 1.63 | same |
| `sun-gold` on `flamingo` | 1.63 | two sun colours never carry each other's text |
| `flamingo` on `lagoon-screen` | 1.20 | worst pair in the palette |
| `midnight` on `tuck-ink` | 1.07 | navy on navy — a hidden seam, not a design |
| `sun-gold` on `card-white` | 1.71 | gold lettering needs a dark field (the tuck puts it on tuck-ink) |
| `flamingo` on `card-white` | 2.78 | under 3:1 — pink is an accent on dark, never body on paper |
| `ink-muted` on `card-white` | 1.61 | the secondary-text token is a dark-ground token only |
| any text on a full-colour logo placed directly on busy art | — | put the logo on its approved field (§4.5) |

Rules that fall out of the maths: dark text (`midnight`) on light tokens, light text
(`card-white`, `ink-muted`, `sun-gold`) on dark tokens. Light-on-light and navy-on-navy never pass.
Hover/focus states move backgrounds (see §7.6), never text toward the field.

---

## 3. Typography

All four jobs are filled by Google Fonts, free and web-loadable, the same faces the game already
ships — the brand and the game read as one object.

| Job | Face | Weights used | Fallback stack |
|---|---|---|---|
| Script wordmark | **Pacifico** | 400 | `"Pacifico", "Brush Script MT", cursive` |
| Display / headlines / big numerals | **Lilita One** | 400 | `"Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif` |
| Body / UI | **Nunito Sans** | 400, 700, 800, 900 | `"Nunito Sans", system-ui, sans-serif` |
| Numerals | **Lilita One** (display numerals), **Nunito Sans 700** (inline UI numerals) | — | as above |

Load (Google Fonts CSS API, same query the game uses):
`https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito+Sans:wght@400;700;800;900&family=Pacifico&display=swap`

### 3.1 Why each face, against the real art

- **Pacifico** for the script wordmark: the tuck and the Ace lockup lettering are monoline, connected,
  bouncing retro-surf scripts (measured tuck: white "Palm Tree" strokes 14.48:1 on tuck-ink, teal
  "playing cards" ≈ `#689898` at 4.63:1). Pacifico matches that era and posture — round monoline
  terminals, ligature joins, a low bouncing baseline — better than any other free Google script, and it
  is already the game's wordmark face (64 px hero, 22 px labels, measured in the live CSS). **Honest
  note:** the printed lettering is hand-drawn custom lettering, not Pacifico; Pacifico is the typographic
  stand-in on screens. For merchandise and print, use the real lettering artwork itself, never re-typeset it.
- **Lilita One** for display and numerals: the tuck's "2020" measures as heavy, flat-sided, condensed
  gold glyphs (measured gold `#D8B868`/`#E8B868` band, 36% of the tuck's lower third, 8.48:1 on tuck-ink).
  Lilita One is the same species — heavy condensed, rounded, poster-loud without being corporate — and
  it is the game's display face (40 px banner, 26 px big buttons, measured). It carries every brand
  numeral: prices, "2020", scores.
- **Nunito Sans** for body and UI: flat, saturated, playful print needs a body face that stays soft
  (rounded terminals bridge to Lilita and Pacifico) without going casual or corporate. It is the game's
  body face at 17 px / 26 px (measured) and loads 400/700/800/900, which covers button (800) and
  readout (700) patterns already live.
- **Numerals:** display numerals are Lilita One at display sizes (matches the measured "2020"); inline
  numerals inside UI text are Nunito Sans 700 (the game's readout pattern). No tabular-figure claim is
  made for either face; where digits must align (tables, stats), size them to a grid with CSS
  `text-align` per cell instead of trusting face metrics.

### 3.2 Web type scale

Sizes are px at a 16 px root. "Measured" marks values lifted from the live game CSS — anchor points,
not invented.

| Token | Family | Weight | Size / line-height | Tracking | Use |
|---|---|---|---|---|---|
| `text-script-hero` | Pacifico | 400 | 64 / 1.1 | 0 | hero wordmark (measured) |
| `text-script-title` | Pacifico | 400 | 44 / 1.15 | 0 | section titles, modal titles |
| `text-script-tag` | Pacifico | 400 | 22 / 1.3 | 0 | labels, music header (measured) |
| `text-display-xxl` | Lilita One | 400 | 72 / 1.05 | 0.01em | big stats, launch hero |
| `text-display-xl` | Lilita One | 400 | 40 / 1.05 | 0 | H1, banners (measured) |
| `text-display-lg` | Lilita One | 400 | 32 / 1.1 | 0 | H2 |
| `text-display-md` | Lilita One | 400 | 24 / 1.15 | 0 | H3 |
| `text-lead` | Nunito Sans | 700 | 21 / 32 | 0 | lede paragraph |
| `text-body` | Nunito Sans | 400 | 17 / 26 | 0 | default (measured) |
| `text-button` | Nunito Sans | 800 | 15 / 1 | 0.02em | standard buttons (measured) |
| `text-button-lg` | Lilita One | 400 | 26 / 1 | 0 | big buttons (measured) |
| `text-small` | Nunito Sans | 400 | 14 / 20 | 0 | helper, footer |
| `text-caption` | Nunito Sans | 700 | 13 / 20 | 0.02em | metadata, credits |
| `text-overline` | Nunito Sans | 800 | 12 / 16 | 0.08em, uppercase | tags, kickers (measured) |

Body copy max width 66ch; scripts and display faces are never body copy; Pacifico never below 18 px
(its joins die smaller); Lilita One is never used for more than two lines in a row.

### 3.3 Social type scale (artboard 1080 px wide)

| Token | Family | Weight | Size / line-height | Tracking |
|---|---|---|---|---|
| `text-script-hero-s` | Pacifico | 400 | 132 / 1.1 | 0 |
| `text-script-title-s` | Pacifico | 400 | 88 / 1.15 | 0 |
| `text-display-hero-s` | Lilita One | 400 | 120 / 1.05 | 0.01em |
| `text-display-xl-s` | Lilita One | 400 | 88 / 1.1 | 0 |
| `text-display-lg-s` | Lilita One | 400 | 64 / 1.1 | 0 |
| `text-lead-s` | Nunito Sans | 700 | 48 / 1.3 | 0 |
| `text-body-s` | Nunito Sans | 400 | 40 / 1.45 | 0 |
| `text-caption-s` | Nunito Sans | 800 | 30 / 1.4 | 0.04em |
| `text-price-s` | Lilita One | 400 | 96 / 1 | 0 |

Floor rules at 1080 wide: no body text below 28 px, no caption below 24 px, wordmark art never
smaller than §4.4 minimums. One display line and one body paragraph max per social canvas; the deck
artwork is the hero, type is support.

---

## 4. Logo system

All geometry below was read from the actual PNG files on 2026-11-13 (pixel dimensions, colour zones).
The assets are artwork — place them whole, never rebuild them in code.

### 4.1 Primary lockup — `assets/logo-lockup-spade-wordmark.png`

- **392 × 381 px**, aspect 392:381 (≈ 1.03:1, a square-ish block), supplied full-colour on card-white.
- Stack, top → bottom: **spade mark** (navy outline ≈ `midnight`; inside the pip: a flamingo sunset —
  measured `#D88898` — with a contained sun-gold palm `#D8B868`–`#E8B868`, and a small gold sun setting
  behind the spade's base with a teal water line) → **connected script wordmark** "Palm Tree Playing
  Cards" (measured neutral near-black lettering — ink version for light grounds) → **"-est. 2020-"**.
- The three parts are one artwork: never re-space, re-align or re-typeset them.

**Variants (the only three that exist):**
1. **Primary** — the asset, ink lettering, on light approved grounds (§4.6).
2. **Reversed** — navy outlines and lettering → `card-white`; the sun/palm keep their print colours.
   This is the tuck's own treatment and the default web/game treatment: measured on `tuck-ink`
   14.48 (white script), 8.48 (gold "2020"), 4.63 (the tuck's measured print-teal ink `#689898`; the
   `lagoon-print` token holds 5.21). On `midnight`/`tuck-ink` only.
3. **Single-colour** — mark + wordmark as one solid ink: `midnight` on light grounds; `card-white` or
   `sun-gold` on dark (≥ 3:1). For stamps, engraving, one-colour print, favicons (16 px silhouette).

### 4.2 Mark alone — `assets/logo-mark-spade.png`

196 × 299 px (1:1.526). The spade (interior as in the lockup) with a sun rising behind its base and a
teal water zig-zag beneath. No lettering. Use when the name appears in words elsewhere on the same
surface (game HUD, small social).

### 4.3 Wordmark alone

No standalone wordmark asset exists in `assets/` — two approved routes, and this is stated so no one
improvises:
1. **Crop** the artwork zone `y = 0.78–1.00` of the lockup (measured lettering band: script +
   "-est. 2020-"). Preferred for anything formal (print collateral, product).
2. **Typeset** with Pacifico per §3 ("Palm Tree" in `text-script-hero`, "playing cards" beneath in
   `text-script-tag` teal, "-est. 2020-" in `text-overline`). A digital approximation of hand-drawn
   lettering — legal for UI, never a replacement for the crop on product surfaces.

### 4.4 Clear space

**Unit `s` = the width of the spade mark.** Inside the lockup asset the spade spans ≈ 0.56 of the
lockup's width (measured): at a 392 px rendering, s ≈ 219 px.

| Logo | Free space on every side |
|---|---|
| Lockup | **≥ 0.5 s** (≈ 110 px at 392 px wide) |
| Mark alone | **≥ 0.5 × its own width** |
| Wordmark crop | ≥ 0.25 × wordmark width |

Nothing enters the clear space — no type, rules, motifs, edges, other marks. On crowded social canvases
the clear space shrinks to 0.5 s, never less.

### 4.5 Minimum sizes

| Variant | Screen (px wide) | Print (mm wide) |
|---|---|---|
| Lockup, full | 132 | 34 |
| Wordmark crop | 160 | 42 |
| Mark alone | 24 | 10 |
| Single-colour / favicon | 16 (simplified silhouette) | 6 |

The lockup minimum is gated by "-est. 2020-" legibility: below it, the est. line stops reading — switch
to the crop or the mark. These minimums are rules set by this doc, derived from asset geometry.

### 4.6 Approved backgrounds

- **Full-colour logo:** `card-white`, `card-white-95`, `sun-gold-light`, `sand-light`, `flamingo-light`,
  `lagoon-light` (the navy ink holds 5.65:1 on `lagoon-light`, the darkest approved tint, up to
  13.58:1 on `card-white`). **On `lagoon-print` or any full teal field the
  mark goes only on a midnight/tuck-ink chip** — bare, its white outline is 2.78:1 and the gold sun
  vanishes into teal (1.63:1).
- **Reversed logo:** `midnight`, `midnight-deep`, `tuck-ink` only — the print's native grounds.
- **Single-colour:** any ground where the chosen ink holds ≥ 3:1 (§2.4).
- **Photography and busy scenes:** never bare. Put the logo on a solid midnight/tuck-ink field or a
  card-white plate; keep it fully inside the plate, corner-anchored, with a shadow (charter overlay rule).

### 4.7 Misuse — twelve rules

1. **Never recolour the sun.** The sun is flamingo `#CF848E` with sun-gold `#E4BF6C` — as printed. No orange, no purple, no seasonal swaps.
2. **Never put the mark on lagoon-print teal without the navy field.** (Measured failure: 2.78:1 outline, 1.63:1 sun.)
3. Never set the script wordmark in `card-white` on `sun-gold` or `sand` (1.71 / 1.62).
4. Never stretch, squash or scale non-uniformly — lockup holds 392:381, mark holds 196:299.
5. Never rotate, mirror or invert the spade — point up, water line below, always.
6. Never swap the script for another face; the printed lettering is artwork, not type (Pacifico is an on-screen stand-in only, §3).
7. Never set the script in ALL CAPS, never letterspace it, never baseline-shift the "-est. 2020-".
8. Never add shadows, bevels, foil, strokes or background gradients to the mark or lockup.
9. Never outline the script or fill its letters with texture/photos.
10. Never introduce court-red, royal blue or any fifth colour into the logo system — the mark has navy, gold, flamingo, teal, on paper.
11. Never place the full-colour lockup on `flamingo`, full `sun-gold`, full `sand`, or bare photography (§4.6).
12. Never re-crop the art inside the spade, never separate the three parts of the lockup, never mix full-colour and single-colour in one placement.

---

## 5. Card rules

### 5.1 Format (all real)

Poker size **2.5 × 3.5 in — exactly 5:7** (asset crops: 561 × 792 = 0.708). Print file: page 196 × 266 pt,
trim **180 × 252 pt**, ⅛ in bleed, CMYK ≈ 396 dpi (from the print file, per the game README). Corner
radius on the physical card ≈ 3 mm ≈ **4.7% of card width** → on screens, radius = 4.7% of tile width
(the game's 12 px token matches a ~255 px tile; at 1080-wide social a 320 px tile gets 16 px). The art in
`assets/` is the real USPCC print art: use it as an image; never redraw it.

### 5.2 The back

- **Mirror symmetry:** 180° rotationally symmetric — reads the same either way up. Two sun-and-palm
  motifs sit across the rotational centre (measured: discs at upper-left-of-centre and mirrored at
  lower-right-of-centre), each palm contained inside its sun; rays alternate `midnight` / `lagoon-print`
  with `flamingo` edge accents; a thin `card-white` paper frame runs around the field (measured white
  corners `#FD–FF`).
- **Never crop through the sun line.** A crop must keep both sun/palm motifs fully inside, or scale past
  them so the cut falls in the outer rays. A clipped sun disc = failed asset.
- Never flip horizontally, never rotate 90°, never recolour, never "dark-mode" it (it is already night).
- On screen: 5:7 tile, 4.7% radius, full artwork contained, 1 px `midnight-deep` hairline edge.

### 5.3 The Ace of Spades

The only custom numeral. A standard large-spade outline in navy; the interior is the sunset —
flamingo sun (measured `#D78A97`) with a contained sun-gold palm; small standard indices top-left and
bottom-right. **Movable in a future edition:** the interior scene. **Fixed:** the spade outline, index
placement, the palm staying contained inside the pip.

### 5.4 The Joker

A single palm **silhouette** in solid `ink-black` + the hand-lettered script "Joker", also ink-black,
on `card-white` (measured ink holds ≈ 17:1 on paper; specified as neutral `#181818` = 17.29:1). The print file carries two identical black Jokers
(the one-red Joker in `jokers.jpg` is an earlier proof, not the standard). The Joker wears **no brand
colour** — its restraint is the point; the script is artwork, never re-typeset.

### 5.5 Courts and pips — traditional, untouched

Standard double-ended pip grids (7 = five-up/two-down pattern, etc.), 180° symmetry, corner indices,
split-line courts, classic red/black/gold/blue on card-white. The printed courts are Daniel Schneider's
licensed redraws — never copied, traced or restyled here. **What must not change in any future edition:**
pips, courts, indices, suit colours, symmetry. `court-red` `#CC2229` exists only on the faces, never as
a brand UI colour. **Licence note:** Daniel Schneider agreed to the faces' use in the game on
2026-11-18. The game uses them by default, credited by name with a link to blackroses.cards; the art itself
stays out of the public repo because he sells it.

### 5.6 Tuck and brick

- **Tuck front (measured composition, this order, top → bottom):** ground `tuck-ink` `#1F273B` (exact
  corner pixel); palm (gold `#DFBB6A`) over the flamingo sun `#CF848E`/`#D88898`; bouncy brush script
  "Palm Tree" in `card-white` over the sun; "playing cards" in teal script (measured `#689898` ≈
  lagoon-print — 4.63:1 measured, 5.21:1 token); a huge condensed **"2020"** in sun-gold family across the lower third (measured
  `#D8B868`/`#E8B868` band, 8.48:1). The dieline is page 1 of the print file.
- **Brick:** full brick = 12 tucks; half brick = 6. The art is the night-beach dune dieline
  (flat dieline art, not renders; front panel 515 × 215). Source of `sand` `#F2C167`. The game's title
  screen is this box open with tucks standing — keep it as the launch hero.
- **Edition rule — what a future edition may redesign:** the five custom surfaces — **back, Ace of
  Spades, Joker, tuck, brick** (precedent: the Winter commission exists; the game's concept tucks are
  vote-only, never "for sale"). **What is fixed for good:** card size, corner radius, traditional pips
  and courts, USPCC poker stock, the 60/25/10/5 colour logic, and the brand voice. A new edition's
  surfaces must still pass §2.4/§2.5 pairings.

---

## 6. Motifs and texture

The printed motifs (BRIEF): palm tree, sun / sunset disc, water reflection, wavy zig-zag water lines,
radial/swirled rays, small birds, halftone print grain. Palms appear exactly two ways — **contained**
(inside a closed shape: the spade pip, a sun disc) or **silhouetted** (the Joker's solid black palm).
Never half-contained, never outlined-and-filled, never gradient-filled. The real artwork always wins
when it exists; these recipes are for building supporting screens without touching the print art.

**1 · Sun disc** (reference 128 px = 8 em; stripes take the ground colour behind them):

```css
.pt-sun{ width:8em; aspect-ratio:1; border-radius:50%; position:relative; overflow:hidden;
  background: radial-gradient(circle at 50% 38%,
    var(--sun-gold) 0 45%, var(--sun-gold-deep) 46% 52%, var(--flamingo) 53% 100%); }
.pt-sun::after{ content:""; position:absolute; inset:55% 0 0;
  background: repeating-linear-gradient(180deg,
    transparent 0 .9em, var(--ground) .9em 1.25em); } /* --ground = the surface behind */
```

**2 · Swirl rays** (the back's engine; rotate slowly — §8 drift):

```css
.pt-rays{ position:absolute; inset:-25%; border-radius:50%;
  background: repeating-conic-gradient(from 0deg,
    var(--midnight) 0deg 11.25deg, var(--lagoon-deep) 11.25deg 22.5deg);
  -webkit-mask-image: radial-gradient(closest-side,#000 0 55%,transparent 90%);
          mask-image: radial-gradient(closest-side,#000 0 55%,transparent 90%);
  animation: pt-ray-drift 80s linear infinite; }
@keyframes pt-ray-drift{ to{ transform:rotate(360deg); } }
```

**3 · Water zig-zag** (SVG, stroke 4, wave height 8; mirror opacity for the reflection):

```html
<svg viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true">
  <polyline points="0,32 20,24 40,32 60,24 80,32 100,24 120,32 140,24 160,32 180,24 200,32 220,24 240,32 260,24 280,32 300,24 320,32"
    fill="none" stroke="var(--lagoon)" stroke-width="4" stroke-linecap="round"/>
  <use href="#"/> <!-- duplicate mirrored at y+14, opacity .35 → reflection -->
</svg>
```

**4 · Palm — contained** (inside a sun or spade; filled crescent fronds from one crown point, gold on
navy or navy on gold) and **5 · palm — silhouette** (same shape, solid one colour, no sun behind it):

```html
<svg viewBox="0 0 120 140" aria-hidden="true">
  <path d="M56,132 C54,112 47,92 35,78 C45,88 52,98 57,108 C55,88 50,68 40,52
           C50,64 56,78 59,94 C61,76 62,56 60,38 C66,54 67,76 64,96
           C69,80 76,66 86,56 C76,70 69,88 65,110 C75,96 86,88 98,84
           C85,94 72,108 63,132 Z" fill="var(--pt-palm, var(--ink-black))"/>
  <g fill="var(--pt-palm, var(--ink-black))" stroke="none">
    <path d="M59,34 C49,22 34,16 18,16 C33,22 46,29 55,37 Z"/>
    <path d="M59,34 C53,18 41,8 26,4 C40,13 51,23 56,35 Z"/>
    <path d="M59,34 C61,16 71,5 86,0 C73,10 63,21 61,35 Z"/>
    <path d="M60,34 C72,23 88,18 104,18 C90,25 76,31 65,37 Z"/>
  </g>
</svg>
```

The structural palm: curved trunk + 6–8 crescent fronds from a single crown. In contained mode wrap it
in a circle (sun) or spade path; in silhouette mode `ink-black` only. This path is a structural recipe
in this doc — not a trace of the printed artwork, which stays the real asset.

**6 · Birds** — two joined arcs, stroke 2, round caps, `card-white` on dark or `midnight` on light:

```html
<svg viewBox="0 0 24 10" width="24" aria-hidden="true">
  <path d="M1,8 Q5,2 9,8 Q13,2 17,8 Q20,4 23,8" fill="none"
    stroke="var(--card-white)" stroke-width="2" stroke-linecap="round"/>
</svg>
```

**7 · Halftone grain + print noise** — two stacked layers, never above 8% total:

```css
.pt-grain{ position:absolute; inset:0; pointer-events:none; mix-blend-mode:multiply;
  background-image:
    radial-gradient(#000 1px, transparent 1.2px), /* halftone dots, 4 px grid */
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
  background-size: 4px 4px, 120px 120px;
  opacity:.06; } /* on dark grounds: blend mode screen, colour #fff, opacity .04 */
```

Motif rules: motifs support, they never replace the wordmark; no motif goes inside the logo's clear
space; one decisive motif per composition (charter); birds appear in pairs/threes, never solo-centred.

---

## 7. Layout and components

### 7.1 Grid

- **Web:** 12 columns, max-width **1152 px**, gutter **24 px**, page margins ≥ 32 px; hero = 7/5 split
  (copy left, 5:7 deck art right); body column max 66ch.
- **Social (1080 wide):** margins **90 px**, 6 columns, gutter **36 px** (column 135 px); lockup centres
  across columns 2–5.

### 7.2 Spacing scale (4/8 base)

`4 · 8 · 16 · 24 · 32 · 48 · 64 · 96 · 128` px — tokens `--space-1…--space-9`.
In-tile padding 16; button inner 12/18 (measured); component gaps 10–12 (measured); panel padding 32
(measured); section gaps 64 (web) / 96–128 (hero bands).

### 7.3 Radii

`--radius-card` = 4.7% of the card/tile width: **12 px at ~255 px tiles** (game-measured token),
**16 px at 320 px tiles** (1080-wide social), 28 px at ~600 px hero tiles.
`--radius-tile` 16 · `--radius-panel` **20 px** (game-measured) · `--radius-round` **999 px** (all
buttons and chips are pills/circles, game-measured).

### 7.4 Elevation (all lifted from the live game CSS — measured)

```css
--shadow-push : 0 3px 0 rgba(0,27,51,.35);    /* buttons at rest; 2px stub when pressed */
--shadow-tile : 0 8px 22px rgba(0,27,51,.5);  /* deck tiles, tucks */
--shadow-panel: 0 18px 50px rgba(0,27,51,.45);/* panels, modals */
--shadow-float: 0 10px 30px rgba(0,27,51,.45);/* banners, price badges */
```

Depth language: the world is a card table — solid ink shadows, a hard 3 px stub under buttons (pushed
chips, not floating glass), no blur-happy ambient mush. `rgba(0,27,51)` is the `midnight-deep` family;
keep it.

### 7.5 Type-on-surface pairings

Every component pairs a text token with a §2.4-approved colour pair; hover states move the **background**
(`midnight → midnight-lift`, `sun-gold → sun-gold-deep` pressed), never the text toward the field.

### 7.6 Components (CSS, all values = tokens or game-measured)

**Buttons** — one primary per viewport (charter):

```css
.pt-btn{ font:800 15px/1 var(--font-body); letter-spacing:.02em; color:var(--midnight);
  background:var(--card-white); border:0; border-radius:var(--radius-round);
  padding:12px 18px; min-height:44px; min-width:44px; cursor:pointer;
  box-shadow:var(--shadow-push); transition:transform .08s, box-shadow .08s, background .15s; }
.pt-btn:active{ transform:translateY(2px); box-shadow:0 1px 0 rgba(0,27,51,.35); }
.pt-btn.primary{ background:var(--sun-gold); font:400 26px/1 var(--font-display);
  padding:14px 22px; }            /* label = midnight, 7.95:1 */
.pt-btn.primary:hover{ background:var(--sun-gold-deep); }
.pt-btn.ghost{ background:transparent; color:var(--card-white);
  box-shadow:inset 0 0 0 2px var(--hairline-dark); }
.pt-btn:disabled{ opacity:.45; pointer-events:none; } /* the only reduced-contrast state */
.pt-btn:focus-visible{ outline:3px solid var(--flamingo); outline-offset:3px; }
```

**Chips** (bet chips; game-measured — the three chip values are the approved chip colours):

```css
.pt-chip{ width:52px; height:52px; border-radius:50%; padding:0;
  font:400 18px/1 var(--font-display); border:4px dashed rgba(252,252,252,.85);
  display:grid; place-items:center; }
.pt-chip.c5  { background:var(--flamingo);      color:var(--midnight); }     /* 4.88 */
.pt-chip.c25 { background:var(--lagoon-deep);   color:var(--card-white); }   /* 5.36 */
.pt-chip.c100{ background:var(--midnight);      color:var(--sun-gold); }     /* 7.95 */
```

**Panel** (menus, modals; game-measured):

```css
.pt-panel{ background:var(--midnight); border-radius:var(--radius-panel); padding:32px;
  box-shadow:var(--shadow-panel); color:var(--card-white); text-align:center;
  max-width:min(92vw,460px); }
```

**Tag / readout** (HUD pills; game-measured `rgba(0,42,79,.78)` ≈ midnight @ 78%):

```css
.pt-tag{ font:700 15px/1 var(--font-body); color:var(--card-white);
  background:rgba(1,46,79,.78); padding:10px 14px; border-radius:var(--radius-round); }
.pt-tag b{ font:400 17px/1 var(--font-display); color:var(--sun-gold); }
```

**Deck tile** — the brand's product atom:

```css
.pt-tile{ aspect-ratio:5/7; width:320px; max-width:100%; border-radius:var(--radius-tile);
  overflow:hidden; border:1px solid rgba(1,28,47,.4); box-shadow:var(--shadow-tile);
  background:var(--card-white); }
.pt-tile img{ width:100%; height:100%; object-fit:cover; display:block; }
/* art is full-bleed decorative cover; any tile with readable type uses contain */
```

**Price badge:**

```css
.pt-price{ width:96px; height:96px; border-radius:50%; background:var(--sun-gold);
  color:var(--midnight); font:400 30px/1 var(--font-display); display:grid; place-items:center;
  box-shadow:var(--shadow-float); } /* 8:16 "$14"; on sand fields use --sand */
```

Anchoring on photos: corner-anchored, ≥ 24 px inset, fully inside the frame, opaque fill — §4.6.

**CTA bar** (the one true funnel — "Play with the real deck", the game's win-screen plan):

```css
.pt-cta{ display:flex; flex-wrap:wrap; gap:24px; align-items:center; justify-content:center;
  background:var(--midnight); padding:64px 24px; box-shadow:var(--shadow-panel); }
.pt-cta h2{ font:400 40px/1.05 var(--font-display); color:var(--sun-gold); flex-basis:100%;
  text-align:center; margin:0; }
```

Rules: one solid primary CTA per viewport; secondary entries are ghost/text links; 44 px minimum touch
target on everything (measured); focus ring always flamingo 3 px/offset 3.

---

## 8. Motion

### 8.1 Principles

- **Drift.** The brand world moves slowly and never stops: rays rotate, water slides, palms sway. Every
  looping drift runs ≥ 6 s and stays under ±8° / 8 px — a lazy afternoon, not a screensaver.
- **Shuffle.** Cards move in quick cascades: fast, staggered, landing with the game's measured pop
  curve. Motion is per-card, not per-deck.
- **Deal.** Cards leave the deck along an arc and settle square. Landings always end at rotation 0
  with a short overshoot — the "snap" of a real deal. Nothing brand-y ever bounces twice.

### 8.2 Easing and duration tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.215, 0.61, 0.355, 1)` | standard entrances, deals, UI |
| `--ease-in` | `cubic-bezier(0.55, 0.085, 0.68, 0.53)` | exits, cards leaving |
| `--ease-pop` | `cubic-bezier(0.3, 1.6, 0.5, 1)` | landings, banners — **measured**: the game's live `pop` curve |
| `--ease-drift` | `cubic-bezier(0.37, 0, 0.63, 1)` | all loops (in-out sine) |
| `--dur-tap` | `80ms` | press feedback (measured: game `.08s`) |
| `--dur-ui` | `150ms` | hover/state colour (measured: game `.15s`) |
| `--dur-deal` | `260ms` | one card flying to its spot |
| `--stagger-shuffle` | `40ms` | delay step per card in a cascade |
| `--dur-fan` | `500ms` | a full fan open/close |
| `--dur-sunrise` | `1200ms` | sun/rays reveal (rays layer may trail to 1600ms) |
| `--dur-drift` | `8s` | one loop of a standard drift (rays: 80s, §6) |

Nothing in the brand moves faster than 80ms or slower than 80s.

### 8.3 Recipes

**Deal** — a card (or tuck) flies from the stock to its place and snaps square:

```css
.pt-deal{ animation: pt-deal var(--dur-deal) var(--ease-out) both;
  animation-delay: calc(var(--i) * var(--stagger-shuffle)); }
@keyframes pt-deal{
  from{ transform:translate(0,-40px) rotate(-8deg) scale(.92); opacity:0; }
  70% { transform:translate(var(--dx),var(--dy)) rotate(2deg)  scale(1); opacity:1; }
  to  { transform:translate(var(--dx),var(--dy)) rotate(0deg)  scale(1); } }
```

**Fan** — a hand opens from a pivot below the deck; reverse the delays to close:

```css
.pt-fan{ transform-origin:50% 130%;
  transition:transform var(--dur-fan) var(--ease-pop);
  transition-delay:calc(var(--i) * var(--stagger-shuffle)); }
.pt-fan.is-open{ transform:rotate(calc((var(--i) - 2.5) * 9deg)) translateY(-8px); }
```

**Sun rise** — the launch gesture (landing hero, listing-day billboards): the sun scales up from behind
the horizon line while the rays fade in and start drifting:

```css
.pt-rise .pt-sun{ animation:pt-rise var(--dur-sunrise) var(--ease-out) both; }
@keyframes pt-rise{ from{ transform:translateY(24px) scale(.7); opacity:0 } }
.pt-rise .pt-rays{ opacity:0; transition:opacity 1600ms var(--ease-drift) 400ms; }
.pt-rise.in .pt-rays{ opacity:1; }
```

Precedent is live: the game's banner already pops on `--ease-pop` at `.35s` (measured).

### 8.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce){
  .pt-deal,.pt-fan,.pt-rise .pt-sun,.pt-rise .pt-rays{ animation:none; transition:none; }
  .pt-rays{ animation:none; }            /* loops stop */
  *{ transition-duration:.15s !important; animation-duration:.01ms !important; }
}
```

Policy: under reduced motion everything jumps to its final state instantly (or a ≤ 150ms opacity fade);
drift loops park at frame 0; the fan and deal never fly. Never ship an experience whose meaning lives
only in motion — the sun is also always drawn, the deal also has a sound.

---

## 9. Voice and tone

First-person maker voice. Short sentences. Origin before product. Warm, confident, unfussy — a magician
talking across the table, never a brand account shouting over a DJ. The campaign line is the standard:
*"I want to create a deck of cards that signifies rest and relaxation."*

### 9.1 Five do

1. Speak as "I" (the maker) or "we" only with a named collaborator; credit collaborators by name/handle.
2. Lead with the origin — "How it all started…" — before the product pitch.
3. State real numbers only: 2020, 196 backers, $8,721, $8,500 goal, ~1,600 decks left, $14, USPCC, poker size.
4. Use pause-words: rest, relaxation, sunset, shuffle, table, lazy afternoon, drift.
5. End with an open hand, not a push: "It's still on my table." / "Play it free."

### 9.2 Five don't

1. No exclamation-mark hype (none, ever — not in captions, not in buttons).
2. No fake scarcity ("limited!!", "selling fast" — we have ~1,600 decks and say so).
3. No invented metrics, press quotes, partner logos or exchange tickers; "IPO" styling must read playful
   ("PALM · est. 2020"), never a fake listing.
4. No corporate/marketing-voice words (leverage, revolutionary, game-changer, must-have, disrupt, premium luxury).
5. No trash-talking or name-dropping other brands as competition; Theory11/Art of Play are references,
   never logos in our frames.

### 9.3 Word list

**Yes:** rest, relaxation, sunset, sunrise, palm, lagoon, sand, birds, drift, shuffle, deal, table,
lazy afternoon, tuck, brick, cardist, magician, printed, USPCC, poker size, first edition, my deck,
2020, $14.
**Avoid:** game-changer, revolutionary, must-have, hype, limited!!, exclusive drop, grind, hustle,
premium, luxury, disrupt, synergy, "trust me", ALL CAPS, emoji-as-punctuation (a lone 🌴 on a palm post
is fine; 🎉🔥🚀 never).

### 9.4 Six sample lines

- **Social caption:** "How it all started. I wanted a deck that means rest and relaxation — palms,
  a low sun, water going flat. USPCC printed it, 2020. It's still on my table."
- **Button (game win screen):** "Play with the real deck"
- **Error:** "That shuffle didn't take. The deal's back in your hands."
- **Launch headline:** "Palm Tree Playing Cards. Est. 2020. Still about the sunset."
- **README opener** (the game's real one): "A small three.js card table using my own deck, Palm Tree
  Playing Cards (Kickstarter 2020, USPCC). It plays Klondike Solitaire and Blackjack, picked from the
  title menu."
- **Sign-off:** "— Sean · @seanmcmagic · SeanMcMagic.com"

---

## 10. Social formats

Every canvas: colours = the screen variants from §2; logo = reversed on midnight/tuck-ink unless
§4.6 says otherwise; one lockup per canvas, clear space per §4.4; text sizes per §3.3.

| Format | Canvas | Safe zone | Treatment |
|---|---|---|---|
| **YouTube banner** | **2560 × 1440** | **1546 × 423** centred (x 507–2053, y 508–931) | Full-bleed `midnight` + swirl rays + sun across all 2560 × 1440; reversed lockup **260–300 px tall** dead-centre in the safe box; no other text inside the safe box — mobile crops to exactly that rectangle |
| **Thumbnail** | **1280 × 720** | 60 px inset all sides | Deck tile (320 px) or card fan right; headline ≤ 6 words in `display-hero-s` left, per §2.4 pairings; price badge optional; keep faces/actions legible at 240 px preview |
| **Instagram post** | **1080 × 1350** | 90 px margin all sides (4:5 crop-proof) | Scene top, product centred (tile or brick), one line in `display-xl-s` + one in `body-s`; lockup crop ≤ 360 px wide, bottom-centred |
| **Story / Reel cover** | **1080 × 1920** | **top 250 px and bottom 340 px unsafe**; live area = 1080 × 1330 (y 250–1580) | CTA button text lives y 1300–1500; lockup never above y 250; sun never behind the username chip zone (top-left 250 px) |
| **GitHub social preview** | **1280 × 640** | 64 px side / 80 px top-bottom inset | `midnight` + rays; reversed lockup left, two tiles (back + Ace) right; ≤ 8 words total; PNG ≤ 1 MB; alt text on the page description |
| **README hero** | **1280 × 400** | 48 px inset | Reversed lockup centred, 200 px wide, row of three tiles (back, Ace, Joker) beneath; links to the live game; PNG ≤ 200 KB, serves at half-width |

Export rules: JPEG q80+ for thumbnails/IG (flat colour compresses cleanly), PNG for anything with the
logo; never auto-rotate; every asset ships with alt text in the maker voice (§9).

---

## 11. Design tokens

The JSON (W3C design-tokens style) and the CSS `:root` below are the same system twice. `tokens.json`
and `tokens.css` in this project are their canonical copies — regenerate from here, never the reverse.

```json
{
  "$meta": {
    "name": "Palm Tree Playing Cards",
    "version": "2.0",
    "date": "2026-11-13",
    "source": "DESIGN.md section 11; colour hexes measured 2026-11-13 from USPCC print art (k-means)",
    "usageRatio": { "field": 60, "paper": 25, "lagoon": 10, "sun": 5 }
  },
  "color": {
    "midnight":        { "$type": "color", "$value": "#012E4F", "$description": "dominant field, dark surfaces, text on light; measured card-back field" },
    "midnight-deep":   { "$type": "color", "$value": "#011C2F", "$description": "midnight→black 40%; shadows/depth, never text" },
    "midnight-lift":   { "$type": "color", "$value": "#103A59", "$description": "midnight→card-white 6%; hover on midnight" },
    "hairline-dark":   { "$type": "color", "$value": "#1F4764", "$description": "midnight→card-white 12%; borders on midnight" },
    "ink-muted":       { "$type": "color", "$value": "#C0CBD1", "$description": "midnight→card-white 76%; secondary text on dark" },
    "ink-black":       { "$type": "color", "$value": "#181818", "$description": "joker silhouette; script on light grounds" },
    "tuck-ink":        { "$type": "color", "$value": "#1F273B", "$description": "tuck ground; panels/modals; measured corner of tuck-front.png" },
    "tuck-ink-soft":   { "$type": "color", "$value": "#353C4E", "$description": "tuck-ink→card-white 10%; hover on tuck-ink" },
    "lagoon":          { "$type": "color", "$value": "#39979F", "$description": "screen teal (game); never print" },
    "lagoon-print":    { "$type": "color", "$value": "#6AA2AA", "$description": "print teal (back, tuck script); never screen text fields" },
    "lagoon-deep":     { "$type": "color", "$value": "#257283", "$description": "lagoon→midnight 35%; gradients, c25 chip" },
    "lagoon-light":    { "$type": "color", "$value": "#6AB0B6", "$description": "lagoon→card-white 25%; 5.65:1 on midnight" },
    "sun-gold":        { "$type": "color", "$value": "#E4BF6C", "$description": "sun, contained palm, CTA, 2020; measured back" },
    "sun-gold-light":  { "$type": "color", "$value": "#EBD197", "$description": "sun-gold→card-white 30%" },
    "sun-gold-deep":   { "$type": "color", "$value": "#958C62", "$description": "sun-gold→midnight 35%; pressed gold" },
    "flamingo":        { "$type": "color", "$value": "#CF848E", "$description": "sun's lower half, accents, chips, error; measured tuck sun" },
    "flamingo-light":  { "$type": "color", "$value": "#DDA8AE", "$description": "flamingo→card-white 30%" },
    "flamingo-deep":   { "$type": "color", "$value": "#916A7B", "$description": "flamingo→midnight 30%; large text only" },
    "sand":            { "$type": "color", "$value": "#F2C167", "$description": "brick dune, price badge; brick contexts only" },
    "sand-light":      { "$type": "color", "$value": "#F5D393", "$description": "sand→card-white 30%" },
    "sand-deep":       { "$type": "color", "$value": "#AA9560", "$description": "sand→midnight 30%" },
    "card-white":      { "$type": "color", "$value": "#FCFCFA", "$description": "card stock; light fields; text on dark" },
    "card-white-95":   { "$type": "color", "$value": "#EFF2F1", "$description": "card-white→midnight 5%; layered light surfaces" },
    "court-red":       { "$type": "color", "$value": "#CC2229", "$description": "hearts/diamonds only — never a brand color" }
  },
  "font": {
    "script":  { "$type": "fontFamily", "$value": ["Pacifico", "Brush Script MT", "cursive"] },
    "display": { "$type": "fontFamily", "$value": ["Lilita One", "Arial Rounded MT Bold", "system-ui", "sans-serif"] },
    "body":    { "$type": "fontFamily", "$value": ["Nunito Sans", "system-ui", "sans-serif"] }
  },
  "type": {
    "web": {
      "script-hero":  { "font": { "$type": "string", "$value": "{font.script}" }, "size": { "$type": "dimension", "$value": "64px" }, "lineHeight": { "$type": "number", "$value": 1.1 },  "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "script-title": { "font": { "$type": "string", "$value": "{font.script}" }, "size": { "$type": "dimension", "$value": "44px" }, "lineHeight": { "$type": "number", "$value": 1.15 }, "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "script-tag":   { "font": { "$type": "string", "$value": "{font.script}" }, "size": { "$type": "dimension", "$value": "22px" }, "lineHeight": { "$type": "number", "$value": 1.3 },  "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "display-xxl":  { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "72px" }, "lineHeight": { "$type": "number", "$value": 1.05 }, "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0.01em" } },
      "display-xl":   { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "40px" }, "lineHeight": { "$type": "number", "$value": 1.05 }, "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "display-lg":   { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "32px" }, "lineHeight": { "$type": "number", "$value": 1.1 },  "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "display-md":   { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "24px" }, "lineHeight": { "$type": "number", "$value": 1.15 }, "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "lead":         { "font": { "$type": "string", "$value": "{font.body}" },   "size": { "$type": "dimension", "$value": "21px" }, "lineHeight": { "$type": "number", "$value": 1.52 }, "weight": { "$type": "number", "$value": 700 }, "tracking": { "$type": "string", "$value": "0" } },
      "body":         { "font": { "$type": "string", "$value": "{font.body}" },   "size": { "$type": "dimension", "$value": "17px" }, "lineHeight": { "$type": "number", "$value": 1.53 }, "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "button":       { "font": { "$type": "string", "$value": "{font.body}" },   "size": { "$type": "dimension", "$value": "15px" }, "lineHeight": { "$type": "number", "$value": 1 },    "weight": { "$type": "number", "$value": 800 }, "tracking": { "$type": "string", "$value": "0.02em" } },
      "button-lg":    { "font": { "$type": "string", "$value": "{font.display}" },"size": { "$type": "dimension", "$value": "26px" }, "lineHeight": { "$type": "number", "$value": 1 },    "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "small":        { "font": { "$type": "string", "$value": "{font.body}" },   "size": { "$type": "dimension", "$value": "14px" }, "lineHeight": { "$type": "number", "$value": 1.43 }, "weight": { "$type": "number", "$value": 400 }, "tracking": { "$type": "string", "$value": "0" } },
      "caption":      { "font": { "$type": "string", "$value": "{font.body}" },   "size": { "$type": "dimension", "$value": "13px" }, "lineHeight": { "$type": "number", "$value": 1.54 }, "weight": { "$type": "number", "$value": 700 }, "tracking": { "$type": "string", "$value": "0.02em" } },
      "overline":     { "font": { "$type": "string", "$value": "{font.body}" },   "size": { "$type": "dimension", "$value": "12px" }, "lineHeight": { "$type": "number", "$value": 1.33 }, "weight": { "$type": "number", "$value": 800 }, "tracking": { "$type": "string", "$value": "0.08em" } }
    },
    "social1080": {
      "script-hero-s":  { "font": { "$type": "string", "$value": "{font.script}" },  "size": { "$type": "dimension", "$value": "132px" } },
      "script-title-s": { "font": { "$type": "string", "$value": "{font.script}" },  "size": { "$type": "dimension", "$value": "88px" } },
      "display-hero-s": { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "120px" } },
      "display-xl-s":   { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "88px" } },
      "display-lg-s":   { "font": { "$type": "string", "$value": "{font.display}" }, "size": { "$type": "dimension", "$value": "64px" } },
      "lead-s":         { "font": { "$type": "string", "$value": "{font.body}" },    "size": { "$type": "dimension", "$value": "48px" } },
      "body-s":         { "font": { "$type": "string", "$value": "{font.body}" },    "size": { "$type": "dimension", "$value": "40px" } },
      "caption-s":      { "font": { "$type": "string", "$value": "{font.body}" },    "size": { "$type": "dimension", "$value": "30px" } },
      "price-s":        { "font": { "$type": "string", "$value": "{font.display}" },"size": { "$type": "dimension", "$value": "96px" } }
    }
  },
  "space": {
    "1": { "$type": "dimension", "$value": "4px" },   "2": { "$type": "dimension", "$value": "8px" },
    "3": { "$type": "dimension", "$value": "16px" },  "4": { "$type": "dimension", "$value": "24px" },
    "5": { "$type": "dimension", "$value": "32px" },  "6": { "$type": "dimension", "$value": "48px" },
    "7": { "$type": "dimension", "$value": "64px" },  "8": { "$type": "dimension", "$value": "96px" },
    "9": { "$type": "dimension", "$value": "128px" }
  },
  "radius": {
    "card":  { "$type": "dimension", "$value": "12px", "$description": "≈4.7% of a 255px tile = the real ~3mm card corner; scale 4.7% of width" },
    "tile":  { "$type": "dimension", "$value": "16px", "$description": "320px tiles at 1080 wide" },
    "panel": { "$type": "dimension", "$value": "20px", "$description": "game-measured" },
    "round": { "$type": "dimension", "$value": "999px", "$description": "pills and chips" }
  },
  "shadow": {
    "push":  { "$type": "shadow", "$value": { "offsetX": "0px", "offsetY": "3px",  "blur": "0px",  "color": "rgba(0,27,51,0.35)" }, "$description": "buttons at rest; 2px stub pressed; game-measured" },
    "tile":  { "$type": "shadow", "$value": { "offsetX": "0px", "offsetY": "8px",  "blur": "22px", "color": "rgba(0,27,51,0.5)" } },
    "panel": { "$type": "shadow", "$value": { "offsetX": "0px", "offsetY": "18px", "blur": "50px", "color": "rgba(0,27,51,0.45)" } },
    "float": { "$type": "shadow", "$value": { "offsetX": "0px", "offsetY": "10px", "blur": "30px", "color": "rgba(0,27,51,0.45)" } }
  },
  "duration": {
    "tap":     { "$type": "duration", "$value": "80ms",   "$description": "game-measured" },
    "ui":      { "$type": "duration", "$value": "150ms",  "$description": "game-measured" },
    "deal":    { "$type": "duration", "$value": "260ms" },
    "fan":     { "$type": "duration", "$value": "500ms" },
    "sunrise": { "$type": "duration", "$value": "1200ms" },
    "drift":   { "$type": "duration", "$value": "8s" },
    "staggerShuffle": { "$type": "duration", "$value": "40ms" }
  },
  "easing": {
    "out":   { "$type": "cubicBezier", "$value": [0.215, 0.61, 0.355, 1] },
    "in":    { "$type": "cubicBezier", "$value": [0.55, 0.085, 0.68, 0.53] },
    "pop":   { "$type": "cubicBezier", "$value": [0.3, 1.6, 0.5, 1], "$description": "the game's live pop curve" },
    "drift": { "$type": "cubicBezier", "$value": [0.37, 0, 0.63, 1] }
  }
}
```

```css
/* Palm Tree Playing Cards — design tokens · DESIGN.md v2.0 (2026-11-13)
   Paste-ready. Pairs with DESIGN.md sections 2, 3, 7, 8. tokens.css is this block. */
:root{
  /* colour — measured print palette (DESIGN.md §2) */
  --midnight:#012E4F; --midnight-deep:#011C2F; --midnight-lift:#103A59;
  --hairline-dark:#1F4764; --ink-muted:#C0CBD1; --ink-black:#181818;
  --tuck-ink:#1F273B; --tuck-ink-soft:#353C4E;
  --lagoon:#39979F; --lagoon-print:#6AA2AA; --lagoon-deep:#257283; --lagoon-light:#6AB0B6;
  --sun-gold:#E4BF6C; --sun-gold-light:#EBD197; --sun-gold-deep:#958C62;
  --flamingo:#CF848E; --flamingo-light:#DDA8AE; --flamingo-deep:#916A7B;
  --sand:#F2C167; --sand-light:#F5D393; --sand-deep:#AA9560;
  --card-white:#FCFCFA; --card-white-95:#EFF2F1;
  --court-red:#CC2229; /* card faces only — never brand UI */
  /* type (DESIGN.md §3) */
  --font-script:"Pacifico","Brush Script MT",cursive;
  --font-display:"Lilita One","Arial Rounded MT Bold",system-ui,sans-serif;
  --font-body:"Nunito Sans",system-ui,sans-serif;
  --text-script-hero:64px; --text-script-title:44px; --text-script-tag:22px;
  --text-display-xxl:72px; --text-display-xl:40px; --text-display-lg:32px; --text-display-md:24px;
  --text-lead:21px; --text-body:17px; --text-button:15px; --text-button-lg:26px;
  --text-small:14px; --text-caption:13px; --text-overline:12px;
  /* space (DESIGN.md §7.2) */
  --space-1:4px; --space-2:8px; --space-3:16px; --space-4:24px; --space-5:32px;
  --space-6:48px; --space-7:64px; --space-8:96px; --space-9:128px;
  /* radii (DESIGN.md §7.3; card radius = 4.7% of tile width) */
  --radius-card:12px; --radius-tile:16px; --radius-panel:20px; --radius-round:999px;
  /* elevation (DESIGN.md §7.4, game-measured) */
  --shadow-push:0 3px 0 rgba(0,27,51,.35); --shadow-tile:0 8px 22px rgba(0,27,51,.5);
  --shadow-panel:0 18px 50px rgba(0,27,51,.45); --shadow-float:0 10px 30px rgba(0,27,51,.45);
  /* motion (DESIGN.md §8) */
  --dur-tap:80ms; --dur-ui:150ms; --dur-deal:260ms; --dur-fan:500ms;
  --dur-sunrise:1200ms; --dur-drift:8s; --stagger-shuffle:40ms;
  --ease-out:cubic-bezier(.215,.61,.355,1); --ease-in:cubic-bezier(.55,.085,.68,.53);
  --ease-pop:cubic-bezier(.3,1.6,.5,1); --ease-drift:cubic-bezier(.37,0,.63,1);
}
```

**Game adoption map** (the live `src/style.css` v1 tokens → v2): `#002a4f`→`--midnight #012E4F` ·
`#001b33`→`--midnight-deep #011C2F` · `#1d4166`→`--hairline-dark #1F4764` · `#b7c8d6`→`--ink-muted
#C0CBD1` · `#2f7c8b`→`--lagoon-deep #257283` · `#f5c364`→`--sun-gold #E4BF6C` (rename
`--sunset-gold`→`--sun-gold`) · `#f0909c`→`--flamingo #CF848E` · `#fcfcfc`→`--card-white #FCFCFA`.
`--lagoon #39979f` stays as measured. The game's radius/shadow/motion values are already v2.

---

## 12. Changelog

### v1 — July 2026 (vault note; hexes eyeballed from Kickstarter-page screenshots)

Palette: navy ~`#15294B`, turquoise ~`#2FB4B0`, coral ~`#F09AA0`, marigold ~`#F5C22E`, white, court red
~`#CE1B22`. A type *description* (surf script, heavy condensed 2020, handwriting) with no scale. No logo
rules, no card rules, no motion, no social formats, no token files. An older note carried yet another set
(#16305A, #2E9E9E, #F09199, #F0C05A), also eyeballed.

### v2.0 — 2026-11-13, "launch edition" (measured)

| v1 (eyeballed) | v2.0 (measured) | Why |
|---|---|---|
| navy ~`#15294B` | `midnight #012E4F` + new `tuck-ink #1F273B` | k-means on the real print files. The screenshot navy was lifted by JPEG/render mockups. v1 also treated the tuck ground and the back field as one colour — they are two: the tuck corner measures `#1F273B` exactly, a warmer, darker navy. |
| turquoise ~`#2FB4B0` | split: `lagoon-print #6AA2AA` / `lagoon-screen #39979F` | print teal is dusty; the campaign's #2FB4B0 never appears in the print art. Screens emit light, print absorbs it — the token now exists twice, by medium. The game's `#39979f` is confirmed as the correct screen value. |
| coral ~`#F09AA0` | `flamingo #CF848E` (sub-values `#D78A97`/`#C98CA1` in the art) | the print pinks are muted; #F09AA0 came from campaign render *backgrounds*, not the deck. |
| marigold ~`#F5C22E` | `sun-gold #E4BF6C` (tuck palm `#DFBB6A`) | #F5C22E was the render gold; the printed golds measure softer. |
| *(no brick token)* | `sand #F2C167` | v1 predates the brick dielines being read; dune measured. |
| white | `card-white #FCFCFA` | measured stock tone. |
| court red ~`#CE1B22` | `court-red #CC2229`, **brand-never** rule, 0% ratio | it exists on hearts/diamonds only. |
| *(no derived ramp)* | §2.2 tint/shade set with computed recipes | kills a second generation of eyeballed values; replaces the game's #1d4166/#b7c8d6/#001b33 approximations (adoption map, §11). |
| *(no maths)* | §2.4/§2.5 WCAG pairings and forbidden pairs, computed 2026-11-13 | contrast is arithmetic now; every pairing in §7 components passes. |

Also new in v2.0 (none of it existed in v1): §1 pillars from the real story; §3 type scales anchored to
the game's measured CSS values (64/40/26/22/17/26/15-800/12-800) with per-face justification against the
print lettering; §4 logo geometry (392×381 / 196×299 read from the files), clear space in spade-width
units, minimum sizes, twelve misuse rules; §5 card and edition rules; §6 motif CSS/SVG recipes; §7 grid,
4/8 spacing, radii (the 4.7% card-corner rule), game-measured shadows, component CSS; §8 motion tokens
(the game's live pop curve adopted, not invented); §9 voice with six samples; §10 social safe zones;
§11 token files (`tokens.json`, `tokens.css`).

**Open items handed forward honestly:** (1) Daniel Schneider's faces: cleared for the game on
2026-11-18 (credited; art kept out of the repo); (2) the game's `:root` still carries the v1-side
tokens above — update it to §11 at the next build; (3) a standalone wordmark asset does not exist —
make the crop per §4.3 before print collateral; (4) Winter Edition stays concept/commission only, never
"for sale".

---

*End of DESIGN.md v2.0. Next: brand book, social kit, motion, GitHub, landing page, game — all from
§11 tokens and the rules above.*


