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
| Menus | tap | arrows, Enter, Esc | D-pad or left stick, A, B |
| Solitaire: move a card | drag it, or tap it to send it to the best spot | arrows to aim, Enter to pick up then drop; X sends it | D-pad aims (up goes deeper into a column), A picks up / drops, X sends it to the best spot |
| Solitaire: draw | tap the stock | W or D | Y |
| Undo / hint / new deal | buttons | Z / H / — | LB / RB / Back |
| Blackjack | chip, Deal, Hit, Stand, Double buttons | arrows + Enter; S stand, W double | D-pad + A; X stand (bet phase: clear), Y double (bet phase: deal), LB/RB bet −/+5 |
| Back to menu | Menu button | M | Start |

## Rules

- **Solitaire:** Klondike, draw 1 or draw 3 (toggle on the title screen, applies from the next deal), unlimited
  redeals. Undo goes back up to 300 moves. When the stock and waste are empty and every card is face up, it finishes
  itself. A "No more moves" check offers undo or a new deal. Abandoning a started game counts as a loss.
- **Blackjack:** 4-deck shoe, reshuffled when 52 cards remain. Dealer stands on all 17s and peeks on an ace or a ten.
  Blackjack pays 3:2, double on the first two cards. No split and no insurance (yet). Start with 500 chips; go broke
  and you can rebuy 500 (counted in stats). A reload mid-hand refunds the bet.

Stats, settings and the bankroll are saved in `localStorage` (`palmtree-cards-v1`). The title screen's Stats button
shows them and can reset them.

## The art, and where my real files go

Everything is drawn procedurally on canvas. The table, tuck, back, chips and menus use the deck's design-system
tokens (lagoon `#39979f`, midnight `#002a4f`, sunset-gold `#f5c364`, flamingo `#f0909c`, card-white `#fcfcfc`).
The script lettering is Pacifico, the deck's typeface.

**Faces** follow standard poker-deck conventions, not any particular deck's art: 180° rotational symmetry, corner
indices top-left and bottom-right, standard pip grids with the lower half inverted, a split line on the courts, and
the classic red/black/gold/blue palette on card-white. The Ace of Spades carries the palm-and-sun motif. The printed
deck's courts are Daniel Schneider's licensed redraws; they are **not** copied or traced here. The courts in the
game are placeholders.

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

Put the files in `art/` and list them in `art/manifest.json`. Priority runs per-card `faces` first, then `atlas`,
then procedural:

```json
{
  "back": "back.png",
  "atlas": { "file": "faces_atlas.png", "suits": ["S", "H", "D", "C"], "ranks": ["J", "Q", "K"] },
  "faces": { "AS": "ace_of_spades.png" }
}
```

- **`atlas`** is the slot for a licensed face set: one image in a grid, with one row per suit (in `suits` order) and
  one column per rank (in `ranks` order; leave it out for all 13). Each cell is a whole card at 5:7. Give cells a few
  pixels of transparent margin so mipmaps don't bleed into the neighbouring card.
- **`faces`** overrides single cards. Keys are rank + suit (`A 2-10 J Q K` + `S H D C`).
- All images are 5:7 portrait (for example 600×840 per card) with transparent rounded corners, because the card mesh
  alpha-tests the texture.

## Files

`src/main.js` scene, camera fitting, input and gamepad · `src/cards.js` card meshes and flip/slide animation ·
`src/art.js` all procedural art · `src/faces.js` face layout data · `src/solitaire.js` · `src/blackjack.js` · `src/audio.js` synthesised sounds ·
`src/store.js` saves.

Rendering only happens while something moves, so an idle table costs almost nothing on a phone.
