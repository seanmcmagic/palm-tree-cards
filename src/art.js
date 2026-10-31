// Procedural art for the deck, drawn on canvas. Colours are the design-system tokens.
// Real art files override these through art/manifest.json (see README).
export const C = {
  lagoon: '#39979f', lagoonDeep: '#2f7c8b', midnight: '#002a4f', gold: '#f5c364',
  flamingo: '#f0909c', white: '#fcfcfc', raised: '#eef6f6', hairline: '#c9dfe1',
  red: '#d23c4f', // pip red: not a token, chosen for legibility on card stock
};
export const FONT = { script: '"Yellowtail", cursive', display: '"Lilita One", sans-serif', body: '"Nunito Sans", sans-serif' };
export const SUITS = ['S', 'H', 'D', 'C'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const CW = 300, CH = 420, CR = 18; // card canvas size and corner radius

export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// Suit shapes in a unit box centred on (0,0), size 1.
export function suitPath(g, s) {
  g.beginPath();
  if (s === 'H') {
    g.moveTo(0, 0.45);
    g.bezierCurveTo(-0.15, 0.3, -0.5, 0.1, -0.5, -0.17);
    g.bezierCurveTo(-0.5, -0.4, -0.25, -0.5, -0.12, -0.45);
    g.bezierCurveTo(-0.05, -0.42, 0, -0.35, 0, -0.3);
    g.bezierCurveTo(0, -0.35, 0.05, -0.42, 0.12, -0.45);
    g.bezierCurveTo(0.25, -0.5, 0.5, -0.4, 0.5, -0.17);
    g.bezierCurveTo(0.5, 0.1, 0.15, 0.3, 0, 0.45);
  } else if (s === 'D') {
    g.moveTo(0, -0.5); g.quadraticCurveTo(0.12, -0.18, 0.4, 0); g.quadraticCurveTo(0.12, 0.18, 0, 0.5);
    g.quadraticCurveTo(-0.12, 0.18, -0.4, 0); g.quadraticCurveTo(-0.12, -0.18, 0, -0.5);
  } else if (s === 'S') {
    g.moveTo(0, -0.5);
    g.bezierCurveTo(-0.15, -0.3, -0.5, -0.12, -0.5, 0.12);
    g.bezierCurveTo(-0.5, 0.32, -0.28, 0.4, -0.1, 0.28);
    g.quadraticCurveTo(-0.12, 0.42, -0.24, 0.5); g.lineTo(0.24, 0.5); g.quadraticCurveTo(0.12, 0.42, 0.1, 0.28);
    g.bezierCurveTo(0.28, 0.4, 0.5, 0.32, 0.5, 0.12);
    g.bezierCurveTo(0.5, -0.12, 0.15, -0.3, 0, -0.5);
  } else {
    g.arc(0, -0.24, 0.22, 0, Math.PI * 2);
    g.moveTo(-0.04, 0.06); g.arc(-0.25, 0.08, 0.22, 0, Math.PI * 2);
    g.moveTo(0.46, 0.08); g.arc(0.25, 0.08, 0.22, 0, Math.PI * 2);
    g.moveTo(-0.08, 0); g.lineTo(0.08, 0); g.quadraticCurveTo(0.1, 0.38, 0.24, 0.5); g.lineTo(-0.24, 0.5);
    g.quadraticCurveTo(-0.1, 0.38, -0.08, 0);
  }
  g.closePath();
}
export function drawSuit(g, s, x, y, size, color, flip = false) {
  g.save(); g.translate(x, y); if (flip) g.rotate(Math.PI); g.scale(size, size);
  suitPath(g, s); g.fillStyle = color; g.fill(); g.restore();
}

// Palm silhouette: base at (x,y), height h, leaning slightly right.
export function drawPalm(g, x, y, h, color) {
  g.save(); g.translate(x, y); g.scale(h / 100, h / 100); g.fillStyle = color;
  g.beginPath(); // trunk
  g.moveTo(-5, 0); g.quadraticCurveTo(-2, -40, 8, -78); g.lineTo(13, -77); g.quadraticCurveTo(5, -40, 5, 0); g.closePath(); g.fill();
  const cx = 10, cy = -80;
  const leaves = [[-170, 44, 18], [-140, 46, 14], [-105, 34, 6], [-70, 36, 6], [-35, 46, 14], [-8, 44, 18], [-120, 26, 2], [-55, 28, 2]];
  for (const [deg, len, droop] of leaves) {
    const a = deg * Math.PI / 180, tx = cx + Math.cos(a) * len, ty = cy + Math.sin(a) * len + droop;
    const mx = (cx + tx) / 2, my = (cy + ty) / 2 - 10, nx = -Math.sin(a) * 7, ny = Math.cos(a) * 7;
    g.beginPath(); g.moveTo(cx, cy);
    g.quadraticCurveTo(mx + nx, my + ny - 4, tx, ty); g.quadraticCurveTo(mx - nx, my - ny + 4, cx, cy); g.fill();
  }
  g.beginPath(); g.arc(cx, cy + 2, 5, 0, Math.PI * 2); g.fill();
  g.restore();
}

function cardBase(g, fill = C.white) {
  g.clearRect(0, 0, CW, CH);
  roundRect(g, 1, 1, CW - 2, CH - 2, CR); g.fillStyle = fill; g.fill();
  g.lineWidth = 2; g.strokeStyle = C.hairline; g.stroke();
}

const PIPS = { // [x, y] in a 0..1 pip box; y > .5 drawn upside down
  1: [[.5, .5]], 2: [[.5, .1], [.5, .9]], 3: [[.5, .1], [.5, .5], [.5, .9]],
  4: [[0, .1], [1, .1], [0, .9], [1, .9]], 5: [[0, .1], [1, .1], [.5, .5], [0, .9], [1, .9]],
  6: [[0, .1], [1, .1], [0, .5], [1, .5], [0, .9], [1, .9]],
  7: [[0, .1], [1, .1], [.5, .3], [0, .5], [1, .5], [0, .9], [1, .9]],
  8: [[0, .1], [1, .1], [.5, .3], [0, .5], [1, .5], [.5, .7], [0, .9], [1, .9]],
  9: [[0, .1], [1, .1], [0, .37], [1, .37], [.5, .5], [0, .63], [1, .63], [0, .9], [1, .9]],
  10: [[0, .1], [1, .1], [.5, .23], [0, .37], [1, .37], [0, .63], [1, .63], [.5, .77], [0, .9], [1, .9]],
};

export function drawFace(suit, rank) {
  const [c, g] = canvas(CW, CH); cardBase(g);
  const col = suit === 'H' || suit === 'D' ? C.red : C.midnight;
  const r = RANKS[rank - 1];
  // indices, top-left and rotated bottom-right
  const index = () => {
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `900 60px ${FONT.body}`;
    if (r === '10') { g.save(); g.translate(36, 64); g.scale(0.7, 1); g.fillText(r, 0, 0); g.restore(); }
    else g.fillText(r, 36, 64);
    drawSuit(g, suit, 36, 94, 38, col);
  };
  index(); g.save(); g.translate(CW, CH); g.rotate(Math.PI); index(); g.restore();

  if (rank === 1) {
    if (suit === 'S') aceOfSpades(g); else drawSuit(g, suit, CW / 2, CH / 2, 110, col);
  } else if (rank <= 10) {
    const bx = 92, bw = CW - 184, by = 66, bh = CH - 132;
    for (const [px, py] of PIPS[rank]) drawSuit(g, suit, bx + px * bw, by + py * bh, 58, col, py > .5);
  } else court(g, suit, r, col);
  return c;
}

// Placeholder for the custom Ace of Spades: palm and sun inside a big spade.
function aceOfSpades(g) {
  g.save(); g.translate(CW / 2, CH / 2 + 4); g.scale(200, 200);
  suitPath(g, 'S'); g.fillStyle = C.midnight; g.fill(); g.clip();
  g.scale(1 / 200, 1 / 200);
  g.beginPath(); g.arc(0, 2, 40, 0, Math.PI * 2); g.fillStyle = C.flamingo; g.fill();
  drawPalm(g, -6, 58, 96, C.gold);
  g.fillStyle = C.gold; g.fillRect(-100, 50, 200, 60);
  g.strokeStyle = C.midnight; g.lineWidth = 3;
  for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = -100; x <= 100; x += 4) g.lineTo(x, 66 + k * 12 + Math.sin(x / 9) * 3); g.stroke(); }
  g.restore();
}

// Placeholder court cards (the real ones are Daniel Schneider's): a mirrored sun panel.
function court(g, suit, r, col) {
  const x = 66, y = 50, w = CW - 132, h = CH - 100;
  roundRect(g, x, y, w, h, 10); g.fillStyle = C.raised; g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke();
  const sun = r === 'K' ? C.gold : r === 'Q' ? C.flamingo : C.lagoon;
  const half = () => {
    g.save(); roundRect(g, x, y, w, h / 2, 10); g.clip();
    g.beginPath(); g.arc(CW / 2, y + h / 2, 92, 0, Math.PI * 2); g.fillStyle = sun; g.fill();
    g.strokeStyle = C.white; g.lineWidth = 4;
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let px = x; px <= x + w; px += 4) g.lineTo(px, y + h / 2 - 14 - k * 13 + Math.sin(px / 10) * 3); g.stroke(); }
    g.fillStyle = C.midnight; g.font = `400 96px ${FONT.display}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(r, CW / 2, y + h / 2 - 34);
    drawSuit(g, suit, x + 26, y + 30, 30, col); drawSuit(g, suit, x + w - 26, y + 30, 30, col);
    g.restore();
  };
  half(); g.save(); g.translate(CW, CH); g.rotate(Math.PI); half(); g.restore();
  g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
}

// Two-way back: swirling sunburst around a gold sun, palm in each half, white border.
export function drawBack() {
  const [c, g] = canvas(CW, CH); cardBase(g);
  const m = 14; g.save(); roundRect(g, m, m, CW - 2 * m, CH - 2 * m, CR - 6); g.clip();
  g.fillStyle = C.midnight; g.fillRect(0, 0, CW, CH);
  const cx = CW / 2, cy = CH / 2, R = 280, N = 20, bands = [C.midnight, C.lagoon, C.midnight, C.flamingo, C.midnight, C.lagoonDeep];
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 0.5) / N * Math.PI * 2, tw = 1.4;
    g.beginPath(); g.moveTo(cx, cy);
    for (let s = 0; s <= 24; s++) { const r = s / 24 * R, a = a0 + tw * Math.sqrt(s / 24); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    for (let s = 24; s >= 0; s--) { const r = s / 24 * R, a = a1 + tw * Math.sqrt(s / 24); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.fillStyle = bands[i % bands.length]; g.fill();
  }
  // make it point-symmetric (two-way): copy the top half rotated onto the bottom
  const [h, hg] = canvas(CW, CH / 2); hg.drawImage(c, 0, 0);
  g.save(); g.translate(CW, CH); g.rotate(Math.PI); g.drawImage(h, 0, 0); g.restore();
  g.beginPath(); g.arc(cx, cy, 62, 0, Math.PI * 2); g.fillStyle = C.flamingo; g.fill();
  g.beginPath(); g.arc(cx, cy, 54, 0, Math.PI * 2); g.fillStyle = C.gold; g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, 54, 0, Math.PI * 2); g.clip();
  drawPalm(g, cx - 6, cy, 48, C.midnight); g.translate(CW, CH); g.rotate(Math.PI); drawPalm(g, cx - 6, cy, 48, C.midnight);
  g.restore();
  g.restore();
  roundRect(g, m + 6, m + 6, CW - 2 * m - 12, CH - 2 * m - 12, CR - 10); g.strokeStyle = C.white; g.lineWidth = 2; g.stroke();
  return c;
}

// Tuck case front.
export function drawTuck() {
  const [c, g] = canvas(CW, CH);
  g.fillStyle = C.midnight; g.fillRect(0, 0, CW, CH);
  g.beginPath(); g.arc(CW / 2, 272, 78, 0, Math.PI * 2); g.fillStyle = C.flamingo; g.fill();
  drawPalm(g, CW / 2 - 14, 338, 170, C.gold);
  g.fillStyle = C.gold; g.fillRect(0, 330, CW, 90);
  g.strokeStyle = C.midnight; g.lineWidth = 4;
  for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = 0; x <= CW; x += 5) g.lineTo(x, 346 + k * 15 + Math.sin(x / 12 + k) * 4); g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = C.gold; g.font = `400 66px ${FONT.script}`; g.fillText('Palm Tree', CW / 2, 74);
  g.fillStyle = C.flamingo; g.font = `400 34px ${FONT.script}`; g.fillText('playing cards', CW / 2, 112);
  g.fillStyle = C.midnight; g.font = `400 40px ${FONT.display}`; g.fillText('2020', CW / 2, 408);
  return c;
}

export function drawTable(size = 1024) {
  const [c, g] = canvas(size, size);
  g.fillStyle = C.lagoon; g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const v = g.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.72);
  v.addColorStop(0, 'rgba(255,255,255,0.06)'); v.addColorStop(1, 'rgba(0,27,51,0.42)');
  g.fillStyle = v; g.fillRect(0, 0, size, size);
  return c;
}

export function drawSlot(kind) { // empty-pile markers
  const [c, g] = canvas(CW, CH);
  roundRect(g, 6, 6, CW - 12, CH - 12, CR); g.lineWidth = 6; g.strokeStyle = 'rgba(252,252,252,0.45)'; g.stroke();
  g.fillStyle = 'rgba(0,42,79,0.12)'; g.fill();
  g.fillStyle = 'rgba(252,252,252,0.5)'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (kind === 'found') { g.font = `400 120px ${FONT.display}`; g.fillText('A', CW / 2, CH / 2 + 6); }
  else if (kind === 'stock') {
    g.lineWidth = 14; g.strokeStyle = 'rgba(252,252,252,0.5)'; g.beginPath(); g.arc(CW / 2, CH / 2, 60, -Math.PI * 0.3, Math.PI * 1.45); g.stroke();
    g.beginPath(); g.moveTo(CW / 2 + 70, CH / 2 - 76); g.lineTo(CW / 2 + 54, CH / 2 - 22); g.lineTo(CW / 2 + 2, CH / 2 - 52); g.fill();
  } else if (kind === 'king') { g.font = `400 120px ${FONT.display}`; g.fillText('K', CW / 2, CH / 2 + 6); }
  return c;
}

export function drawChipTop(color, text, textColor) {
  const [c, g] = canvas(128, 128);
  g.fillStyle = color; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.white;
  for (let i = 0; i < 8; i++) { g.save(); g.translate(64, 64); g.rotate(i / 8 * Math.PI * 2); g.fillRect(-7, -64, 14, 18); g.restore(); }
  g.beginPath(); g.arc(64, 64, 38, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = C.white; g.stroke();
  g.fillStyle = textColor; g.font = `400 ${text.length > 2 ? 30 : 38}px ${FONT.display}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 66);
  return c;
}
