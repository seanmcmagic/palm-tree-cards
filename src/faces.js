// Face layout data for a 2.5 x 3.5 in poker card. drawFace() in art.js reads only this, so layout changes are data edits.
//
// Pip grid: rows are in sixtieths of the pip box measured from its TOP, columns are fractions of its width. The row
// values (0, 10, 15, 20, 30, 40, 45, 50, 60) are the classic double-ended grid as tabulated in dwiddows/pcpips
// (draw_pips.py, MIT), converted from its bottom-up convention. Pips below the box centre are drawn inverted,
// which gives the standard "7 = five up, two down; 8 = five up, three down" orientation (World of Playing Cards,
// "Classification of Numeral Card Designs in French-suited packs").
// The pip box itself (where those fractions land on the card) is our own choice, not measured from a USPCC deck.

export const CARD_IN = { w: 2.5, h: 3.5 };

// Standard palette on card-white. Gold is the system's sunset-gold; the rest are the classic court colours.
export const PALETTE = { red: '#c8102e', black: '#141414', gold: '#f5c364', blue: '#1f4e9c', white: '#fcfcfc', hairline: '#c9dfe1' };
export const SUIT_INK = { S: 'black', C: 'black', H: 'red', D: 'red' };

export const FACE = {
  corner: { x: 0.3, rankBaseline: 0.533, rankSize: 0.5, tenSqueeze: 0.7, suitY: 0.783, suitSize: 0.317 },
  pipBox: { x0: 0.75, x1: 1.75, y0: 0.74, y1: 2.76 }, // inches from the top-left corner
  pipSize: 0.43,
  aceSize: 1.0,
  court: { inset: { x: 0.55, y: 0.42 }, radius: 0.08, line: 0.035, letterSize: 0.8, pipSize: 0.25 },
};

const L = 0, M = 0.5, R = 1; // columns
export const PIP_GRID = { // [column, row in 60ths from the top]
  1: [[M, 30]],
  2: [[M, 0], [M, 60]],
  3: [[M, 0], [M, 30], [M, 60]],
  4: [[L, 0], [R, 0], [L, 60], [R, 60]],
  5: [[L, 0], [R, 0], [M, 30], [L, 60], [R, 60]],
  6: [[L, 0], [R, 0], [L, 30], [R, 30], [L, 60], [R, 60]],
  7: [[L, 0], [R, 0], [M, 15], [L, 30], [R, 30], [L, 60], [R, 60]],
  8: [[L, 0], [R, 0], [M, 15], [L, 30], [R, 30], [M, 45], [L, 60], [R, 60]],
  9: [[L, 0], [R, 0], [L, 20], [R, 20], [M, 30], [L, 40], [R, 40], [L, 60], [R, 60]],
  10: [[L, 0], [R, 0], [M, 10], [L, 20], [R, 20], [L, 40], [R, 40], [M, 50], [L, 60], [R, 60]],
};

// Court placeholders (not Schneider's art): each rank's colour blocking, mirrored through the split line.
export const COURTS = {
  K: { band: 'gold', robe: 'blue', trim: 'red' },
  Q: { band: 'gold', robe: 'red', trim: 'blue' },
  J: { band: 'blue', robe: 'gold', trim: 'red' },
};
