# Palm Tree Cards

A small three.js card table using my own deck, Palm Tree Playing Cards (Kickstarter 2020, USPCC). It plays
**Klondike Solitaire** and **Blackjack** (one player against the dealer), picked from the title menu.

## Run it

```
node serve.mjs            # http://localhost:8160
```

The server binds to `0.0.0.0`, so the phone and tablet can open `http://<this PC's LAN IP>:8160` on the same Wi-Fi.
It needs `http://`; opening `index.html` as a file will not load the ES modules. three.js r186.1 is vendored in
`vendor/three/`, so nothing is fetched except the Google Fonts (Pacifico, Lilita One, Nunito Sans). Offline, the
fonts fall back to system faces.

## Controls

| | Touch / mouse | Keyboard | Gamepad (Xbox layout, Steam Controller via Steam-launched Chrome) |
|---|---|---|---|
| Menus | tap a tuck in the box, or a button | arrows, Enter, Esc | D-pad or left stick, A, B |
| Solitaire: move a card | drag it, or tap it to send it to the best spot | arrows to aim, Enter to pick up then drop; X sends it | D-pad aims (up goes deeper into a column), A picks up / drops, X sends it to the best spot |
| Solitaire: draw | tap the stock | W or D | Y |
| Undo / hint / new deal | buttons | Z / H / — | LB / RB / Back |
| Blackjack | chip, Deal, Hit, Stand, Double buttons | arrows + Enter; S stand, W double | D-pad + A; X stand (bet phase: clear), Y double (bet phase: deal), LB/RB bet −/+5 |
| Back to menu | Menu button | M | Start |

## Rules

- **Solitaire:** Klondike, draw 1 or draw 3 (asked each time you start Solitaire; picking the other mode deals afresh), unlimited
  redeals. Undo goes back up to 300 moves. When the stock and waste are empty and every card is face up, it finishes
  itself. A "No more moves" check offers undo or a new deal. Abandoning a started game counts as a loss.
- **Blackjack:** 4-deck shoe, reshuffled when 52 cards remain. Dealer stands on all 17s and peeks on an ace or a ten.
  Blackjack pays 3:2, double on the first two cards. No split and no insurance (yet). Start with 500 chips; go broke
  and you can rebuy 500 (counted in stats). A reload mid-hand refunds the bet.

Stats, settings and the bankroll are saved in `localStorage` (`palmtree-cards-v1`). The title screen's Stats button
shows them and can reset them.

## The art, and where my real files go

The game has **editions**: a deck is a back, faces, an optional Joker and a tuck case. There are two, and the
**Deck** button on the title (or picking a tuck) chooses one for both games; a game in progress changes look too.

| Edition | Source (in `art/source/`, git-ignored, never committed) | What the game uses |
|---|---|---|
| **Original** (2020, USPCC) | `Palm Tree Playing Cards.pdf`, the print file: p1 tuck dieline, back, Joker ×2 (same image); p2–p5 one suit each | my back, my custom Ace of Spades, the Joker, the tuck. The other faces are the standard procedural ones (see below) |
| **Winter** (Fiverr commission, all rights mine) | `winter/`: 52 face `.ai` files; `winter-album/`: my Google Photos album (print sheets, a render, photos of the printed tuck, brick dielines) | the 52 Fiverr faces, plus from the album the navy-and-pink back, the custom Ace of Spades, the Joker, the tuck and its own pink-and-navy brick. The Fiverr `Back.ai` and `Box Design.ai` are an earlier pale-blue design and are not used |

`python tools/build_art.py` (needs `pymupdf`, Pillow and numpy) builds every texture and writes
`art/manifest.json` to match. The `.ai` files are PDF-compatible, so PyMuPDF rasterises them like the print file;
each card page is 196 × 266 pt, with the 180 × 252 pt trim centred, and the script clips
to the trim. The print file's images are CMYK at about 396 dpi with a 1/8 in bleed; the script trims those too. It
rounds the corners to match the canvas cards and adds the same hairline edge. The colours survive the conversion:
the Original back's midnight comes out as `#002a50` against the `#002a4f` token.

**Two tiers.** Every texture comes as `_hi` (desktop, tablets) and `_lo` (phones: coarse pointer and shorter screen
side under 700 px; `?tier=lo` or `?tier=hi` forces one). All are powers of two, so three.js builds mipmaps. An
edition's textures load only when it is first used, then stay cached.

| File | hi | lo |
|---|---|---|
| `art/original/sheet_*.png`: back, AS, JK, tuck front | 2048 × 1024 (cells 512 × 1024) | 1024 × 512 |
| `art/winter/sheet_*.png`: back, tuck front, 52 faces | 4096 × 2048 (cells 256 × 512) | 2048 × 2048 (cells 256 × 256) |
| `art/<edition>/tuck_*.png`: the tuck dieline | 1024 × 1024 | 512 × 512 |
| `art/box/half_*.png`, `art/box/brick_*.png`: the brick dielines | 2048 × 1024 | 1024 × 512 |

Card cells hold a 5:7 card stretched to fill the cell (the UVs undo it), with a gutter the UVs skip so mip levels
don't bleed between cells. The Winter phone sheet uses square cells so each card keeps 256 px across rather than 128.

**Tucks and bricks are built from their dielines.** Each face of the 3D box samples its own panel of the dieline
texture (front, back, two sides, lid, tongue, bottom), so one texture and one draw call cover a tuck. The panel
rectangles are in `tools/build_art.py`: the Original's came from the die lines in `Palm Tree Playing Cards Tuck
Box.png`, mapped onto the clean art layer through the back panel's white frame; the Winter's from the die path in
`Box Design.ai`. The lid and tongue hang off the front's top edge, the bottom off the back, as on the dielines.

**The title is an open brick box** (`src/boxes.js`) using the beach art from `uspcc_files/Half Brick Box (1).jpg` and
`Full Brick Box.jpg`, which turned out to be flat dielines rather than renders. The box wears the chosen deck's brick (Winter has its own; the others use the Original's beach brick). Phones get the half brick (6 tucks),
everything else the full brick (12); `?box=half` or `?box=brick` forces one. Each row is an edition and each column a
game; the columns past the games hold spare decks for games still to come. Tap a tuck (or use the Solitaire and
Blackjack buttons, which use the Deck setting): it lifts out, the lid opens and the deck slides out, then the game
starts. Each row's tucks are one `InstancedMesh`, so a full brick is two draw calls for the tucks. On the box the lid
hinges at the back wall so the logo wall faces you; on the dieline it hangs off the logo wall.

**Concept decks (vote only).** `art/source/variants/` holds my deck mockups (almost all AI renders). Only the tuck
exists for these, so they aren't playable: only Original and Winter are. Eight concept tucks stand in the brick's
spare slots, front row first (two fit in the half brick, all eight in the full brick): Spring Edition, Fall Edition,
Midnight Edition, White Ornate, Navy Winter, Summer Edition, Midnight White and Ace of Spades. For each, the build script perspective-warps the tuck front out of one
render (`CONCEPTS` in `tools/build_art.py` lists the corners). Tapping one shows the tuck large with **I'd buy this**;
each tap adds a vote, kept in `localStorage` (`votes` in `palmtree-cards-v1`) on this device only, a demand test for
which deck to print next. (The build still designs a matching back for each, in case one becomes playable.)

**Casino night.** The title is a night room (`src/room.js`): a midnight wall with a gold lattice and rail, a neon
"Palm Tree Casino" sign, marquee bulbs, and my uncut print sheets in gold frames (Original backs, Winter backs,
Winter faces; built into `art/room/`). The Original faces sheet is Daniel Schneider's faces and stays off the wall
until the licence covers digital use. Everything in the room is unlit, so it adds no lights. The title camera sits
lower (64° from straight down) so the tuck fronts read; on wide screens it frames the sign too, and under the menu
on a phone it keeps the box large with the wall behind.

**Music.** The title's Music button opens a small YouTube player (privacy-enhanced embed) playing four of my songs
on a loop: Intergalactic Hip Hop, Heartbreak & Romance and Piano Anatomy (The McMagic Mixtape) and It's a Beautiful
Day, with previous, play/pause, next and the song's title. YouTube's terms want the player visible while it plays, so
it stays in a 240 x 200 panel; closing the panel pauses it. The set list is `MUSIC.tracks` in `src/music.js` (a
YouTube video id each); `?music=<playlist id>` plays any playlist for testing. It needs an internet connection.

The Original print file has two identical black Jokers; both lie in Solitaire's spare top-row column and neither
game deals them. (`uspcc_files/jokers.jpg` is an earlier proof with one red Joker; the print file has none.)

**Everything else is still procedural**: the table, chips and menus use the deck's design-system tokens (lagoon
`#39979f`, midnight `#002a4f`, sunset-gold `#f5c364`, flamingo `#f0909c`, card-white `#fcfcfc`), and the script
lettering is Pacifico, the deck's typeface.

**The other faces in the print file are Daniel Schneider's licensed redraws** (blackroses.cards sells them as print
templates). They stay out of the game until I confirm my licence covers digital use; the build script never reads
pages 3 to 5 or any card on page 2 except the Ace of Spades.

**Faces** follow standard poker-deck conventions, not any particular deck's art: 180° rotational symmetry, corner
indices top-left and bottom-right, standard pip grids with the lower half inverted, a split line on the courts, and
the classic red/black/gold/blue palette on card-white. The procedural Ace of Spades (used only if the real art is missing)
carries the palm-and-sun motif. The printed deck's courts are Daniel Schneider's licensed redraws; they are **not**
copied or traced here. The courts in the game are placeholders.

The renderer is data-driven: every position, size and colour lives in `src/faces.js` (inches on a 2.5 × 3.5 in
card), and `drawFace()` in `src/art.js` only reads it.

**Pip coordinates and sources.** No published USPCC coordinate table turned up. The grid used here is the classic
double-ended layout, with rows in sixtieths of the pip box (0, 10, 15, 20, 30, 40, 45, 50 and 60) and columns at the
left, centre and right. It is taken from [dwiddows/pcpips](https://github.com/dwiddows/pcpips) (`draw_pips.py`, MIT).
Turning the pips below centre upside down gives the standard "7 = five up, two down; 8 = five up, three down"
orientation that the World of Playing Cards
[classification of French-suited numeral designs](https://wopc.co.uk/france/classification-of-numeral-card-designs-in-french-suited-packs)
gives for the modern Anglo-American pattern. Where the pip box sits on the card is our own choice, not a
measurement from a USPCC deck: x 0.75 to 1.75 in, y 0.74 to 2.76 in, pips 0.43 in. Measure a real card and edit
`FACE.pipBox` if it should match one exactly.

### Where real art goes

`art/manifest.json` is written by the build script; edit the script, not the JSON. A new edition is one more entry
in `editions` (and a function in the script that produces it): it gets a row in the brick, a Deck button setting,
and the games pick it up with no other code. An edition entry:

```json
{ "id": "winter", "name": "Winter",
  "sheet": { "files": { "hi": "winter/sheet_hi.png", "lo": "winter/sheet_lo.png" }, "cells": ["back", "tuck", "AS", "..."],
             "layouts": { "hi": { "cell": [256, 512], "gutter": 6, "cols": 16, "rows": 4 }, "lo": { "...": "..." } } },
  "back": "sheet:back", "joker": null, "faces": "sheet", "atlas": null,
  "tuck": { "front": "sheet:tuck", "die": { "files": { "hi": "...", "lo": "..." }, "panels": { "front": [0.1, 0.2, 0.4, 0.8], "...": [] } } } }
```

- A value is `sheet:<cell>`, a file in `art/`, or empty (procedural). A failed load falls back to procedural.
- **`faces`**: an object of single-card overrides (keys rank + suit, `A 2-10 J Q K` + `S H D C`), or `"sheet"` when every
  face is a sheet cell named by its key. Faces not listed come from `atlas`, then procedural.
- **`joker`**: `null` means the edition has none (the set-aside Jokers hide); missing means the procedural Joker.
- **`atlas`** is the slot for a licensed face set (empty until the Schneider licence is confirmed): one image in a
  grid, one row per suit (`suits` order) and one column per rank (`ranks` order; leave it out for all 13), for example
  `{ "file": "faces_atlas.png", "suits": ["S", "H", "D", "C"], "ranks": ["J", "Q", "K"] }`. Each cell is a whole card
  at 5:7, with a few pixels of transparent margin.
- **`tuck.die.panels`**: 0–1 rectangles `[u0, y0, u1, y1]` (top-down) for `front back left right top tongue bottom`.
- Standalone card images are 5:7 portrait (for example 600×840) with transparent rounded corners, because the card
  mesh alpha-tests the texture.

## Files

`src/main.js` scene, camera fitting, input and gamepad · `src/cards.js` card meshes and flip/slide animation ·
`src/art.js` all procedural art · `src/faces.js` face layout data · `src/solitaire.js` · `src/blackjack.js` · `src/audio.js` synthesised sounds ·
`src/store.js` saves · `src/boxes.js` tucks, brick boxes and the title menu · `tools/build_art.py` builds every texture and the manifest.

Rendering only happens while something moves, so an idle table costs almost nothing on a phone.
