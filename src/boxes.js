// Tuck cases and brick boxes, built from the print dielines. Every face of a box samples its panel of the
// dieline texture (panel rects come from art/manifest.json), so one texture and one draw call cover a whole tuck.
// The title menu is an open brick: one row of tucks per edition, one column per game. Picking a tuck chooses
// both; the tuck lifts out, its lid opens and the deck slides out before the game starts.
import * as THREE from 'three';
import { C } from './art.js';
import { CARD_W, CARD_H, editions, loadTiered, manifestBoxes, tuckTexture, backTexture } from './cards.js';
import { tween, ease } from './tween.js';
import { sfx } from './audio.js';

// Tuck size in table units (a card is 1 x 1.4). Real tuck proportions: front 1 : 1.42, depth 0.26 of the width.
export const TW = 1.06, TH = 1.5, TD = 0.28;
const WHITE = new THREE.MeshLambertMaterial({ color: 0xf4f1ea }); // the unprinted inside of the board
const FULL = [0, 0, 1, 1];

// A quad from four corners as seen from outside (top-left, top-right, bottom-right, bottom-left), textured with
// a top-down image rect [u0, y0, u1, y1]. Winding follows the outward normal so either side can be culled.
function quad(pos, uv, tl, tr, br, bl, rect, outward) {
  const [u0, y0, u1, y1] = rect, v0 = 1 - y0, v1 = 1 - y1; // image rows run down, texture v runs up
  const c = [[bl, u0, v1], [br, u1, v1], [tr, u1, v0], [tl, u0, v0]];
  const n = new THREE.Vector3().subVectors(br, bl).cross(new THREE.Vector3().subVectors(tl, bl));
  const tris = n.dot(outward) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  for (const i of tris) { const [p, u, v] = c[i]; pos.push(p.x, p.y, p.z); uv.push(u, v); }
}
function geometry(build) {
  const pos = [], uv = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
  build((tl, tr, br, bl, rect, out) => quad(pos, uv, V(...tl), V(...tr), V(...br), V(...bl), rect, V(...out)));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}

// Tuck standing on its bottom, front facing +z, origin at the bottom centre. The dieline joins tell each panel
// which way round it goes: the sides fold off the front's edges, the back off the right side, the lid off the
// front's top edge and the bottom off the back's bottom edge.
function tuckGeometry(P, { top = true } = {}) {
  const w = TW / 2, h = TH, d = TD / 2;
  return geometry((q) => {
    q([-w, h, d], [w, h, d], [w, 0, d], [-w, 0, d], P.front, [0, 0, 1]);
    q([w, h, -d], [-w, h, -d], [-w, 0, -d], [w, 0, -d], P.back, [0, 0, -1]);
    q([-w, h, -d], [-w, h, d], [-w, 0, d], [-w, 0, -d], P.left, [-1, 0, 0]);
    q([w, h, d], [w, h, -d], [w, 0, -d], [w, 0, d], P.right, [1, 0, 0]);
    if (top) q([-w, h, -d], [w, h, -d], [w, h, d], [-w, h, d], P.top, [0, 1, 0]);
    q([w, 0, -d], [-w, 0, -d], [-w, 0, d], [w, 0, d], P.bottom, [0, -1, 0]);
  });
}
// The lid (hinged at the front's top edge) and its tongue (hinged at the lid's far edge), in hinge space.
const lidGeometry = (P) => geometry((q) => q([-TW / 2, 0, -TD], [TW / 2, 0, -TD], [TW / 2, 0, 0], [-TW / 2, 0, 0], P.top, [0, 1, 0]));
const tongueLen = TD * 0.9;
const tongueGeometry = (P) => geometry((q) => q([-TW / 2, 0, -tongueLen], [TW / 2, 0, -tongueLen], [TW / 2, 0, 0], [-TW / 2, 0, 0], P.tongue, [0, 1, 0]));

// One edition's tuck art: the dieline texture and its panels (a procedural edition gets its tuck front everywhere).
async function tuckArt(def) {
  const die = def.tuck?.die, tex = die && (await loadTiered(die.files));
  if (tex) return { tex, P: die.panels };
  const P = { front: FULL, back: FULL, left: FULL, right: FULL, top: FULL, tongue: FULL, bottom: FULL };
  return { tex: tuckTexture(), P };
}

// A tuck that opens: body without its top, hinged lid and tongue, plain board inside, and the deck in it.
function openingTuck(art) {
  const mat = new THREE.MeshLambertMaterial({ map: art.tex });
  const g = new THREE.Group(), body = new THREE.Mesh(tuckGeometry(art.P, { top: false }), mat);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(TW - 0.012, TH - 0.006, TD - 0.012).translate(0, TH / 2, 0), new THREE.MeshLambertMaterial({ color: 0xf4f1ea, side: THREE.BackSide }));
  const lid = new THREE.Group(); lid.position.set(0, TH, TD / 2);
  const lidFace = new THREE.Mesh(lidGeometry(art.P), mat), lidBack = new THREE.Mesh(lidGeometry(art.P), new THREE.MeshLambertMaterial({ color: 0xf4f1ea, side: THREE.BackSide }));
  const tongue = new THREE.Group(); tongue.position.set(0, 0, -TD); tongue.rotation.x = -Math.PI / 2;
  tongue.add(new THREE.Mesh(tongueGeometry(art.P), mat), new THREE.Mesh(tongueGeometry(art.P), new THREE.MeshLambertMaterial({ color: 0xf4f1ea, side: THREE.BackSide })));
  lid.add(lidFace, lidBack, tongue);
  const deckMats = [WHITE, WHITE, WHITE, WHITE, new THREE.MeshLambertMaterial({ map: backTexture() }), new THREE.MeshLambertMaterial({ map: backTexture() })];
  const deck = new THREE.Mesh(new THREE.BoxGeometry(CARD_W * 0.98, CARD_H * 0.98, TD - 0.04).translate(0, CARD_H * 0.49 + 0.02, 0), deckMats);
  g.add(body, inner, lid, deck);
  for (const m of [body, lidFace]) m.castShadow = true;
  return { group: g, lid, tongue, deck, deckMats, mat };
}

// ---------- brick boxes ----------
// kind: 'half' (6 decks) or 'brick' (12 decks). rows x cols of tucks standing side by side, fronts facing +z.
// The back row stands on a riser so its fronts show over the front row; the lid hinges at the back wall.
const LAYOUT = { half: { cols: 3 }, brick: { cols: 6 } };
const GAP = 0.06, WALL = 0.62, RISE = 1.05;

function boxGeometry(P, W, D, H) {
  const w = W / 2, d = D / 2;
  return geometry((q) => {
    q([-w, H, d], [w, H, d], [w, 0, d], [-w, 0, d], P.front, [0, 0, 1]);
    q([w, H, -d], [-w, H, -d], [-w, 0, -d], [w, 0, -d], P.back, [0, 0, -1]);
    q([-w, H, -d], [-w, H, d], [-w, 0, d], [-w, 0, -d], P.left, [-1, 0, 0]);
    q([w, H, d], [w, H, -d], [w, 0, -d], [w, 0, d], P.right, [1, 0, 0]);
  });
}

export class TitleBox {
  // games: [{ id, name }] in column order; columns past the games hold spare tucks ("more later").
  constructor(app, games) { this.app = app; this.games = games; this.root = new THREE.Group(); this.hover = null; this.busy = false; }

  async build(kind) {
    const boxes = manifestBoxes(), eds = editions(), cols = LAYOUT[kind].cols, rows = eds.length;
    this.kind = kind; this.cols = cols; this.rows = rows;
    const W = cols * TW + (cols + 1) * GAP, D = rows * TD + (rows + 1) * GAP + 0.1;
    this.W = W; this.D = D;
    // the box: printed outside, plain board inside, lid swung open behind
    const boxArt = boxes[kind] && (await loadTiered(boxes[kind].files));
    const outMat = boxArt ? new THREE.MeshLambertMaterial({ map: boxArt }) : new THREE.MeshLambertMaterial({ color: C.midnight });
    const P = boxes[kind]?.panels || { front: FULL, back: FULL, left: FULL, right: FULL, lid: FULL };
    const walls = new THREE.Mesh(boxGeometry(P, W, D, WALL), outMat);
    const board = new THREE.MeshLambertMaterial({ color: C.midnight, side: THREE.BackSide });
    const inside = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, WALL * 2, D - 0.02), board); // insides of the walls
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: C.midnight }));
    floor.position.y = 0.003; floor.receiveShadow = true;
    // On the dieline the lid hangs off the logo wall; here it hinges at the back so the logo wall faces you.
    const lid = new THREE.Group(); lid.position.set(0, WALL, -D / 2);
    const lidTop = geometry((q) => q([-W / 2, 0, D], [W / 2, 0, D], [W / 2, 0, 0], [-W / 2, 0, 0], P.lid, [0, 1, 0]));
    lid.add(new THREE.Mesh(lidTop, outMat), new THREE.Mesh(lidTop, board));
    lid.rotation.x = -1.95; // swung back past upright
    walls.castShadow = walls.receiveShadow = true; lid.children[0].castShadow = true;
    this.root.add(walls, inside, floor, lid);
    // the tucks: one instanced mesh per edition, a row each (front row first)
    this.arts = []; this.meshes = [];
    for (let r = 0; r < rows; r++) {
      const art = await tuckArt(eds[r]); this.arts.push(art);
      const m = new THREE.InstancedMesh(tuckGeometry(art.P), new THREE.MeshLambertMaterial({ map: art.tex }), cols);
      m.castShadow = true; m.receiveShadow = true; m.userData.row = r; m.frustumCulled = false;
      this.meshes.push(m); this.root.add(m);
      for (let c = 0; c < cols; c++) this.setTuck(r, c, 0);
    }
    this.opener = null; this.artOpeners = new Map();
    return this;
  }
  bounds() { // what the title camera must keep in view: row labels on the left, the leaning lid, raised tucks
    const back = this.D * Math.cos(Math.PI - 1.95), top = Math.max((this.rows - 1) * RISE + TH + 0.3, WALL + this.D * Math.sin(1.95));
    return new THREE.Box3(new THREE.Vector3(-this.W / 2 - 1.0, 0, -this.D / 2 - back), new THREE.Vector3(this.W / 2 + 0.1, top, this.D / 2 + 0.8));
  }
  slot(r, c) { // resting position of a tuck: front row at the front wall, later rows behind and higher
    return new THREE.Vector3(-this.W / 2 + GAP + TW / 2 + c * (TW + GAP), 0.02 + r * RISE, this.D / 2 - GAP - 0.05 - TD / 2 - r * (TD + GAP));
  }
  setTuck(r, c, lift, hidden = false) {
    const p = this.slot(r, c), m = new THREE.Matrix4().makeTranslation(p.x, p.y + lift, p.z);
    if (hidden) m.makeScale(0, 0, 0);
    this.meshes[r].setMatrixAt(c, m); this.meshes[r].instanceMatrix.needsUpdate = true; this.app.dirty();
  }
  game(c) { return this.games[c] || null; }
  labels(show) {
    const eds = editions();
    for (let c = 0; c < this.cols; c++) {
      const g = this.game(c), p = this.slot(0, c);
      this.app.label('tcol' + c, show && g ? g.name : null, new THREE.Vector3(p.x, 0, this.D / 2 + 0.3 + (c % 2) * 0.32), 'title-label');
    }
    for (let r = 0; r < this.rows; r++) {
      const p = this.slot(r, 0);
      this.app.label('trow' + r, show ? eds[r].name : null, new THREE.Vector3(-this.W / 2 - 0.55, p.y + TH * 0.8, p.z), 'title-label edition-label');
    }
  }
  // pointer: which tuck is under it (only game columns count)
  pick(cx, cy) {
    const hit = this.app.pick(cx, cy, this.meshes); if (!hit) return null;
    const r = hit.object.userData.row, c = hit.instanceId;
    return this.game(c) ? { r, c } : null;
  }
  setHover(h) {
    if (this.busy || (h?.r === this.hover?.r && h?.c === this.hover?.c)) return;
    if (this.hover) this.setTuck(this.hover.r, this.hover.c, 0);
    this.hover = h; if (h) this.setTuck(h.r, h.c, 0.28);
    document.body.style.cursor = h ? 'pointer' : '';
  }
  // Lift the tuck out, open it, slide the deck out. Resolves when the deck is out; reset() puts it back.
  // ready: resolves once the tuck's edition is live, so the deck that slides out wears that edition's back.
  async open(r, c, ready = Promise.resolve()) {
    this.busy = true; this.setHover(null); this.hover = null; document.body.style.cursor = '';
    const art = this.arts[r];
    if (!this.artOpeners.has(r)) { const o = openingTuck(art); this.artOpeners.set(r, o); this.root.add(o.group); }
    const o = this.opener = this.artOpeners.get(r), g = o.group;
    o.group.visible = true; o.lid.rotation.x = 0; o.tongue.rotation.x = -Math.PI / 2; o.deck.position.y = 0; o.deck.visible = false;
    ready.then(() => { for (const m of o.deckMats.slice(4)) { m.map = backTexture(); m.needsUpdate = true; } o.deck.visible = true; this.app.dirty(); });
    const from = this.slot(r, c); this.setTuck(r, c, 0, true);
    const to = new THREE.Vector3(from.x * 0.5, WALL + 0.8, this.D / 2 + 1.3);
    g.position.copy(from); g.rotation.set(0, 0, 0); sfx.slide();
    await tween({ dur: 420, e: ease.inOut, update: (k) => { g.position.lerpVectors(from, to, k); g.position.y += Math.sin(Math.PI * k) * 0.5; g.rotation.x = -0.75 * k; } });
    sfx.flip();
    await tween({ dur: 300, e: ease.out, update: (k) => { o.lid.rotation.x = 1.9 * k; o.tongue.rotation.x = -Math.PI / 2 * (1 - k); } });
    await ready; // a first Winter load on a phone can take a moment; the open tuck waits for it
    sfx.shuffle?.();
    await tween({ dur: 380, e: ease.out, update: (k) => { o.deck.position.y = 0.95 * k; } });
  }
  reset() {
    if (this.opener) this.opener.group.visible = false;
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) this.setTuck(r, c, 0);
    this.busy = false; this.opener = null;
  }
}
