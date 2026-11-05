// Palm Tree Cards: scene, camera fitting, input (pointer, keyboard, Gamepad API), screens.
import * as THREE from 'three';
import { drawTable, C, CW, CH, roundRect, canvas } from './art.js';
import { initCards, loadManifest, CARD_H, TIER, artUrl, editions, editionDef, setEdition } from './cards.js';
import { TitleBox } from './boxes.js';
import { buildRoom, ROOM_TOP, WALL_Z } from './room.js';
import { openMusic, closeMusic, musicOpen } from './music.js';
import { tick } from './tween.js';
import { unlockAudio, sfx } from './audio.js';
import { store, save, resetStats } from './store.js';
import { Solitaire } from './solitaire.js';
import { Blackjack } from './blackjack.js';

const $ = (s) => document.querySelector(s);
const mobile = matchMedia('(pointer: coarse)').matches;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 2 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(C.lagoon);
const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 200);
// Neutral white light, summing to ~0.98 on a card lying flat (Lambert divides by pi): printed colours read true.
// The sun was warm (0xfff4e0), which cut blue to 0.84 and greyed the Winter deck's pale blue and pinks.
scene.add(new THREE.AmbientLight(0xffffff, 1.75));
const sun = new THREE.DirectionalLight(0xffffff, 1.55);
sun.position.set(-5, 14, 7); sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.01; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const tableTex = new THREE.CanvasTexture(drawTable(mobile ? 512 : 1024)); tableTex.colorSpace = THREE.SRGBColorSpace;
const table = new THREE.Mesh(new THREE.PlaneGeometry(70, 70).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tableTex }));
table.receiveShadow = true; scene.add(table);

// ---------- app API shared with the games ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let needRender = true, current = null, view = { x0: -5, x1: 5, z0: -5, z1: 5 }, lastFit = null;
const TILT = THREE.MathUtils.degToRad(11), labels = new Map();
const TITLE_TILT = THREE.MathUtils.degToRad(64); // the title looks across at the tuck fronts and the wall; the games look down

const app = {
  scene, camera, store, save, sfx, mobile,
  dirty() { needRender = true; },
  get view() { return view; },
  toNdc(cx, cy) { ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1); return ndc; },
  ground(cx, cy, y = 0, out = new THREE.Vector3()) {
    ray.setFromCamera(this.toNdc(cx, cy), camera); plane.constant = -y;
    return ray.ray.intersectPlane(plane, out) || out;
  },
  pick(cx, cy, objects) { ray.setFromCamera(this.toNdc(cx, cy), camera); return ray.intersectObjects(objects, false)[0] || null; },
  project(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight }; },
  // Fit a ground rectangle between the HUD bars; align 'top' pins its top edge under the top bar.
  fit(rect, align = 'center', m = {}) {
    lastFit = [rect, align, m];
    const cx = (rect.x0 + rect.x1) / 2, cz = (rect.z0 + rect.z1) / 2;
    const top = 1 - 2 * ((m.top ?? 60) + safe('t')) / innerHeight, bot = -1 + 2 * ((m.bottom ?? 78) + safe('b')) / innerHeight;
    const hit = (nx, ny) => { ray.setFromCamera(ndc.set(nx, ny), camera); return ray.ray.intersectPlane(plane.set(plane.normal, 0), new THREE.Vector3()); };
    const tilt = m.tilt ?? TILT;
    const place = (d, oz) => {
      camera.position.set(cx, Math.cos(tilt) * d, cz + oz + Math.sin(tilt) * d); camera.lookAt(cx, 0, cz + oz); camera.updateMatrixWorld();
    };
    let lo = 2, hi = 120;
    for (let i = 0; i < 28; i++) {
      const d = (lo + hi) / 2; place(d, 0);
      const bl = hit(-0.96, bot), br = hit(0.96, bot), t = hit(0, top), b = hit(0, bot);
      const ok = bl && br && t && b && br.x - bl.x >= rect.x1 - rect.x0 && b.z - t.z >= rect.z1 - rect.z0;
      if (ok) hi = d; else lo = d;
    }
    // the band between the HUD margins may be off-centre: slide the camera so the rect sits in it
    place(hi, 0); const t0 = hit(0, top), b0 = hit(0, bot);
    const oz = !t0 || !b0 ? 0 : align === 'top' ? rect.z0 - t0.z : cz - (t0.z + b0.z) / 2;
    place(hi, oz);
    const t = hit(0, top), b = hit(0, bot), bl = hit(-0.96, bot), br = hit(0.96, bot);
    if (!t || !b || !bl || !br) return view; // zero-size window (hidden tab): keep the last view, resize refits
    view = { x0: bl.x, x1: br.x, z0: t.z, z1: b.z };
    sun.target.position.set(cx, 0, cz + oz); sun.position.set(cx - 5, 14, cz + oz + 7);
    needRender = true; return view;
  },
  // Fit a 3D box (THREE.Box3) into a screen band (margins in px), looking down at m.tilt. For the title, where
  // the standing tucks are tall enough that a ground rectangle doesn't describe what must stay in view.
  fitBounds(box, m = {}) {
    lastFit = null;
    const tilt = m.tilt ?? TILT, c = box.getCenter(new THREE.Vector3()), dir = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
    const l = -1 + 2 * (m.left ?? 16) / innerWidth, r = 1 - 2 * (m.right ?? 16) / innerWidth;
    const t = 1 - 2 * ((m.top ?? 16) + safe('t')) / innerHeight, b = -1 + 2 * ((m.bottom ?? 16) + safe('b')) / innerHeight;
    const pts = []; for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
    const proj = () => { const q = pts.map((p) => p.clone().project(camera)); return [Math.min(...q.map((p) => p.x)), Math.max(...q.map((p) => p.x)), Math.min(...q.map((p) => p.y)), Math.max(...q.map((p) => p.y))]; };
    const place = (d, target) => { camera.position.copy(target).addScaledVector(dir, d); camera.lookAt(target); camera.updateMatrixWorld(); };
    let lo = 1, hi = 120;
    for (let i = 0; i < 28; i++) {
      const d = (lo + hi) / 2; place(d, c); const [x0, x1, y0, y1] = proj();
      if (x1 - x0 <= r - l && y1 - y0 <= t - b) hi = d; else lo = d;
    }
    // slide the camera so the projected box sits in the middle of the band
    const target = c.clone(), right = new THREE.Vector3(), up = new THREE.Vector3();
    for (let k = 0; k < 3; k++) {
      place(hi, target); const [x0, x1, y0, y1] = proj();
      const halfH = hi * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), halfW = halfH * camera.aspect;
      camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
      target.addScaledVector(right, ((x0 + x1) / 2 - (l + r) / 2) * halfW).addScaledVector(up, ((y0 + y1) / 2 - (t + b) / 2) * halfH);
    }
    place(hi, target);
    sun.target.position.copy(c).setY(0); sun.position.set(c.x - 5, 14, c.z + 7);
    needRender = true; return hi; // the camera distance: smaller means the box is bigger on screen
  },
  // group: labels in one group never overlap on screen; a label that would collide drops below the one before it
  label(id, text, pos, cls = '', group = null) {
    let l = labels.get(id);
    if (!l) { const el = document.createElement('div'); el.className = 'hand-label'; $('#labels').append(el); l = { el, pos: new THREE.Vector3() }; labels.set(id, l); }
    if (text == null) { l.el.hidden = true; return; }
    l.el.hidden = false; l.el.textContent = text; l.el.className = 'hand-label ' + cls; l.pos.copy(pos); l.group = group; needRender = true;
  },
  clearLabels() { for (const l of labels.values()) l.el.hidden = true; },
  toast(msg, ms = 1600) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), ms);
  },
  modal(title, html, buttons) {
    $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html;
    const row = $('#modalBtns'); row.innerHTML = '';
    for (const b of buttons) {
      const el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label;
      el.onclick = () => { closeModal(); b.run?.(); }; row.append(el);
    }
    $('#modal').hidden = false; if (usingPad) focusFirst();
  },
  showTitle() { show('title'); },
  refocus() { if (focusEl) setTimeout(focusFirst, 0); }, // keep pad users on a live button when the HUD swaps
};
const safe = (s) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(s === 't' ? '--safe-t' : '--safe-b')) || 0;
function closeModal() { $('#modal').hidden = true; }

// ---------- title scene ----------
// An open brick box of tucks: a row per edition, a column per game (later columns are spare decks). Phones get
// the half brick (3 columns), everything else the full brick (6); ?box=half or ?box=brick forces one.
const GAMES = [{ id: 'sol', name: 'Solitaire' }, { id: 'bj', name: 'Blackjack' }];
const titleRoot = new THREE.Group(); scene.add(titleRoot);
const titleBox = new TitleBox(app, GAMES);
async function buildTitle() {
  const kind = new URLSearchParams(location.search).get('box') || (TIER === 'lo' ? 'half' : 'brick');
  await titleBox.build(kind); titleRoot.add(titleBox.root);
  titleRoot.add(await buildRoom(mobile, () => app.dirty())); // casino night: the wall of uncut sheets behind the table
}
// Start a game with a deck: the tuck comes out of the box and opens while the edition's textures load.
async function launch(gameId, edId = store.settings.deck) {
  if (titleBox.busy || $('#title').hidden) return;
  if (editionDef(edId).concept) return; // concept decks are vote-only
  if (gameId === 'sol' && !launch.drawPicked) return klondikeModal(edId);
  launch.drawPicked = false;
  store.settings.deck = editionDef(edId).id; save(); syncTitleButtons();
  const at = titleBox.slotOf(store.settings.deck), ready = setEdition(store.settings.deck);
  if (at) await titleBox.open(at[0], at[1] ?? GAMES.findIndex((g) => g.id === gameId), ready);
  else await ready; // a concept the half brick has no room for: straight in
  show(gameId); titleBox.reset();
  if (gameId === 'sol' && games.sol.draw !== store.settings.draw) games.sol.newGame(); // a game dealt for the other mode
}
// Klondike asks Draw 1 or Draw 3 each time; the last choice is the highlighted one.
function klondikeModal(edId) {
  const pick = (n) => () => { store.settings.draw = n; save(); launch.drawPicked = true; launch('sol', edId); };
  const cur = store.settings.draw;
  app.modal('Klondike', '<p>Turn one card at a time, or three.</p>', [
    { label: 'Draw 1', primary: cur === 1, run: pick(1) },
    { label: 'Draw 3', primary: cur === 3, run: pick(3) },
    { label: 'Cancel' },
  ]);
}
// A concept deck: only the tuck exists, so it isn't playable; players say whether they'd buy it. Votes are counted
// on this device only (store.votes) until there is a server: a demand test for which deck to print next.
function conceptModal(def) {
  const n = store.votes[def.id] || 0, s = def.sheet, tier = s.files[TIER] ? TIER : 'hi', L = s.layouts[tier];
  const col = s.cells.indexOf('tuck') % L.cols; // the tuck cell of its sheet, shown large
  const tuck = `<div class="concept-tuck" style="background-image:url('${artUrl(s.files[tier])}');background-size:${L.cols * 100}% ${L.rows * 100}%;background-position:${(col / Math.max(1, L.cols - 1)) * 100}% 0"></div>`;
  app.modal(def.name, `${tuck}<p>A tuck design for a deck I might print next. Would you buy it?</p>
    <p class="votes">♥ ${n} ${n === 1 ? 'vote' : 'votes'} on this device</p>`, [
    { label: "I'd buy this", primary: true, run: () => { store.votes[def.id] = n + 1; save(); sfx.tap(); titleBox.labels(true); app.toast('Thanks! Counted.'); conceptModal(def); } },
    { label: 'Close' },
  ]);
}
// ---------- screens ----------
const games = {};
function show(which) {
  closeModal();
  $('#title').hidden = which !== 'title'; $('#solHud').hidden = which !== 'sol'; $('#bjHud').hidden = which !== 'bj';
  titleRoot.visible = which === 'title';
  scene.background.set(which === 'title' ? '#001b33' : C.lagoon); // the title is a night room; games keep the felt colour
  for (const [k, g] of Object.entries(games)) { if (k !== which) g.hide(); }
  app.clearLabels();
  current = which === 'title' ? null : games[which];
  if (current) current.show(); else { titleBox.reset(); titleBox.skin(store.settings.deck); fitTitle(); titleBox.labels(true); }
  syncTitleButtons(); clearFocus(); if (usingPad && which !== 'sol') focusFirst(); needRender = true;
}
function fitTitle() { // keep the box clear of the menu panel (below it, or left of it in short landscape)
  if (!titleBox.W) return; // still loading: boot fits once the box is built
  const r = $('.title-panel').getBoundingClientRect(), side = r.left > innerWidth * 0.4;
  const m = { tilt: TITLE_TILT, top: 24, bottom: 24, left: 16, right: 16 };
  if (side) m.right = innerWidth - r.left + 24; else m.bottom = innerHeight - r.top + 16;
  // Frame the neon sign too when that costs the box less than a fifth of its size; otherwise the box comes first.
  const box = titleBox.bounds(), dBox = app.fitBounds(box, m);
  const withSign = box.clone().expandByPoint(new THREE.Vector3(0, ROOM_TOP, WALL_Z));
  if (app.fitBounds(withSign, m) > dBox * 1.25) app.fitBounds(box, m);
}
function syncTitleButtons() {
  $('#soundBtn').textContent = store.settings.sound ? 'Sound on' : 'Sound off';
  $('#deckBtn').textContent = `Deck: ${editionDef(store.settings.deck).name}`;
}
function statsHtml() {
  const s = store.sol, b = store.bj, pct = (w, p) => (p ? Math.round((w / p) * 100) + '%' : '–');
  const t = s.bestTime == null ? '–' : `${Math.floor(s.bestTime / 60)}:${String(s.bestTime % 60).padStart(2, '0')}`;
  return `<h3>Solitaire</h3><table>
    <tr><td>Played</td><td>${s.played}</td></tr><tr><td>Won</td><td>${s.won} (${pct(s.won, s.played)})</td></tr>
    <tr><td>Best streak</td><td>${s.bestStreak}</td></tr><tr><td>Fastest win</td><td>${t}</td></tr>
    <tr><td>Fewest moves</td><td>${s.bestMoves ?? '–'}</td></tr></table>
    <h3>Blackjack</h3><table>
    <tr><td>Bank</td><td>${b.bank}</td></tr><tr><td>Peak bank</td><td>${b.peak}</td></tr>
    <tr><td>Hands</td><td>${b.hands}</td></tr><tr><td>Won / lost / push</td><td>${b.wins} / ${b.losses} / ${b.pushes}</td></tr>
    <tr><td>Blackjacks</td><td>${b.blackjacks}</td></tr><tr><td>Rebuys</td><td>${b.rebuys}</td></tr></table>`;
}
function titleAction(act) {
  if (act === 'solitaire') launch('sol');
  else if (act === 'blackjack') launch('bj');
  else if (act === 'music') { musicOpen() ? closeMusic() : openMusic(app); sfx.tap(); }
  else if (act === 'deck') { // cycle editions; a game in progress switches look too
    const eds = editions().filter((e) => !e.concept), i = eds.findIndex((e) => e.id === store.settings.deck); // concepts are vote-only
    store.settings.deck = eds[(i + 1) % eds.length].id; save(); syncTitleButtons(); setEdition(store.settings.deck); titleBox.skin(store.settings.deck); sfx.tap();
  }
  else if (act === 'sound') { store.settings.sound = !store.settings.sound; save(); syncTitleButtons(); sfx.tap(); }
  else if (act === 'stats') app.modal('Stats', statsHtml(), [
    { label: 'Close', primary: true },
    { label: 'Reset', run: () => app.modal('Reset stats?', '<p>Clears both games and resets the bank to 500.</p>', [{ label: 'Reset', primary: true, run: () => { resetStats(); app.toast('Stats reset'); } }, { label: 'Cancel' }]) },
  ]);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.btn[data-act]'); if (!b) return;
  unlockAudio();
  if (!$('#title').hidden) titleAction(b.dataset.act);
  else current?.action(b.dataset.act, b);
});

// ---------- pointer ----------
const cv = $('#gl');
cv.addEventListener('pointerdown', (e) => {
  unlockAudio(); clearFocus(); usingPad = false; if (!$('#modal').hidden) return;
  if (!current) { const h = titleBox.pick(e.clientX, e.clientY); if (h) h.concept ? conceptModal(h.concept) : launch(GAMES[h.c].id, titleBox.eds[h.r].id); return; }
  cv.setPointerCapture(e.pointerId); current.pointerDown?.(e);
});
cv.addEventListener('pointermove', (e) => {
  if (current) return current.pointerMove?.(e);
  if (e.pointerType === 'mouse' && !$('#title').hidden && $('#modal').hidden) titleBox.setHover(titleBox.pick(e.clientX, e.clientY));
});
cv.addEventListener('pointerup', (e) => current?.pointerUp?.(e));
cv.addEventListener('pointercancel', (e) => current?.pointerUp?.(e, true));
cv.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- focus navigation (gamepad / keyboard) for buttons ----------
let focusEl = null, usingPad = false;
function focusables() {
  const layer = !$('#modal').hidden ? $('#modal') : !$('#title').hidden ? $('#title') : current?.hud;
  if (!layer) return [];
  return [...layer.querySelectorAll('.btn')].filter((b) => !b.disabled && b.offsetParent !== null && !b.closest('[hidden]'));
}
function setFocus(el) { focusEl?.classList.remove('focus'); focusEl = el; el?.classList.add('focus'); }
function clearFocus() { setFocus(null); }
function focusFirst() { const f = focusables(); setFocus(f.find((b) => b.classList.contains('primary') || b.classList.contains('big')) || f[0] || null); }
function moveFocus(dir) {
  const list = focusables(); if (!list.length) return;
  if (!focusEl || !list.includes(focusEl)) return focusFirst();
  const r = focusEl.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
  let best = null, bs = Infinity;
  for (const b of list) {
    if (b === focusEl) continue;
    const q = b.getBoundingClientRect(), dx = q.x + q.width / 2 - cx, dy = q.y + q.height / 2 - cy;
    const along = dx * v[0] + dy * v[1]; if (along <= 4) continue;
    const s = along + Math.abs(dx * v[1] + dy * v[0]) * 2.5; if (s < bs) { bs = s; best = b; }
  }
  if (best) { setFocus(best); sfx.tap(); }
}
function padAction(a) {
  unlockAudio(); usingPad = true;
  const menuMode = !$('#modal').hidden || !$('#title').hidden;
  if (!menuMode && current?.pad?.(a)) return;
  if (a === 'start' && !menuMode) return show('title');
  if (['up', 'down', 'left', 'right'].includes(a)) return moveFocus(a);
  if (a === 'a') { if (focusEl && focusables().includes(focusEl)) focusEl.click(); else focusFirst(); }
  if (a === 'b' && !$('#modal').hidden) closeModal();
}
const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'a', ' ': 'a', Escape: 'b', Backspace: 'b',
  z: 'lb', u: 'lb', d: 'y', x: 'x', h: 'rb', m: 'start', s: 'x', w: 'y' };
addEventListener('keydown', (e) => { const a = KEYS[e.key]; if (!a) return; e.preventDefault(); if (!e.repeat || ['up', 'down', 'left', 'right'].includes(a)) padAction(a); });

// Standard mapping (Xbox layout; the Steam Controller shows up this way when Chrome is launched from Steam).
const BTN = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 4: 'lb', 5: 'rb', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
const padPrev = {}; let stickDir = null, stickNext = 0;
function pollPads(now) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p) continue;
    const prev = padPrev[p.index] || (padPrev[p.index] = []);
    for (const [i, a] of Object.entries(BTN)) { const down = !!p.buttons[i]?.pressed; if (down && !prev[i]) padAction(a); prev[i] = down; }
    const [ax, ay] = [p.axes[0] || 0, p.axes[1] || 0];
    const dir = Math.hypot(ax, ay) < 0.55 ? null : Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up');
    if (dir !== stickDir) { stickDir = dir; if (dir) { padAction(dir); stickNext = now + 320; } }
    else if (dir && now > stickNext) { padAction(dir); stickNext = now + 130; }
  }
}
addEventListener('gamepadconnected', (e) => app.toast(`Controller connected: ${e.gamepad.id.split('(')[0].trim()}`, 2400));

// ---------- loop ----------
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (current) current.layout(true); else if (!$('#title').hidden) fitTitle();
  needRender = true;
}
addEventListener('resize', resize);
let last = performance.now();
function placeLabels() {
  const groups = new Map();
  for (const l of labels.values()) {
    if (l.el.hidden) continue;
    const p = app.project(l.pos); l.x = p.x; l.y = p.y;
    if (l.group) { if (!groups.has(l.group)) groups.set(l.group, []); groups.get(l.group).push(l); }
  }
  for (const list of groups.values()) { // left to right; each label clears every earlier one it overlaps
    list.sort((a, b) => a.x - b.x);
    const placed = [];
    for (const l of list) {
      const w = l.el.offsetWidth, h = l.el.offsetHeight;
      for (const o of placed) if (Math.abs(l.x - o.x) < (w + o.w) / 2 + 6 && Math.abs(l.y - o.y) < (h + o.h) / 2) l.y = o.y + (h + o.h) / 2;
      l.w = w; l.h = h; placed.push(l);
    }
  }
  for (const l of labels.values()) if (!l.el.hidden) { l.el.style.left = l.x + 'px'; l.el.style.top = l.y + 'px'; }
}
function frame(now) { requestAnimationFrame(frame); step(now); }
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPads(now);
  const moving = tick(now), upd = current?.update?.(dt);
  if (moving || upd || needRender) {
    renderer.render(scene, camera); needRender = false;
    placeLabels();
  }
}

// ---------- boot ----------
async function boot() {
  // fonts and the manifest together, then the deck and the box together: each step waits only on what it needs
  const fonts = Promise.race([Promise.all(['400 40px "Lilita One"', '400 40px "Pacifico"', '900 40px "Nunito Sans"'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]).catch(() => {}); // offline: fallbacks
  await Promise.all([fonts, loadManifest(renderer)]);
  if (editionDef(store.settings.deck).concept) { store.settings.deck = 'original'; save(); } // concepts used to be playable
  await Promise.all([initCards(store.settings.deck), buildTitle()]);
  games.sol = new Solitaire(app, $('#solHud')); games.bj = new Blackjack(app, $('#bjHud'));
  for (const g of Object.values(games)) scene.add(g.root);
  resize(); show('title'); requestAnimationFrame(frame);
  window.__palm = { app, games, store, titleBox, step: () => step(performance.now()) }; // playtest hook (step drives frames in a hidden tab)
}
boot();
