// Klondike: draw 1 or 3, unlimited redeals, undo, hint, click-to-move, drag-and-drop, pad cursor, win cascade.
import * as THREE from 'three';
import { newDeck, shuffle, slotMesh, jokerCard, CARD_W, CARD_H } from './cards.js';
import { canvas, roundRect, C } from './art.js';
import { tween, wait, ease } from './tween.js';

const GAP = 1.1, TOPZ = 0, TABZ = CARD_H + 0.42, LIFT = 0.65;
const colX = (i) => (i - 3) * GAP;

export class Solitaire {
  constructor(app, hud) {
    this.app = app; this.hud = hud; this.root = new THREE.Group(); this.root.visible = false;
    this.cards = newDeck();
    for (const c of this.cards) this.root.add(c.group);
    this.slots = { stock: slotMesh('stock'), found: [0, 1, 2, 3].map(() => slotMesh('found')), tab: [0, 1, 2, 3, 4, 5, 6].map(() => slotMesh('')) };
    this.slots.stock.position.x = colX(0); this.slots.stock.userData.pile = { t: 'stock', i: 0 };
    this.slots.found.forEach((m, i) => { m.position.x = colX(3 + i); m.userData.pile = { t: 'found', i }; });
    this.slots.tab.forEach((m, i) => { m.position.set(colX(i), 0.001, TABZ); m.userData.pile = { t: 'tab', i }; });
    this.root.add(this.slots.stock, ...this.slots.found, ...this.slots.tab);
    // the two Jokers, set aside in the spare top-row column; not pickable, not part of the game
    [[-0.05, 0.08], [0.05, -0.05]].forEach(([dx, yaw], i) => { const j = jokerCard(); j.place(colX(2) + dx, 0.001 + i * 0.0035, TOPZ, yaw); this.root.add(j.group); });
    this.pickables = [...this.cards.flatMap((c) => [c.front, c.back]), this.slots.stock, ...this.slots.found, ...this.slots.tab];
    this.cursor = makeCursor(); this.cursor.visible = false; this.root.add(this.cursor);
    this.cur = { row: 1, col: 0, depth: 0 }; this.held = null; this.padMode = false;
    this.p = null; this.history = []; this.cascade = null; this.busy = false;
    this.el = { moves: hud.querySelector('#solMoves'), time: hud.querySelector('#solTime'), undo: hud.querySelector('#undoBtn'), auto: hud.querySelector('#autoBtn') };
  }

  // ---------- lifecycle ----------
  show() {
    this.root.visible = true;
    if (!this.p) this.newGame(); else this.layout(true);
    this.timer = setInterval(() => this.hudTime(), 1000);
  }
  hide() { this.root.visible = false; clearInterval(this.timer); }
  action(act) {
    if (act === 'menu') this.app.showTitle();
    else if (act === 'new') this.confirmNew();
    else if (act === 'undo') this.undo();
    else if (act === 'hint') this.hint();
    else if (act === 'auto') this.autoFinish();
  }
  confirmNew() {
    if (this.counted && !this.won) this.app.modal('New deal?', '<p>This game counts as a loss.</p>', [{ label: 'Deal', primary: true, run: () => this.newGame() }, { label: 'Keep playing' }]);
    else this.newGame();
  }

  async newGame() {
    const s = this.app.store.sol;
    if (this.counted && !this.won) { s.streak = 0; this.app.save(); }
    this.cascade = null; this.won = false; this.counted = false; this.moves = 0; this.t0 = null; this.history = []; this.held = null;
    this.draw = this.app.store.settings.draw;
    const deck = shuffle([...this.cards]);
    this.p = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []] };
    for (const c of deck) { c.up = false; c.highlight(false); }
    // gather to the stock spot face down, then deal with a stagger
    this.layoutFit();
    deck.forEach((c, i) => { c.setFace(false); c.place(colX(0) + (Math.random() - 0.5) * 0.04, 0.002 + i * 0.004, TOPZ); });
    this.busy = true; this.app.sfx.shuffle();
    let n = 0;
    for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) {
      const c = deck.pop(); this.p.tab[col].push(c); if (col === row) c.up = true;
      this.place(c, { delay: n++ * 55, dur: 300 });
    }
    this.p.stock = deck;
    await wait(n * 55 + 320);
    this.busy = false; this.hudAll(); this.layout();
  }

  // ---------- geometry ----------
  layoutFit() {
    const v = this.app.fit({ x0: colX(0) - 0.58, x1: colX(6) + 0.58, z0: TOPZ - CARD_H / 2 - 0.06, z1: TABZ + CARD_H / 2 + 3.6 }, 'top');
    this.bottom = v.z1 - CARD_H / 2 - 0.08;
  }
  pos(c) { // resting pose for a card from the logical state
    const { p } = this;
    let i = p.stock.indexOf(c); if (i >= 0) return [colX(0), 0.002 + i * 0.004, TOPZ];
    i = p.waste.indexOf(c);
    if (i >= 0) { const fan = this.draw === 3 ? Math.max(0, i - (p.waste.length - 3)) : 0; return [colX(1) + fan * 0.3, 0.002 + i * 0.004, TOPZ]; }
    for (let f = 0; f < 4; f++) { i = p.found[f].indexOf(c); if (i >= 0) return [colX(3 + f), 0.002 + i * 0.004, TOPZ]; }
    for (let t = 0; t < 7; t++) {
      const col = p.tab[t]; i = col.indexOf(c); if (i < 0) continue;
      const g = this.gaps(col); let z = TABZ; for (let k = 0; k < i; k++) z += col[k].up ? g.up : g.down;
      return [colX(t), 0.01 + i * 0.008, z];
    }
    return [0, 0, 0];
  }
  gaps(col) {
    let up = 0.4, down = 0.22, nu = 0, nd = 0;
    for (let k = 0; k < col.length - 1; k++) col[k].up ? nu++ : nd++;
    const avail = Math.max(1, (this.bottom ?? 8) - TABZ), need = nu * up + nd * down;
    if (need > avail) { const s = avail / need; up = Math.max(0.15, up * s); down = Math.max(0.07, down * s); }
    return { up, down };
  }
  place(c, opts = {}) { const [x, y, z] = this.pos(c); return c.moveTo(x, y, z, { faceUp: c.up, ...opts }); }
  layout(instant = false) {
    if (instant) this.layoutFit();
    if (!this.p || this.cascade) return;
    for (const c of this.cards) {
      const [x, y, z] = this.pos(c), g = c.group.position;
      if (instant) { c.place(x, y, z); c.setFace(c.up); }
      else if (Math.abs(g.x - x) + Math.abs(g.y - y) + Math.abs(g.z - z) > 0.001 || c.faceUp !== c.up) c.moveTo(x, y, z, { faceUp: c.up, sound: false });
    }
    this.updateCursor(); this.hudAll(); this.app.dirty();
  }

  // ---------- rules ----------
  pileOf(c) {
    const { p } = this;
    if (p.stock.includes(c)) return { t: 'stock', i: 0 };
    if (p.waste.includes(c)) return { t: 'waste', i: 0 };
    for (let i = 0; i < 4; i++) if (p.found[i].includes(c)) return { t: 'found', i };
    for (let i = 0; i < 7; i++) if (p.tab[i].includes(c)) return { t: 'tab', i };
  }
  arr(ref) { return ref.t === 'stock' ? this.p.stock : ref.t === 'waste' ? this.p.waste : ref.t === 'found' ? this.p.found[ref.i] : this.p.tab[ref.i]; }
  canFound(c, f) { const top = this.p.found[f].at(-1); return top ? top.suit === c.suit && c.rank === top.rank + 1 : c.rank === 1; }
  canTab(c, t) { const top = this.p.tab[t].at(-1); return top ? top.up && top.color !== c.color && top.rank === c.rank + 1 : c.rank === 13; }
  legal(from, k, to) {
    const src = this.arr(from), c = src[k];
    if (!c || !c.up || (from.t === to.t && from.i === to.i)) return false;
    if (to.t === 'found') return k === src.length - 1 && this.canFound(c, to.i);
    if (to.t === 'tab') return (from.t === 'tab' || k === src.length - 1) && this.canTab(c, to.i);
    return false;
  }
  snapshot() {
    const p = this.p;
    this.history.push({ stock: [...p.stock], waste: [...p.waste], found: p.found.map((a) => [...a]), tab: p.tab.map((a) => [...a]), up: this.cards.map((c) => c.up), moves: this.moves });
    if (this.history.length > 300) this.history.shift();
  }
  undo() {
    const h = this.history.pop(); if (!h || this.busy) { if (h) this.history.push(h); return; }
    this.p = { stock: h.stock, waste: h.waste, found: h.found, tab: h.tab };
    this.cards.forEach((c, i) => (c.up = h.up[i])); this.moves = h.moves; this.held = null;
    this.app.sfx.slide(); this.layout();
  }
  firstMove() {
    if (!this.t0) this.t0 = performance.now();
    if (!this.counted) { this.counted = true; this.app.store.sol.played++; this.app.save(); }
  }
  move(from, k, to) {
    if (!this.legal(from, k, to)) return false;
    this.snapshot(); this.firstMove();
    const src = this.arr(from), run = src.splice(k), dst = this.arr(to);
    dst.push(...run);
    const top = src.at(-1); if (from.t === 'tab' && top && !top.up) top.up = true;
    this.moves++;
    run.forEach((c, j) => this.place(c, { delay: j * 25, dur: 240, sound: j === 0 }));
    if (top) this.place(top, { delay: 120 });
    if (to.t === 'found') this.app.sfx.place(0.2);
    this.afterMove(); return true;
  }
  drawStock() {
    const { p } = this; if (this.busy) return;
    if (!p.stock.length && !p.waste.length) return;
    this.snapshot(); this.firstMove(); this.moves++;
    if (!p.stock.length) { // redeal
      p.stock = p.waste.reverse(); p.waste = []; for (const c of p.stock) c.up = false;
      p.stock.forEach((c, i) => this.place(c, { delay: i * 6, dur: 260, sound: i === 0 }));
    } else {
      const n = Math.min(this.draw, p.stock.length);
      for (let j = 0; j < n; j++) { const c = p.stock.pop(); c.up = true; p.waste.push(c); }
      p.waste.forEach((c, i) => this.place(c, { delay: Math.max(0, i - (p.waste.length - n)) * 70, dur: 300 }));
    }
    this.afterMove();
  }
  afterMove() {
    this.app.dirty(); this.hudAll(); this.updateCursor();
    if (this.p.found.every((f) => f.length === 13)) return this.win();
    if (this.canAutoFinish()) { this.el.auto.hidden = false; clearTimeout(this._af); this._af = setTimeout(() => this.autoFinish(), 700); return; }
    if (this.stuck()) {
      clearTimeout(this._st);
      this._st = setTimeout(() => this.stuck() && !this.won && this.app.modal('No more moves', '<p>Nothing left to play from here.</p>', [
        { label: 'Undo', run: () => this.undo() }, { label: 'New deal', primary: true, run: () => this.newGame() }]), 500);
    }
  }
  canAutoFinish() { const p = this.p; return !p.stock.length && !p.waste.length && p.tab.every((t) => t.every((c) => c.up)) && !this.won; }

  // Moves that make progress (no shuffling runs back and forth), used by hint and the stuck check.
  usefulMoves() {
    const out = [], p = this.p, W = { t: 'waste', i: 0 };
    if (p.waste.length) {
      const k = p.waste.length - 1;
      for (let f = 0; f < 4; f++) if (this.legal(W, k, { t: 'found', i: f })) out.push([W, k, { t: 'found', i: f }]);
      for (let t = 0; t < 7; t++) if (this.legal(W, k, { t: 'tab', i: t })) out.push([W, k, { t: 'tab', i: t }]);
    }
    for (let t = 0; t < 7; t++) {
      const col = p.tab[t], from = { t: 'tab', i: t };
      if (!col.length) continue;
      for (let f = 0; f < 4; f++) if (this.legal(from, col.length - 1, { t: 'found', i: f })) out.push([from, col.length - 1, { t: 'found', i: f }]);
      for (let k = col.findIndex((c) => c.up); k >= 0 && k < col.length; k++) {
        const below = col[k - 1];
        const useful = k === 0 ? false : !below.up || [0, 1, 2, 3].some((f) => this.canFound(below, f));
        for (let d = 0; d < 7; d++) {
          if (d === t || !this.legal(from, k, { t: 'tab', i: d })) continue;
          if (useful || (k === 0 && p.tab[d].length)) out.push([from, k, { t: 'tab', i: d }]);
        }
      }
    }
    return out;
  }
  stockPlayable() {
    const p = this.p, emptyCol = p.tab.some((t) => !t.length);
    return [...p.stock, ...p.waste].some((c) => [0, 1, 2, 3].some((f) => this.canFound(c, f)) ||
      p.tab.some((t, i) => t.length && this.canTab(c, i)) || (c.rank === 13 && emptyCol));
  }
  stuck() { return !this.won && !this.usefulMoves().length && !this.stockPlayable(); }

  async hint() {
    const m = this.usefulMoves()[0];
    if (m) {
      const [from, k, to] = m, cards = this.arr(from).slice(k), dst = this.arr(to).at(-1);
      [...cards, dst].forEach((c) => c?.highlight(true)); this.app.dirty();
      await wait(900); [...cards, dst].forEach((c) => c?.highlight(false)); this.app.dirty();
    } else if (this.p.stock.length || this.p.waste.length) {
      this.app.toast(this.p.stock.length ? 'Draw from the stock' : 'Turn the waste back over');
    } else this.app.toast('No moves left');
  }
  smartMove(from, k) {
    const src = this.arr(from), c = src[k];
    if (!c?.up) return false;
    if (k === src.length - 1) for (let f = 0; f < 4; f++) if (this.move(from, k, { t: 'found', i: f })) return true;
    const order = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => Math.abs(a - (from.i ?? 1)) - Math.abs(b - (from.i ?? 1)));
    for (const t of order) if (this.p.tab[t].length && this.move(from, k, { t: 'tab', i: t })) return true;
    if (!(c.rank === 13 && from.t === 'tab' && k === 0)) for (const t of order) if (!this.p.tab[t].length && this.move(from, k, { t: 'tab', i: t })) return true;
    this.reject(src.slice(k)); return false;
  }
  reject(cards) {
    this.app.sfx.bad();
    for (const c of cards) {
      const x0 = c.group.position.x;
      tween({ dur: 320, e: ease.linear, update: (k) => { c.group.position.x = x0 + Math.sin(k * Math.PI * 4) * 0.06 * (1 - k); } });
    }
  }
  async autoFinish() {
    if (this.busy || !this.canAutoFinish()) return;
    this.busy = true; this.el.auto.hidden = true; this.history = [];
    for (;;) {
      let best = null;
      for (let t = 0; t < 7; t++) {
        const c = this.p.tab[t].at(-1); if (!c) continue;
        for (let f = 0; f < 4; f++) if (this.canFound(c, f) && (!best || c.rank < best[0].rank)) best = [c, t, f];
      }
      if (!best) break;
      const [c, t, f] = best; this.p.tab[t].pop(); this.p.found[f].push(c); this.moves++;
      this.place(c, { dur: 260 }); this.hudAll(); this.app.dirty(); await wait(85);
    }
    await wait(250); this.busy = false;
    if (this.p.found.every((f) => f.length === 13)) this.win();
  }

  // ---------- win ----------
  win() {
    if (this.won) return; this.won = true; this.held = null; this.cursor.visible = false;
    const s = this.app.store.sol, secs = Math.round((performance.now() - (this.t0 ?? performance.now())) / 1000);
    s.won++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
    const fastest = s.bestTime == null || secs < s.bestTime, fewest = s.bestMoves == null || this.moves < s.bestMoves;
    if (fastest) s.bestTime = secs; if (fewest) s.bestMoves = this.moves;
    this.app.save(); this.app.sfx.win(); this.el.auto.hidden = true; this.hudAll();
    // cascade: cards leap off the foundations, bounce across the table and spin away
    const order = []; for (let r = 12; r >= 0; r--) for (let f = 0; f < 4; f++) order.push(this.p.found[f][r]);
    this.cascade = { t: 0, next: 0, order, live: [] };
    this.winInfo = { secs, fastest, fewest };
  }
  update(dt) {
    const k = this.cascade; if (!k) return false;
    k.t += dt;
    while (k.next < k.order.length && k.t > k.next * 0.075) {
      const c = k.order[k.next++], side = Math.random() < 0.5 ? -1 : 1;
      k.live.push({ c, v: new THREE.Vector3(side * (2 + Math.random() * 3), 5 + Math.random() * 3, 2 + Math.random() * 3), spin: (Math.random() - 0.5) * 9 });
      if (k.next % 4 === 0) this.app.sfx.slide();
    }
    for (const L of k.live) {
      const p = L.c.group.position; L.v.y -= 22 * dt; p.addScaledVector(L.v, dt);
      if (p.y < 0.02 && L.v.y < 0) { p.y = 0.02; L.v.y *= -0.58; L.v.x *= 0.9; L.v.z *= 0.9; }
      L.c.group.rotation.y += L.spin * dt; L.c.flipper.rotation.x = Math.sin(k.t * 3 + L.spin) * 0.15;
    }
    if (k.t > k.order.length * 0.075 + 1.8 && !k.done) {
      k.done = true;
      const { secs, fastest, fewest } = this.winInfo, mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      this.app.modal('You won!', `<p><b>${mm}</b> · <b>${this.moves}</b> moves${fastest ? '<br>Fastest win yet.' : ''}${fewest && !fastest ? '<br>Fewest moves yet.' : ''}<br>Streak: ${this.app.store.sol.streak}</p>`,
        [{ label: 'Deal again', primary: true, run: () => { this.resetCascade(); this.newGame(); } }, { label: 'Menu', run: () => { this.resetCascade(); this.p = null; this.app.showTitle(); } }]);
    }
    return true;
  }
  resetCascade() { this.cascade = null; for (const c of this.cards) c.flipper.rotation.x = 0; }

  // ---------- pointer ----------
  hit(e) {
    const h = this.app.pick(e.clientX, e.clientY, this.pickables); if (!h) return null;
    if (h.object.userData.pile) return { pile: h.object.userData.pile, k: -1 };
    const c = h.object.userData.card, pile = this.pileOf(c); return { pile, k: this.arr(pile).indexOf(c), c };
  }
  pointerDown(e) {
    if (this.busy || this.cascade || this.drag) return;
    this.padMode = false; this.cursor.visible = false; this.clearHeld();
    const h = this.hit(e); if (!h) return;
    this.down = { ...h, x: e.clientX, y: e.clientY, id: e.pointerId };
  }
  pointerMove(e) {
    const d = this.down; if (!d || e.pointerId !== d.id) return;
    if (!this.drag) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      const src = d.k >= 0 ? this.arr(d.pile) : null, c = src?.[d.k];
      if (!c?.up || d.pile.t === 'stock' || (d.pile.t !== 'tab' && d.k !== src.length - 1)) { this.down = null; return; }
      const run = src.slice(d.k), g = this.app.ground(e.clientX, e.clientY, LIFT);
      this.drag = { run, off: new THREE.Vector3().subVectors(c.group.position, g).setY(0), gap: d.pile.t === 'tab' ? this.gaps(src).up : 0 };
      this.drag.off.z = Math.max(-0.5, Math.min(0.5, this.drag.off.z)); this.drag.off.x = Math.max(-0.45, Math.min(0.45, this.drag.off.x));
      this.app.sfx.slide();
    }
    const g = this.app.ground(e.clientX, e.clientY, LIFT), { run, off } = this.drag;
    run.forEach((c, j) => { c._token = null; c.group.position.set(g.x + off.x, LIFT + j * 0.01, g.z + off.z + j * Math.max(0.3, this.drag.gap)); });
    this.app.dirty();
  }
  pointerUp(e, cancel) {
    const d = this.down; this.down = null; if (!d) return;
    if (this.drag) {
      const { run } = this.drag; this.drag = null;
      const lead = run[0].group.position, from = d.pile;
      const cands = [];
      for (let f = 0; f < 4; f++) cands.push([{ t: 'found', i: f }, Math.hypot(lead.x - colX(3 + f), lead.z - TOPZ)]);
      for (let t = 0; t < 7; t++) {
        const col = this.p.tab[t], top = col.at(-1), [, , tz] = top ? this.pos(top) : [0, 0, TABZ];
        if (Math.abs(lead.x - colX(t)) < 0.8 && lead.z > TABZ - 1.1) cands.push([{ t: 'tab', i: t }, Math.hypot(lead.x - colX(t), Math.max(0, lead.z - tz - 0.4))]);
      }
      cands.sort((a, b) => a[1] - b[1]);
      const ok = !cancel && cands.some(([to, dist]) => dist < 1.3 && this.move(from, d.k, to));
      if (!ok) { this.layout(); this.app.sfx.place(); }
      return;
    }
    // a tap
    if (d.pile.t === 'stock') return this.drawStock();
    if (d.k >= 0) this.smartMove(d.pile, d.k);
  }

  // ---------- gamepad / keyboard ----------
  rowCols(row) { return row === 0 ? [0, 1, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6]; }
  curPile() {
    const { row, col } = this.cur;
    if (row === 0) return col === 0 ? { t: 'stock', i: 0 } : col === 1 ? { t: 'waste', i: 0 } : { t: 'found', i: col - 3 };
    return { t: 'tab', i: col };
  }
  curIndex() {
    const pile = this.curPile(), a = this.arr(pile);
    if (pile.t !== 'tab') return a.length - 1;
    const firstUp = a.findIndex((c) => c.up); if (firstUp < 0) return a.length - 1;
    return Math.max(firstUp, a.length - 1 - this.cur.depth);
  }
  pad(a) {
    if (this.cascade || this.busy) return a !== 'start';
    if (a === 'start') return false;
    this.padMode = true;
    const cur = this.cur, cols = this.rowCols(cur.row);
    if (a === 'left' || a === 'right') {
      const i = cols.indexOf(cur.col) + (a === 'left' ? -1 : 1); cur.col = cols[(i + cols.length) % cols.length]; cur.depth = 0;
    } else if (a === 'up') {
      const pile = this.arr(this.curPile()), firstUp = pile.findIndex((c) => c.up);
      if (cur.row === 1 && firstUp >= 0 && pile.length - 1 - cur.depth > firstUp) cur.depth++;
      else if (cur.row === 1) { cur.row = 0; if (cur.col === 2) cur.col = 1; cur.depth = 0; }
    } else if (a === 'down') {
      if (cur.row === 1 && cur.depth > 0) cur.depth--; else if (cur.row === 0) cur.row = 1;
    } else if (a === 'a') {
      const pile = this.curPile();
      if (this.held) {
        const { pile: from, k } = this.held; this.clearHeld();
        if (from.t === pile.t && from.i === pile.i) this.smartMove(from, k);
        else if (!this.move(from, k, pile)) this.reject(this.arr(from).slice(k));
      } else if (pile.t === 'stock') this.drawStock();
      else {
        const k = this.curIndex(), c = this.arr(pile)[k];
        if (c?.up) { this.held = { pile, k }; this.arr(pile).slice(k).forEach((x) => x.highlight(true)); this.app.sfx.tap(); }
      }
    } else if (a === 'x') { const pile = this.curPile(); if (pile.t === 'stock') this.drawStock(); else this.smartMove(pile, this.curIndex()); this.clearHeld(); }
    else if (a === 'y') this.drawStock();
    else if (a === 'b') this.clearHeld();
    else if (a === 'lb') this.undo();
    else if (a === 'rb') this.hint();
    else if (a === 'select') this.confirmNew();
    else return false;
    this.updateCursor(); return true;
  }
  clearHeld() { if (this.held) { this.arr(this.held.pile).forEach((c) => c.highlight(false)); this.held = null; this.app.dirty(); } }
  updateCursor() {
    if (!this.padMode || !this.p || this.won) { this.cursor.visible = false; return; }
    const pile = this.curPile(), a = this.arr(pile), k = this.curIndex(), c = a[k];
    let [x, y, z] = c ? this.pos(c) : pile.t === 'tab' ? [colX(pile.i), 0, TABZ] : pile.t === 'found' ? [colX(3 + pile.i), 0, TOPZ] : [colX(pile.t === 'stock' ? 0 : 1), 0, TOPZ];
    this.cursor.visible = true; this.cursor.position.set(x, y + 0.004, z); this.app.dirty();
  }

  // ---------- hud ----------
  hudTime() {
    if (!this.t0 || this.won) return;
    const s = Math.floor((performance.now() - this.t0) / 1000); this.el.time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  hudAll() {
    this.el.moves.textContent = this.moves ?? 0; this.el.undo.disabled = !this.history.length || this.won;
    if (!this.t0) this.el.time.textContent = '0:00';
    if (this.p && !this.canAutoFinish()) this.el.auto.hidden = true;
  }
}

function makeCursor() {
  const [c, g] = canvas(340, 460); roundRect(g, 8, 8, 324, 444, 26); g.lineWidth = 12; g.strokeStyle = C.gold; g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.13, CARD_H * 1.1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.renderOrder = 5; return m;
}
