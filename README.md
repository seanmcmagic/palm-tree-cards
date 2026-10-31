# Palm Tree Cards

A small three.js card table using my own deck, Palm Tree Playing Cards (Kickstarter 2020, USPCC). It plays
**Klondike Solitaire** and **Blackjack** (one player against the dealer), picked from the title menu.

## Run it

```
node serve.mjs            # http://localhost:8160
```

The server binds to `0.0.0.0`, so the phone and tablet can open `http://<this PC's LAN IP>:8160` on the same Wi-Fi.
It needs `http://`; opening `index.html` as a file will not load the ES modules. three.js r186.1 is vendored in
`vendor/three/`, so nothing is fetched except the Google Fonts (Yellowtail, Lilita One, Nunito Sans). Offline, the
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

Everything is drawn procedurally on canvas from the deck's design-system tokens (lagoon `#39979f`, midnight
`#002a4f`, sunset-gold `#f5c364`, flamingo `#f0909c`, card-white `#fcfcfc`). Pip red (`#d23c4f`) is not a token; it
was chosen for legibility. The court cards and the Ace of Spades are **placeholders**, not Daniel Schneider's faces or
the real custom ace.

To use the real art, put PNGs in `art/` and list them in `art/manifest.json`:

```json
{
  "back": "back.png",
  "faces": { "AS": "ace_of_spades.png", "KH": "king_of_hearts.png", "QH": "queen_of_hearts.png" }
}
```

Keys are rank + suit (`A 2-10 J Q K` + `S H D C`). Images should be 5:7 portrait (for example 600×840) with
transparent rounded corners, since the card mesh alpha-tests the texture. Anything not listed stays procedural.

## Files

`src/main.js` scene, camera fitting, input and gamepad · `src/cards.js` card meshes and flip/slide animation ·
`src/art.js` all procedural art · `src/solitaire.js` · `src/blackjack.js` · `src/audio.js` synthesised sounds ·
`src/store.js` saves.

Rendering only happens while something moves, so an idle table costs almost nothing on a phone.
