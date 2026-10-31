// Card meshes: two alpha-tested planes back to back inside a flipper group.
// Art comes from editions in art/manifest.json (written by tools/build_art.py). Each edition is one deck: a back,
// faces, an optional Joker and a tuck. Anything an edition leaves out is drawn procedurally.
import * as THREE from 'three';
import { drawFace, drawBack, drawSlot, drawJoker, drawTuck, SUITS, RANKS } from './art.js';
import { tween, ease } from './tween.js';
import { sfx } from './audio.js';

export const CARD_W = 1, CARD_H = 1.4;
let aniso = 1, manifest = { editions: [], boxes: {} }, ed = null; // ed: the live edition's runtime state
const slotTex = new Map(), loader = new THREE.TextureLoader(), states = new Map(), live = new Set(), listeners = new Set();
// Texture tier: phones get the half-size files. ?tier=lo or ?tier=hi forces one.
export const TIER = new URLSearchParams(location.search).get('tier') || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700 ? 'lo' : 'hi');
const PROCEDURAL = { id: 'procedural', name: 'Classic', faces: {} };

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
function fileTex(url) { // a standalone card image: 5:7 portrait, PNG with transparent corners
  const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
// A tiered file pair ({ hi, lo }) loaded and waited for; null if it fails (the caller falls back).
export async function loadTiered(files) {
  if (!files) return null;
  try { const t = await loader.loadAsync('art/' + (files[TIER] || files.hi)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }
  catch (e) { console.warn('art failed to load; drawing procedurally', files, e); return null; }
}

// ---------- editions ----------
export const editions = () => (manifest.editions.length ? manifest.editions : [PROCEDURAL]);
export const edition = () => ed.def;
export const editionDef = (id) => editions().find((e) => e.id === id) || editions()[0];
export function onEdition(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// Sheet: a power-of-two grid of equal cells (sheet.cells in reading order), each with a gutter of `gutter` pixels
// (of `cell`) that the UVs skip so mip levels don't bleed between cells. Each tier can have its own grid
// (sheet.layouts.hi / .lo); a sheet without layouts is one row in its own units.
function sheetCell(st, name) {
  const s = st.def.sheet, i = s?.cells?.indexOf(name) ?? -1; if (!st.sheet || i < 0) return null;
  const L = s.layouts?.[st.tier] || s.layouts?.hi || s, t = st.sheet.clone();
  const [cw, ch] = L.cell, cols = L.cols || s.cells.length, rows = L.rows || 1, g = L.gutter || 0;
  const col = i % cols, row = Math.floor(i / cols);
  t.repeat.set((cw - 2 * g) / (cw * cols), (ch - 2 * g) / (ch * rows));
  t.offset.set((col * cw + g) / (cw * cols), 1 - ((row + 1) * ch - g) / (ch * rows)); return t;
}
function artTex(st, ref, fallback) { // a manifest value: "sheet:<cell>", a file in art/, or nothing (procedural)
  if (ref?.startsWith('sheet:')) return sheetCell(st, ref.slice(6)) || fallback();
  return ref ? fileTex('art/' + ref) : fallback();
}
// Atlas slot: one image, a grid with one row per suit (atlas.suits) and one column per rank (atlas.ranks).
// Each cell is a whole card at 5:7. Clones share the image, so it is uploaded to the GPU once.
function atlasCell(st, suit, rank) {
  const a = st.def.atlas; if (!st.atlas) return null;
  const ranks = a.ranks || RANKS, suits = a.suits || SUITS, col = ranks.indexOf(RANKS[rank - 1]), row = suits.indexOf(suit);
  if (col < 0 || row < 0) return null;
  const t = st.atlas.clone(); t.repeat.set(1 / ranks.length, 1 / suits.length);
  t.offset.set(col / ranks.length, 1 - (row + 1) / suits.length); return t;
}
async function load(def) { // an edition's textures, loaded once and kept (switching back is instant)
  if (states.has(def.id)) return states.get(def.id);
  const files = def.sheet?.files, tier = files?.[TIER] ? TIER : 'hi';
  const st = { def, tier, sheet: await loadTiered(files), atlas: def.atlas?.file ? fileTex('art/' + def.atlas.file) : null, faces: new Map() };
  st.back = artTex(st, def.back, () => canvasTex(drawBack()));
  st.joker = def.joker === null ? null : artTex(st, def.joker, () => canvasTex(drawJoker()));
  st.tuck = artTex(st, def.tuck?.front, () => canvasTex(drawTuck()));
  states.set(def.id, st); return st;
}
// Switch every live card (and anything listening, like the Blackjack shoe) to another edition.
export async function setEdition(id) {
  const st = await load(editionDef(id)); if (st === ed) return;
  ed = st;
  for (const c of live) c.retexture();
  for (const fn of listeners) fn(st.def);
}
export async function initCards(renderer, id) {
  aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  try { const r = await fetch('art/manifest.json'); if (r.ok) manifest = { editions: [], boxes: {}, ...(await r.json()) }; } catch (e) { /* procedural only */ }
  ed = await load(editionDef(id)); // waited for, so the first frame already has the real back
}
export const manifestBoxes = () => manifest.boxes || {};
export const manifestRoom = () => manifest.room || {};
export const jokerTexture = () => ed.joker;
export const tuckTexture = () => ed.tuck;
export const backTexture = () => ed.back;
export const cardKey = (suit, rank) => RANKS[rank - 1] + suit; // e.g. "QH", "10S"
export function faceTexture(suit, rank) {
  const k = cardKey(suit, rank), f = ed.def.faces, ref = f === 'sheet' ? 'sheet:' + k : f?.[k]; // "sheet": every face is a cell
  if (!ed.faces.has(k)) ed.faces.set(k, artTex(ed, ref, () => atlasCell(ed, suit, rank) || canvasTex(drawFace(suit, rank))));
  return ed.faces.get(k);
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
    this.backMat = new THREE.MeshLambertMaterial({ map: ed.back, alphaTest: 0.5 });
    this.front = new THREE.Mesh(geoFront, this.frontMat); this.back = new THREE.Mesh(geoBack, this.backMat);
    for (const m of [this.front, this.back]) { m.castShadow = true; m.receiveShadow = true; m.userData.card = this; this.flipper.add(m); }
    this.flipper.rotation.z = Math.PI; this._token = null; live.add(this);
  }
  retexture() {
    this.backMat.map = ed.back;
    if (!this.joker) this.frontMat.map = faceTexture(this.suit, this.rank);
    else { this.group.visible = !!ed.joker; if (ed.joker) this.frontMat.map = ed.joker; } // editions without Jokers hide them
    this.frontMat.needsUpdate = this.backMat.needsUpdate = true;
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
  dispose() { live.delete(this); this.frontMat.dispose(); this.backMat.dispose(); }
}

// Jokers don't play in either game; they lie on the table, set aside the way they come out of a real deck.
export function jokerCard() {
  const c = new Card('S', 1); c.joker = true; c.retexture(); c.setFace(true); return c;
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
