// Palm Tree Cards: scene, camera fitting, input (pointer, keyboard, Gamepad API), screens.
import * as THREE from 'three';
import { drawTable, C, CW, CH, roundRect, canvas } from './art.js';
import { initCards, Card, CARD_H, jokerCard, tuckTexture } from './cards.js';
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
scene.add(new THREE.AmbientLight(0xffffff, 1.65));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.55);
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
    const place = (d, oz) => {
      camera.position.set(cx, Math.cos(TILT) * d, cz + oz + Math.sin(TILT) * d); camera.lookAt(cx, 0, cz + oz); camera.updateMatrixWorld();
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
  label(id, text, pos, cls = '') {
    let l = labels.get(id);
    if (!l) { const el = document.createElement('div'); el.className = 'hand-label'; $('#labels').append(el); l = { el, pos: new THREE.Vector3() }; labels.set(id, l); }
    if (text == null) { l.el.hidden = true; return; }
    l.el.hidden = false; l.el.textContent = text; l.el.className = 'hand-label ' + cls; l.pos.copy(pos); needRender = true;
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
const titleRoot = new THREE.Group(); scene.add(titleRoot);
function buildTitle() {
  const side = new THREE.MeshLambertMaterial({ color: C.midnight });
  const tuck = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.36, 1.56), [side, side, new THREE.MeshLambertMaterial({ map: tuckTexture() }), side, side, side]);
  tuck.position.set(-1.6, 0.18, 0.2); tuck.rotation.y = 0.22; tuck.castShadow = tuck.receiveShadow = true; titleRoot.add(tuck);
  const fan = [['S', 1], ['H', 13], ['D', 12], ['C', 11], ['S', 10]];
  fan.forEach(([s, r], i) => {
    const c = new Card(s, r); c.setFace(true); const a = (i - 2) * 0.22;
    c.place(1.1 + Math.sin(a) * 1.3, 0.01 + i * 0.006, 0.6 - Math.cos(a) * 1.3 + 1.0, -a); titleRoot.add(c.group);
  });
  const j = jokerCard(); j.place(-0.1, 0.004, 1.3, 0.5); titleRoot.add(j.group);
}

// ---------- screens ----------
const games = {};
function show(which) {
  closeModal();
  $('#title').hidden = which !== 'title'; $('#solHud').hidden = which !== 'sol'; $('#bjHud').hidden = which !== 'bj';
  titleRoot.visible = which === 'title';
  for (const [k, g] of Object.entries(games)) { if (k !== which) g.hide(); }
  app.clearLabels();
  current = which === 'title' ? null : games[which];
  if (current) current.show(); else fitTitle();
  syncTitleButtons(); clearFocus(); if (usingPad && which !== 'sol') focusFirst(); needRender = true;
}
function fitTitle() { // keep the tuck and fan clear of the menu panel (below it, or left of it in short landscape)
  const r = $('.title-panel').getBoundingClientRect(), side = r.left > innerWidth * 0.4;
  const rect = { x0: -2.6, x1: 2.9, z0: -1.1, z1: 2.9 };
  if (side) { const shift = (r.width + 40) / innerWidth; rect.x1 += (rect.x1 - rect.x0) * shift / (1 - shift) * 1.1; app.fit(rect, 'center', { top: 20, bottom: 20 }); }
  else app.fit(rect, 'center', { top: 20 + safe('t'), bottom: innerHeight - r.top + 16 });
}
function syncTitleButtons() {
  $('#drawModeBtn').textContent = `Draw ${store.settings.draw}`;
  $('#soundBtn').textContent = store.settings.sound ? 'Sound on' : 'Sound off';
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
  if (act === 'solitaire') show('sol');
  else if (act === 'blackjack') show('bj');
  else if (act === 'drawmode') { store.settings.draw = store.settings.draw === 1 ? 3 : 1; save(); syncTitleButtons(); app.toast(`Solitaire: draw ${store.settings.draw} (from the next deal)`); }
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
cv.addEventListener('pointerdown', (e) => { unlockAudio(); clearFocus(); usingPad = false; if (!$('#modal').hidden) return; cv.setPointerCapture(e.pointerId); current?.pointerDown?.(e); });
cv.addEventListener('pointermove', (e) => current?.pointerMove?.(e));
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
function frame(now) { requestAnimationFrame(frame); step(now); }
function step(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPads(now);
  const moving = tick(now), upd = current?.update?.(dt);
  if (moving || upd || needRender) {
    renderer.render(scene, camera); needRender = false;
    for (const l of labels.values()) if (!l.el.hidden) { const p = app.project(l.pos); l.el.style.left = p.x + 'px'; l.el.style.top = p.y + 'px'; }
  }
}

// ---------- boot ----------
async function boot() {
  try { await Promise.race([Promise.all(['400 40px "Lilita One"', '400 40px "Pacifico"', '900 40px "Nunito Sans"'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* offline: fallbacks */ }
  await initCards(renderer);
  buildTitle();
  games.sol = new Solitaire(app, $('#solHud')); games.bj = new Blackjack(app, $('#bjHud'));
  for (const g of Object.values(games)) scene.add(g.root);
  resize(); show('title'); requestAnimationFrame(frame);
  window.__palm = { app, games, store, step: () => step(performance.now()) }; // playtest hook (step drives frames in a hidden tab)
}
boot();
