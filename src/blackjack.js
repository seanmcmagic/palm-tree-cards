// Blackjack, one player against the dealer: 4-deck shoe, dealer stands on all 17s, blackjack pays 3:2,
// dealer peeks on ace or ten, double on the first two cards. Chip bankroll persists in localStorage.
import * as THREE from 'three';
import { Card, CARD_H, tuckTexture, onEdition } from './cards.js';
import { SUITS, C, FONT, canvas, drawChipTop } from './art.js';
import { tween, wait, ease } from './tween.js';

const DECKS = 4, CUT = 52, SHOE = new THREE.Vector3(3.3, 0, -2.5), DISCARD = new THREE.Vector3(-3.3, 0, -2.5);
const DZ = -1.6, PZ = 1.2, BET = new THREE.Vector3(0, 0, 2.95);
const CHIPS = [
  { v: 500, color: C.gold, text: C.midnight }, { v: 100, color: C.midnight, text: C.gold },
  { v: 25, color: C.lagoonDeep, text: C.white }, { v: 5, color: C.flamingo, text: C.midnight },
];
const chipMats = new Map();
function chipMesh(v) {
  const d = CHIPS.find((c) => c.v === v);
  if (!chipMats.has(v)) {
    const t = new THREE.CanvasTexture(drawChipTop(d.color, String(v), d.text)); t.colorSpace = THREE.SRGBColorSpace;
    const side = new THREE.MeshLambertMaterial({ color: d.color }), top = new THREE.MeshLambertMaterial({ map: t });
    chipMats.set(v, [side, top, side]);
  }
  const m = new THREE.Mesh(chipGeo, chipMats.get(v)); m.castShadow = m.receiveShadow = true; m.userData.v = v; return m;
}
const chipGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.07, 32);
const breakdown = (n) => { const out = []; for (const { v } of CHIPS) while (n >= v) { out.push(v); n -= v; } return out; };
const money = (n) => (Math.round(n * 2) / 2).toLocaleString();

export function total(hand) {
  let t = 0, aces = 0;
  for (const c of hand) { t += c.rank === 1 ? 11 : Math.min(10, c.rank); if (c.rank === 1) aces++; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { t, soft: aces > 0 };
}
const isBJ = (h) => h.length === 2 && total(h).t === 21;

export class Blackjack {
  constructor(app, hud) {
    this.app = app; this.hud = hud; this.root = new THREE.Group(); this.root.visible = false;
    const q = (s) => hud.querySelector(s);
    this.el = { bank: q('#bjBank'), bet: q('#bjBet'), shoe: q('#bjShoe'), betBar: q('#bjBetBar'), playBar: q('#bjPlayBar'), brokeBar: q('#bjBrokeBar'),
      banner: q('#bjBanner'), deal: q('#dealBtn'), dbl: q('#doubleBtn') };
    this.buildTable();
    this.shoe = []; this.discard = []; this.player = []; this.dealer = []; this.holeHidden = false;
    this.phase = 'bet'; this.bet = 0; this.lastBet = 25; this.betChips = []; this.newShoe(true);
  }

  buildTable() {
    const side = new THREE.MeshLambertMaterial({ color: C.midnight });
    const top = new THREE.MeshLambertMaterial({ map: tuckTexture() });
    onEdition(() => { top.map = tuckTexture(); top.needsUpdate = true; }); // the shoe wears the current deck's tuck
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.6, 1.7), [side, side, top, side, side, side]);
    shoe.position.set(SHOE.x, 0.3, SHOE.z); shoe.rotation.y = 0.25; shoe.castShadow = shoe.receiveShadow = true; this.root.add(shoe); this.shoeMesh = shoe;
    // printed felt: the house rules between the hands, a ring for the bet
    const print = (w, h, draw, x, z) => {
      const [c, g] = canvas(w * 200, h * 200); g.textAlign = 'center'; g.textBaseline = 'middle'; draw(g, c);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false }));
      m.position.set(x, 0.0015, z); m.receiveShadow = true; this.root.add(m);
    };
    print(5, 0.8, (g) => {
      g.fillStyle = 'rgba(245,195,100,0.9)'; g.font = `400 64px ${FONT.script}`; g.fillText('Blackjack pays 3 to 2', 500, 55);
      g.fillStyle = 'rgba(252,252,252,0.6)'; g.font = `700 28px ${FONT.body}`; g.fillText('DEALER STANDS ON ALL 17s', 500, 122);
    }, 0, (DZ + PZ) / 2 - 0.05);
    print(1.2, 1.2, (g) => { g.strokeStyle = 'rgba(252,252,252,0.55)'; g.lineWidth = 9; g.beginPath(); g.arc(120, 120, 108, 0, Math.PI * 2); g.stroke(); }, BET.x, BET.z);
  }

  // ---------- lifecycle ----------
  show() {
    this.root.visible = true; this.bank = this.app.store.bj.bank;
    if (this.phase === 'bet' && !this.bet) this.setBet(Math.min(this.lastBet, this.bank - (this.bank % 5)));
    this.layout(true); this.hudAll();
  }
  hide() { this.root.visible = false; }
  layout() { // portrait screens tuck the shoe and discard in above the dealer so the hands can be bigger
    const tall = innerWidth / innerHeight < 0.8, short = innerWidth > innerHeight && innerHeight < 560;
    SHOE.set(tall ? 1.9 : 3.3, 0, tall ? -3.6 : short ? -1.9 : -2.5); DISCARD.set(tall ? -1.9 : -3.3, 0, SHOE.z);
    this.shoeMesh.position.set(SHOE.x, 0.3, SHOE.z);
    this.discard.forEach((c, i) => c.place(DISCARD.x, 0.004 + i * 0.004, DISCARD.z, c.group.rotation.y));
    // A short landscape phone has its buttons in a column at the right (style.css): the table uses the full height,
    // framed from the dealer's total down to the bet ring, with the shoe moved down beside the dealer.
    const rect = tall ? { x0: -2.65, x1: 2.65, z0: -4.5, z1: 3.6 } : short ? { x0: -4.1, x1: 4.1, z0: -3.15, z1: 3.4 } : { x0: -4.1, x1: 4.1, z0: -3.45, z1: 3.6 };
    this.app.fit(rect, 'center', short ? { top: 54, bottom: 4 } : {});
    this.labels();
  }
  update() { return false; }
  action(act, btn) {
    this.app.sfx.tap();
    if (act === 'menu') return this.app.showTitle();
    if (this.phase === 'bet') {
      if (act === 'chip') { const v = +btn.dataset.v; if (this.bank - this.bet >= v) this.setBet(this.bet + v); else this.app.toast('Not enough in the bank'); }
      else if (act === 'clear') this.setBet(0);
      else if (act === 'deal') this.deal();
      else if (act === 'rebuy') this.rebuy();
    } else if (this.phase === 'player') {
      if (act === 'hit') this.hit(); else if (act === 'stand') this.stand(); else if (act === 'double') this.double();
    }
  }
  pad(a) {
    if (a === 'x') { this.action(this.phase === 'player' ? 'stand' : 'clear'); return true; }
    if (a === 'y') { this.action(this.phase === 'player' ? 'double' : 'deal'); return true; }
    if (a === 'lb' && this.phase === 'bet') { this.setBet(Math.max(0, this.bet - 5)); return true; }
    if (a === 'rb' && this.phase === 'bet') { if (this.bank - this.bet >= 5) this.setBet(this.bet + 5); return true; }
    return false;
  }

  // ---------- shoe ----------
  newShoe(silent) {
    for (const c of this.discard) { this.root.remove(c.group); c.dispose(); }
    this.discard = []; this.shoe = [];
    for (let d = 0; d < DECKS; d++) for (const s of SUITS) for (let r = 1; r <= 13; r++) this.shoe.push([s, r]);
    for (let i = this.shoe.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [this.shoe[i], this.shoe[j]] = [this.shoe[j], this.shoe[i]]; }
    if (!silent) { this.app.toast('Shuffling the shoe'); this.app.sfx.shuffle(); }
  }
  async give(hand, faceUp, z) {
    const [s, r] = this.shoe.pop(), c = new Card(s, r);
    c.place(SHOE.x - 0.55, 0.62, SHOE.z + 0.55, 0.25); this.root.add(c.group); hand.push(c);
    const n = hand.length, w = Math.min(0.62, 4.6 / n);
    const done = hand.map((h, i) => {
      const x = (i - (n - 1) / 2) * w, yaw = h._yaw ?? (h._yaw = (Math.random() - 0.5) * 0.06);
      return h.moveTo(x, 0.01 + i * 0.008, z, { faceUp: h === c ? faceUp : h.faceUp, dur: h === c ? 380 : 220, yaw, lift: h === c ? 0.3 : 0, sound: h === c });
    });
    this.hudAll(); await done.at(-1); this.labels(); return c;
  }

  // ---------- betting ----------
  setBet(v) {
    v = Math.max(0, v); const before = this.bet; this.bet = v;
    const want = breakdown(v);
    for (const m of this.betChips) this.root.remove(m);
    this.betChips = want.reverse().map((cv, i) => {
      const m = chipMesh(cv); m.position.set(BET.x, 0.035 + i * 0.072, BET.z); m.rotation.y = Math.random() * 6; this.root.add(m); return m;
    });
    if (v > before && this.betChips.length) { const top = this.betChips.at(-1), y = top.position.y; tween({ dur: 200, e: ease.out, update: (k) => { top.position.y = y + (1 - k) * 0.8; } }); this.app.sfx.chip(0.15); }
    this.hudAll(); this.app.dirty();
  }
  rebuy() { this.bank += 500; this.app.store.bj.rebuys++; this.persist(); this.setBet(25); this.app.sfx.chip(); this.app.toast('500 chips added'); }
  persist() { // a bet on the table is saved as still in the bank, so reloading mid-hand refunds it
    const s = this.app.store.bj, live = ['dealing', 'player', 'dealer'].includes(this.phase) ? this.bet : 0;
    s.bank = this.bank + live; s.peak = Math.max(s.peak, this.bank); this.app.save();
  }

  async deal() {
    if (this.phase !== 'bet' || this.bet <= 0 || this.bet > this.bank) return;
    this.phase = 'dealing'; this.bank -= this.bet; this.lastBet = this.bet; this.persist(); this.hudAll(); this.el.banner.hidden = true;
    await this.sweep();
    if (this.shoe.length < CUT) { this.newShoe(); await wait(500); }
    this.player = []; this.dealer = [];
    await this.give(this.player, true, PZ); await this.give(this.dealer, true, DZ);
    await this.give(this.player, true, PZ); this.holeHidden = true; await this.give(this.dealer, false, DZ);
    const up = this.dealer[0];
    if (up.rank === 1 || up.rank >= 10) {
      await wait(350);
      if (isBJ(this.dealer)) return this.settle();
      this.app.toast('Dealer checks: no blackjack', 1200);
    }
    if (isBJ(this.player)) return this.settle();
    this.phase = 'player'; this.hudAll(); this.app.refocus();
  }
  async sweep() {
    const cards = [...this.player, ...this.dealer]; this.app.clearLabels();
    const done = cards.map((c, i) => c.moveTo(DISCARD.x + (Math.random() - 0.5) * 0.08, 0.004 + (this.discard.length + i) * 0.004, DISCARD.z, { faceUp: false, dur: 380, delay: i * 40, yaw: -0.2 + (Math.random() - 0.5) * 0.1, sound: i === 0 }));
    this.discard.push(...cards); this.player = []; this.dealer = [];
    await Promise.all(done);
  }
  async hit() {
    if (this.phase !== 'player') return; this.phase = 'dealing'; this.hudAll();
    await this.give(this.player, true, PZ);
    const t = total(this.player).t;
    if (t > 21) return this.settle();
    if (t === 21) return this.stand();
    this.phase = 'player'; this.hudAll(); this.app.refocus();
  }
  async double() {
    if (this.phase !== 'player' || this.player.length !== 2 || this.bank < this.bet) return;
    this.phase = 'dealing'; this.bank -= this.bet; this.persist(); this.setBet(this.bet * 2);
    await wait(150); await this.give(this.player, true, PZ);
    if (total(this.player).t > 21) return this.settle();
    return this.stand();
  }
  async reveal() {
    if (!this.holeHidden) return; this.holeHidden = false;
    const c = this.dealer[1], p = c.group.position; await c.moveTo(p.x, p.y, p.z, { faceUp: true, dur: 420, yaw: c.group.rotation.y }); this.labels();
  }
  async stand() {
    if (this.phase !== 'player' && this.phase !== 'dealing') return; this.phase = 'dealer'; this.hudAll();
    await this.reveal(); await wait(300);
    while (total(this.dealer).t < 17) { await this.give(this.dealer, true, DZ); await wait(260); }
    this.settle();
  }

  // ---------- settle ----------
  async settle() {
    this.phase = 'settle'; this.hudAll();
    const pt = total(this.player).t;
    await this.reveal();
    const dt = total(this.dealer).t, pBJ = isBJ(this.player), dBJ = isBJ(this.dealer), s = this.app.store.bj;
    let out, pay = 0, title, sub = '';
    if (pBJ && dBJ) { out = 'push'; title = 'Push'; sub = 'Both blackjack'; }
    else if (pBJ) { out = 'bj'; title = 'Blackjack!'; pay = this.bet * 1.5; sub = `+${money(pay)}`; }
    else if (dBJ) { out = 'lose'; title = 'Dealer blackjack'; }
    else if (pt > 21) { out = 'lose'; title = 'Bust'; }
    else if (dt > 21) { out = 'win'; title = 'Dealer busts'; pay = this.bet; sub = `+${money(pay)}`; }
    else if (pt > dt) { out = 'win'; title = 'You win'; pay = this.bet; sub = `${pt} beats ${dt} · +${money(pay)}`; }
    else if (pt < dt) { out = 'lose'; title = 'Dealer wins'; sub = `${dt} beats ${pt}`; }
    else { out = 'push'; title = 'Push'; sub = `Both ${pt}`; }
    if (out === 'lose' && !sub) sub = `-${money(this.bet)}`;
    s.hands++; if (out === 'win' || out === 'bj') s.wins++; if (out === 'bj') s.blackjacks++; if (out === 'lose') s.losses++; if (out === 'push') s.pushes++;
    const b = this.el.banner; b.innerHTML = `${title}<small>${sub}</small>`; b.className = 'banner' + (out === 'lose' ? ' flamingo' : ''); b.hidden = false;
    out === 'lose' ? this.app.sfx.lose() : out === 'push' ? this.app.sfx.tap() : this.app.sfx.win();
    await this.moveChips(out, pay);
    if (out !== 'lose') this.bank += this.bet + pay;
    this.persist();
    this.bet = 0; this.phase = 'bet';
    const rebet = Math.min(this.lastBet, this.bank - (this.bank % 5));
    this.setBet(rebet >= 5 ? rebet : 0); this.hudAll(); this.app.refocus();
    setTimeout(() => { if (this.phase === 'bet') b.hidden = true; }, 2200);
  }
  async moveChips(out, pay) {
    const stack = [...this.betChips]; this.betChips = [];
    if (pay > 0) { // the house pays out beside the bet
      breakdown(pay).reverse().forEach((v, i) => {
        const m = chipMesh(v); m.position.set(BET.x + 0.75, 0.035 + i * 0.072, BET.z); this.root.add(m); stack.push(m);
        const y = m.position.y; tween({ dur: 260, delay: i * 70, update: (k) => { m.position.y = y + (1 - k) * 1.2; m.position.z = BET.z - (1 - k) * 2.5; }, onStart: () => this.app.sfx.chip() });
      });
      await wait(260 + stack.length * 70 + 250);
    } else await wait(500);
    const tz = out === 'lose' ? -3.6 : 6, tx = out === 'lose' ? 0 : 0.4;
    await Promise.all(stack.map((m, i) => {
      const p0 = m.position.clone();
      return tween({ dur: 420, delay: i * 18, e: ease.inOut, update: (k) => { m.position.set(p0.x + (tx - p0.x) * k, p0.y + Math.sin(k * Math.PI) * 0.4, p0.z + (tz - p0.z) * k); } });
    }));
    for (const m of stack) this.root.remove(m);
    this.app.sfx.chip();
  }

  // ---------- hud ----------
  labels() {
    if (!this.root.visible) return;
    const L = (id, hand, z) => {
      if (!hand.length) return this.app.label(id, null);
      const shown = id === 'dealer' && this.holeHidden ? [hand[0]] : hand, { t, soft } = total(shown);
      const text = (soft && t < 21 && t > 11 ? `${t - 10} / ${t}` : String(t)) + (id === 'dealer' && this.holeHidden ? ' + ?' : '');
      this.app.label(id, t > 21 ? `${t} bust` : text, new THREE.Vector3(0, 0, z), t > 21 ? 'bust' : '');
    };
    L('dealer', this.dealer, DZ - CARD_H / 2 - 0.3); L('player', this.player, PZ + CARD_H / 2 + 0.26);
  }
  hudAll() {
    const e = this.el, ph = this.phase, broke = ph === 'bet' && this.bank < 5 && this.bet === 0;
    e.bank.textContent = money(this.bank - (ph === 'bet' ? this.bet : 0)); e.bet.textContent = money(this.bet);
    e.shoe.textContent = `Shoe ${this.shoe.length}`;
    e.betBar.hidden = ph !== 'bet' || broke; e.playBar.hidden = ph !== 'player'; e.brokeBar.hidden = !broke;
    e.deal.disabled = this.bet <= 0;
    e.dbl.disabled = !(this.player.length === 2 && this.bank >= this.bet);
  }
}
