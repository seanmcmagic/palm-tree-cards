// Card meshes: two alpha-tested planes back to back inside a flipper group.
// Textures are procedural unless art/manifest.json names a real file (or a "sheet:" cell) for that slot.
import * as THREE from 'three';
import { drawFace, drawBack, drawSlot, drawJoker, drawTuck, SUITS, RANKS } from './art.js';
import { tween, ease } from './tween.js';
import { sfx } from './audio.js';

export const CARD_W = 1, CARD_H = 1.4;
let aniso = 1, backTex = null, atlasTex = null, sheetTex = null, manifest = { back: null, faces: {}, atlas: null };
const faceTex = new Map(), slotTex = new Map(), loader = new THREE.TextureLoader();
// Texture tier: phones get the half-size sheet. ?tier=lo or ?tier=hi forces one.
const TIER = new URLSearchParams(location.search).get('tier') || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700 ? 'lo' : 'hi');

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
function fileTex(url) { // real art: same 5:7 portrait aspect as the canvases, PNG with transparent corners
  const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
// Sheet: one power-of-two image, a single row of equal cells (sheet.cells, in order), each with a gutter
// of sheet.gutter pixels (of sheet.cell) that the UVs skip so mip levels don't bleed between cells.
function sheetCell(name) {
  const s = manifest.sheet, i = s?.cells?.indexOf(name) ?? -1; if (!sheetTex || i < 0) return null;
  const [cw, ch] = s.cell, n = s.cells.length, g = s.gutter || 0, t = sheetTex.clone();
  t.repeat.set((cw - 2 * g) / (cw * n), (ch - 2 * g) / ch); t.offset.set((i * cw + g) / (cw * n), g / ch); return t;
}
function artTex(ref, fallback) { // a manifest value: "sheet:<cell>", a file in art/, or nothing (procedural)
  if (ref?.startsWith('sheet:')) return sheetCell(ref.slice(6)) || fallback();
  return ref ? fileTex('art/' + ref) : fallback();
}
export async function initCards(renderer) {
  aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  try { const r = await fetch('art/manifest.json'); if (r.ok) manifest = { back: null, faces: {}, atlas: null, ...(await r.json()) }; } catch (e) { /* procedural only */ }
  const sf = manifest.sheet?.files; // waited for, so the first frame already has the real back
  if (sf) try { sheetTex = await loader.loadAsync('art/' + (sf[TIER] || sf.hi)); sheetTex.colorSpace = THREE.SRGBColorSpace; sheetTex.anisotropy = aniso; } catch (e) { console.warn('art sheet failed to load; drawing procedurally', e); }
  backTex = artTex(manifest.back, () => canvasTex(drawBack()));
  if (manifest.atlas?.file) atlasTex = fileTex('art/' + manifest.atlas.file);
}
let jokerTex = null, tuckTex = null;
export const jokerTexture = () => (jokerTex ??= artTex(manifest.joker, () => canvasTex(drawJoker())));
export const tuckTexture = () => (tuckTex ??= artTex(manifest.tuck, () => canvasTex(drawTuck())));
export const cardKey = (suit, rank) => RANKS[rank - 1] + suit; // e.g. "QH", "10S"
// Atlas slot: one image, a grid with one row per suit (atlas.suits) and one column per rank (atlas.ranks).
// Each cell is a whole card at 5:7. Clones share the image, so it is uploaded to the GPU once.
function atlasCell(suit, rank) {
  const a = manifest.atlas; if (!atlasTex) return null;
  const ranks = a.ranks || RANKS, suits = a.suits || SUITS, col = ranks.indexOf(RANKS[rank - 1]), row = suits.indexOf(suit);
  if (col < 0 || row < 0) return null;
  const t = atlasTex.clone(); t.repeat.set(1 / ranks.length, 1 / suits.length);
  t.offset.set(col / ranks.length, 1 - (row + 1) / suits.length); return t;
}
export function faceTexture(suit, rank) {
  const k = cardKey(suit, rank);
  if (!faceTex.has(k)) faceTex.set(k, artTex(manifest.faces[k], () => atlasCell(suit, rank) || canvasTex(drawFace(suit, rank))));
  return faceTex.get(k);
}
export function slotTexture(kind) {
  if (!slotTex.has(kind)) slotTex.set(kind, canvasTex(drawSlot(kind)));
  return slotTex.get(kind);
}

const geoFront = new THREE.PlaneGeometry(CARD_W, CARD_H).rotateX(-Math.PI / 2);
const geoBack = geoFront.clone().rotateZ(Math.PI).translate(0, -0.004, 0);
const HL = new THREE.Color('#f5c364');

export class Card {
  constructor(suit, rank) {
    this.suit = suit; this.rank = rank; this.red = suit === 'H' || suit === 'D'; this.faceUp = false;
    this.group = new THREE.Group(); this.flipper = new THREE.Group(); this.group.add(this.flipper);
    this.frontMat = new THREE.MeshLambertMaterial({ map: faceTexture(suit, rank), alphaTest: 0.5 });
    this.backMat = new THREE.MeshLambertMaterial({ map: backTex, alphaTest: 0.5 });
    this.front = new THREE.Mesh(geoFront, this.frontMat); this.back = new THREE.Mesh(geoBack, this.backMat);
    for (const m of [this.front, this.back]) { m.castShadow = true; m.receiveShadow = true; m.userData.card = this; this.flipper.add(m); }
    this.flipper.rotation.z = Math.PI; this._token = null;
  }
  get name() { return cardKey(this.suit, this.rank); }
  get color() { return this.red ? 'r' : 'b'; }
  setFace(up) { this.faceUp = up; this.flipper.rotation.z = up ? 0 : Math.PI; }
  place(x, y, z, yaw = 0) { this._token = null; this.group.position.set(x, y, z); this.group.rotation.y = yaw; }
  highlight(on) {
    for (const m of [this.frontMat, this.backMat]) { if (on) m.emissive.copy(HL); else m.emissive.set(0); m.emissiveIntensity = on ? 0.35 : 0; }
  }
  // Animate to a resting pose. Resolves when it lands (or when superseded by another moveTo).
  moveTo(x, y, z, { faceUp = this.faceUp, dur = 280, delay = 0, lift = 0, yaw = 0, sound = true, e = ease.out } = {}) {
    const token = (this._token = {}), p = this.group.position;
    let fx, fy, fz, fyaw, frot, trot, arc;
    const flipping = faceUp !== this.faceUp;
    this.faceUp = faceUp;
    return tween({
      dur, delay, e,
      onStart: () => {
        fx = p.x; fy = p.y; fz = p.z; fyaw = this.group.rotation.y; frot = this.flipper.rotation.z;
        trot = faceUp ? 0 : Math.PI;
        if (flipping && Math.abs(frot - trot) < 0.01) frot = faceUp ? Math.PI : 0;
        const dist = Math.hypot(x - fx, z - fz);
        arc = Math.max(lift, flipping ? 0.6 : 0, Math.min(0.5, dist * 0.06));
        if (sound) flipping ? sfx.flip() : dist > 0.05 && sfx.slide();
      },
      update: (k) => {
        if (this._token !== token) return false;
        p.set(fx + (x - fx) * k, fy + (y - fy) * k + Math.sin(Math.PI * k) * arc, fz + (z - fz) * k);
        this.group.rotation.y = fyaw + (yaw - fyaw) * k;
        this.flipper.rotation.z = frot + (trot - frot) * k;
      },
    });
  }
  dispose() { this.frontMat.dispose(); this.backMat.dispose(); }
}

// Jokers don't play in either game; they lie on the table, set aside the way they come out of a real deck.
export function jokerCard() {
  const c = new Card('S', 1); c.joker = true; c.frontMat.map = jokerTexture(); c.setFace(true); return c;
}
export function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push(new Card(s, r));
  return d;
}
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function slotMesh(kind) {
  const m = new THREE.Mesh(geoFront, new THREE.MeshLambertMaterial({ map: slotTexture(kind), transparent: true, depthWrite: false }));
  m.receiveShadow = true; m.position.y = 0.001; return m;
}
