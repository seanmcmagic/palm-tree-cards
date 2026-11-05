/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   GameKit shell/shell.js — the PRODUCT SHELL every game on this machine mounts. 2026-11-04.
   Title card + main menu (Continue / New game / Settings / Quit), pause menu, tabbed settings (Audio / Graphics /
   Gameplay / Controls, extendable), confirm dialogs, versioned save slot, loading screen, Show FPS, and one input
   layer for keyboard, mouse, touch and gamepad (menu navigation + on-screen button glyphs for the device in use).

   Lifted from Tarnhollow (Proving/parts/395-pause-menu.js, 390 title flow, 385 pad navigation) so Tarnhollow and
   every new game run the SAME code instead of drifting copies. three.js-agnostic: plain DOM.
   Graphics rows come from GameKit/quality/tiers.js (GameTiers.settingRows) when it is loaded — never re-implemented.

   ES module:  import GameShell from './vendor/gamekit-shell.js';   (also sets globalThis.GameShell)
   CSS:        the sibling file with .css for .js (gamekit-shell.css), linked automatically.
   API:        README.md next to this file. Vendored copies: run `python sync.py` after editing, then commit each repo.
══════════════════════════════════════════════════════════════════════════════════════════════════ */
const VERSION = '2026-11-04b';   // b: fullscreen on phones and tablets (Start in fullscreen, landscape lock)
const root = typeof globalThis !== 'undefined' ? globalThis : window;

// ── css: link the sibling .css; hide shell roots until it lands (no flash of unstyled menu) ─────────
let cssDone = false;
function addCss(href) {
  if (cssDone) return; cssDone = true;
  const guard = document.createElement('style'); guard.textContent = '.gs-title,.gs-ov,.gs-load{visibility:hidden}';
  document.head.appendChild(guard);
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href || new URL(import.meta.url.replace(/\.js(\?.*)?$/, '.css$1')).href;
  l.onerror = () => { console.error('[GameShell] could not load', l.href); guard.remove(); };
  document.head.appendChild(l);
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = (d = new Date()) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
const call = (f, ...a) => { try { return typeof f === 'function' ? f(...a) : f; } catch (e) { console.error('[GameShell] hook failed', e); return undefined; } };
const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

// ── gamepad glyphs (standard mapping) ──────────────────────────────────────────────────────────────
const PB = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const XBOX = { A: ['A', '#5fb35a'], B: ['B', '#d0504a'], X: ['X', '#4a86d0'], Y: ['Y', '#e0b030'] };
const PSX = { A: ['✕', '#7aa8e0'], B: ['○', '#e07a70'], X: ['□', '#d890c8'], Y: ['△', '#5fc0a0'] };
const PS_NAMES = { LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', VIEW: 'Share', START: 'Options', L3: 'L3', R3: 'R3' };

// ── save slot: one versioned envelope in localStorage, or the game's own adapter ───────────────────
function makeSave(cfg) {
  const S = cfg || {};
  if (typeof S.has === 'function' && typeof S.read === 'function') {           // adapter mode: the game owns its storage
    return {
      adapter: true,
      has: () => !!call(S.has),
      read: () => call(S.read),
      write: (d) => call(S.write, d),
      clear: () => call(S.clear),
      info: () => (S.info ? call(S.info) : null),
    };
  }
  const key = S.key || 'gameshell.save', version = S.version || 1;
  const api = {
    adapter: false, key, version,
    has() { return !!api.read(); },
    // { v, at, data } with data migrated to the current version, or null
    read() {
      let raw = null; try { raw = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { raw = null; }
      if (!raw || typeof raw !== 'object' || !('data' in raw)) return null;
      if (raw.v !== version) {
        if (typeof S.migrate !== 'function' || (raw.v || 0) > version) return null;   // a newer save than this build understands: leave it alone
        const d = call(S.migrate, raw.data, raw.v || 0);
        if (d == null) return null;
        raw = { v: version, at: raw.at, data: d };
      }
      return raw;
    },
    write(data) {
      try { localStorage.setItem(key, JSON.stringify({ v: version, at: Date.now(), data })); return true; }
      catch (e) { console.error('[GameShell] save failed', e); return false; }
    },
    clear() { try { localStorage.removeItem(key); } catch (e) { /* private mode */ } },
    info() {
      const r = api.read(); if (!r || !r.at) return null;
      const m = Math.max(0, Math.round((Date.now() - r.at) / 60000));
      return { at: r.at, label: clock(new Date(r.at)) + (m < 1 ? ' (just now)' : m < 120 ? ' (' + m + ' min ago)' : ''), data: r.data };
    },
  };
  return api;
}

// ── shell prefs (audio / gameplay rows the shell provides by default) ───────────────────────────────
const PREF_DEF = { master: 1, music: 0.7, sfx: 0.9, sens: 1, invertY: false, fov: 0, rumble: true, showFps: false };
// Fullscreen. Phones and tablets are where it matters most (Sean, 2026-11-04: "I just like when the game goes into full screen"),
// so it is offered on touch too and, by default there, entered on the first Play / Continue tap (requestFullscreen needs a
// user gesture). Inside the APK wrapper (Proving/android WebView, already immersive) it is skipped entirely.
const COARSE = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
// every APK (showcase games, Tarnhollow, Brinecrown, Deckline) serves from appassets.androidplatform.net and swallows requestFullscreen
const IN_APP = () => (typeof location !== 'undefined' && location.hostname === 'appassets.androidplatform.net') ||
  (typeof navigator !== 'undefined' && (/; wv\)|TarnhollowApp\//.test(navigator.userAgent || '') || !!root.TarnNative));
const FS_OK = () => typeof document !== 'undefined' && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !IN_APP();
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function loadShellPrefs(ns, defs) {
  let p = null; try { p = JSON.parse(localStorage.getItem(ns + '.shell.v1') || 'null'); } catch (e) { p = null; }
  return Object.assign({}, PREF_DEF, defs || {}, p && typeof p === 'object' ? p : {});
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   mount(cfg) → shell. See README.md for every option; the short version:
   { id, title, subtitle, art, logo, crest, theme, accent,
     menu: ['continue','new','settings','fullscreen','credits','quit' | {id,label,act,show,disabled,title,cls}],
     pauseMenu: ['resume','settings','save','load','controls','quit' | {...}],
     save: { key, version, migrate } | { has, read, write, clear, info },
     onNewGame({replacing}), onContinue(save), onPause(on), onResume(), onSave() -> data, onLoad(save), onQuitToTitle(saved),
     onQuit(), onCredits(), canPause(), stat(), onKey(e, view), onPref(k, v, prefs), onInputMode(mode),
     settings: { tabs, audio(ui, body), graphics(...), gameplay(...), controls(...), defaults }, controls, controlsNote,
     tiers: { ns, current }, pad, padPause, pauseKey, fullscreen, version, titleId, overlayId, loading }
══════════════════════════════════════════════════════════════════════════════════════════════════ */
function mount(cfg) {
  cfg = Object.assign({}, cfg || {});
  addCss(cfg.css);
  const ns = cfg.id || 'game';
  const GT = root.GameTiers || null;
  const text = Object.assign({
    newGameAsk: 'Start a new game?', newGameSub: 'This replaces your saved game.', newGameYes: 'New game',
    quitAsk: 'Leave for the title?', quitText: 'Your progress is kept in the save.',
    loadAsk: 'Return to your last save?', loadText: 'Anything since then is lost.',
  }, cfg.text || {});

  const shell = {
    version: VERSION, cfg, ns, text,
    save: makeSave(cfg.save),
    prefs: loadShellPrefs(ns, Object.assign({ fullscreen: COARSE() && !IN_APP() }, cfg.prefs)),
    input: { mode: 'kbd', padId: '', ps: false },
    closedAt: 0,
  };
  shell.savePrefs = () => { try { localStorage.setItem(ns + '.shell.v1', JSON.stringify(shell.prefs)); } catch (e) { /* private mode */ } };
  shell.setPref = (k, v) => { shell.prefs[k] = v; shell.savePrefs(); call(cfg.onPref, k, v, shell.prefs); if (k === 'showFps') fps.show(v); };

  // theme variables (accent shortcut + any --gs-* override)
  const theme = Object.assign({}, cfg.accent ? { '--gs-accent': cfg.accent } : {}, cfg.theme || {});
  for (const k in theme) document.documentElement.style.setProperty(k, theme[k]);

  // ════════════════════════════ input mode + glyphs ════════════════════════════
  function setMode(m) {
    if (shell.input.mode === m) return;
    shell.input.mode = m;
    const b = document.body; if (b) { b.classList.toggle('gs-pad', m === 'pad'); b.classList.toggle('gs-touch', m === 'touch'); }
    call(cfg.onInputMode, m);
  }
  addEventListener('keydown', (e) => { if (e.isTrusted) setMode('kbd'); }, true);
  addEventListener('mousemove', (e) => { if (e.isTrusted && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) setMode('kbd'); }, true);
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') setMode('touch'); }, true);
  /** HTML for a pad button in the current pad family: glyph('A') → coloured A (Xbox) or ✕ (PlayStation) */
  function glyph(name) {
    const ps = shell.input.ps, face = (ps ? PSX : XBOX)[name];
    if (face) return '<kbd class="pb" style="border-color:' + face[1] + ';color:' + face[1] + '">' + face[0] + '</kbd>';
    const map = { UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶', DPAD: '✚', LS: 'LS', RS: 'RS' };
    return '<kbd class="pb">' + esc(map[name] || (ps && PS_NAMES[name]) || name) + '</kbd>';
  }
  /** key strip item: [kbd keys], [pad buttons], label → both, CSS shows the device in use */
  function hint(kbd, pad, label) {
    const k = (kbd || []).map((x) => '<kbd>' + x + '</kbd>').join('');
    const p = (pad || []).map(glyph).join('');
    return '<span><span class="g-kbd">' + k + '</span>' + (pad && pad.length ? '<span class="g-pad">' + p + '</span>' : '') + esc(label) + '</span>';
  }
  shell.glyph = glyph; shell.hint = hint;

  // ════════════════════════════ fps readout ════════════════════════════
  const fps = (() => {
    let el = null, n = 0, t0 = 0, raf = 0, on = false;
    const tick = (t) => {
      raf = requestAnimationFrame(tick); if (!t0) t0 = t; n++;
      if (t - t0 >= 500) { M.fps = Math.round(n * 1000 / (t - t0)); n = 0; t0 = t; if (el) el.textContent = M.fps + ' fps' + (cfg.fpsExtra ? ' · ' + (call(cfg.fpsExtra) || '') : ''); }
    };
    const M = {
      fps: 0,
      get on() { return on; },
      show(v) {
        on = !!v;
        if (on && !el) { el = document.createElement('div'); el.className = 'gs-fps'; document.body.appendChild(el); }
        if (el) el.style.display = on ? 'block' : 'none';
        if (on && !raf) { n = 0; t0 = 0; raf = requestAnimationFrame(tick); }
        if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
      },
    };
    return M;
  })();
  shell.fps = fps;
  // Show FPS lives in the GameTiers prefs when tiers are mounted (one switch for both menus), else in shell prefs
  const tiersCur = cfg.tiers && GT ? (cfg.tiers.current || GT.resolve({ ns: cfg.tiers.ns || ns })) : null;
  const tiersNs = cfg.tiers ? (cfg.tiers.ns || ns) : null;
  const tiersPrefs = tiersCur ? GT.loadPrefs(tiersNs) : null;
  if (cfg.fps !== false) {
    const want = tiersCur ? !!tiersCur.showFps : !!shell.prefs.showFps;
    if (want) (document.body ? fps.show(true) : addEventListener('DOMContentLoaded', () => fps.show(true)));
  }

  // ════════════════════════════ the row engine (Tarnhollow 395's model) ════════════════════════════
  // Every focusable line registers { el, act?, adj?, dis?, tabs? }; focus = index into ui.rows. Arrow keys / D-pad move,
  // left/right adjust, Enter / A act. One engine for the title, the pause card, settings and confirms.
  const ui = {
    rows: [], focus: 0, view: 'closed', tab: 'audio', standalone: false, flash: '', flashT: 0, keepFocus: null, openedAt: 0,
    row(el, o) {
      o = o || {}; o.el = el; ui.rows.push(o); const i = ui.rows.length - 1;
      el.addEventListener('mouseenter', () => { const k = ui.rows.indexOf(o); if (k >= 0 && !o.dis) ui.setFocus(k); });
      return o;
    },
    setFocus(i) {
      const R = ui.rows; if (!R.length) return;
      i = Math.max(0, Math.min(R.length - 1, i));
      R.forEach((r, k) => r.el.classList.toggle('f', k === i));
      ui.focus = i;
      const b = R[i].el; if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
    },
    move(d) {
      const R = ui.rows; if (!R.length) return;
      let i = ui.focus;
      for (let n = 0; n < R.length; n++) { i = (i + d + R.length) % R.length; if (!R[i].dis) break; }
      ui.setFocus(i);
    },
    group(body, t) { const g = document.createElement('div'); g.className = 'grp'; g.textContent = t; body.appendChild(g); return g; },
    line(body, label, hintTxt, badge, dis) {
      const r = document.createElement('div'); r.className = 'row' + (dis ? ' dis' : '');
      r.innerHTML = '<div class="lb">' + esc(label) + (badge ? '<span class="badge">' + esc(badge) + '</span>' : '') +
        (hintTxt ? '<span class="hint">' + esc(hintTxt) + '</span>' : '') + '</div><div class="ctl0"></div><div class="val"></div>';
      body.appendChild(r); return r;
    },
    /** slider: { label, hint, badge, dis, min, max, step, get(), set(v), fmt(v) } */
    slider(body, o) {
      const r = ui.line(body, o.label, val(o.hint), o.badge, o.dis);
      const inp = document.createElement('input'); inp.type = 'range'; inp.min = o.min; inp.max = o.max; inp.step = o.step;
      inp.tabIndex = -1; inp.disabled = !!o.dis;
      const v0 = r.querySelector('.val'), fmt = o.fmt || ((v) => String(v));
      const paint = () => { const v = o.get(); inp.value = v; inp.style.setProperty('--p', ((v - o.min) / (o.max - o.min) * 100) + '%'); v0.textContent = fmt(v); };
      inp.oninput = () => { o.set(+inp.value); paint(); };
      r.querySelector('.ctl0').appendChild(inp); paint();
      ui.row(r, { dis: !!o.dis, adj: (d) => { const v = Math.min(o.max, Math.max(o.min, +(o.get() + d * o.step).toFixed(4))); o.set(v); paint(); } });
      return r;
    },
    /** choice: { label, hint, badge, dis, opts: [[value, label, hidden?]], get(), set(v), val(v), refresh } — refresh repaints the tab */
    choice(body, o) {
      const r = ui.line(body, o.label, val(o.hint), o.badge, o.dis);
      const seg = document.createElement('div'); seg.className = 'seg';
      const v0 = r.querySelector('.val');
      const opts = o.opts.filter((x) => !x[2]);
      const paint = () => { const v = o.get(); seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b._v === v)); v0.textContent = o.val ? o.val(v) : ''; };
      const after = () => { if (o.refresh) ui.refresh(); else paint(); };
      for (const [v, label] of opts) {
        const b = document.createElement('button'); b._v = v; b.textContent = label; b.tabIndex = -1; b.disabled = !!o.dis; b.type = 'button';
        b.onclick = (e) => { e.stopPropagation(); o.set(v); after(); };
        seg.appendChild(b);
      }
      r.querySelector('.ctl0').appendChild(seg); paint();
      ui.row(r, { dis: !!o.dis,
        adj: (d) => { const i = opts.findIndex((x) => x[0] === o.get()); const n = opts[Math.max(0, Math.min(opts.length - 1, (i < 0 ? 0 : i) + d))];
                      if (n && n[0] !== o.get()) { o.set(n[0]); after(); } },
        act: () => { const i = opts.findIndex((x) => x[0] === o.get()); o.set(opts[(i + 1) % opts.length][0]); after(); } });
      return r;
    },
    /** a menu item button (pause list / confirm): host, label, act, { dis, cls, title } */
    item(host, label, act, o) {
      o = o || {};
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'it' + (o.dis ? ' dis' : '') + (o.cls ? ' ' + o.cls : ''); b.textContent = label;
      if (o.id) b.dataset.item = o.id;
      if (o.title) b.title = o.title;
      const r = ui.row(b, { act, dis: !!o.dis, id: o.id });
      b.onclick = () => { if (!r.dis) act(); };
      host.appendChild(b); return r;
    },
    note(body, html) { const n = document.createElement('div'); n.className = 'note'; n.innerHTML = html; body.appendChild(n); return n; },
    /** controls table: groups = [[group, [[action, keyboard, pad]]]]; ' / ' separates alternatives; pad names A B X Y LB RB LT RT ... */
    controlsTable(body, groups, noteHtml) {
      const keys = (k, pad) => {
        if (k === '–' || k == null) return '<span class="na">–</span>';
        return String(k).split(' / ').map((alt) => alt.split(' ').map((x) => {
          if (x === '·' || x === '–' || x === '+' || x === '(hold)' || x === '(tap)') return '<span class="na">' + esc(x) + '</span>';
          if (pad && XBOX[x]) return glyph(x);
          return '<kbd>' + esc(x) + '</kbd>';
        }).join(' ')).join(' <span class="na">/</span> ');
      };
      const g = document.createElement('div'); g.className = 'ctl';
      let h = '<div class="k hdr"><span></span><b>KEYBOARD &amp; MOUSE</b><b>CONTROLLER</b></div>';
      for (const [grp, rows] of groups) {
        h += '<div class="grp">' + esc(grp) + '</div>';
        for (const [what, k, p] of rows) h += '<div class="k"><span>' + esc(what) + '</span><b>' + keys(k, false) + '</b><b>' + keys(p, true) + '</b></div>';
      }
      g.innerHTML = h; body.appendChild(g);
      if (noteHtml) ui.note(body, noteHtml);
      return g;
    },
    refresh() {
      if (ui.view === 'settings') { ui.keepFocus = ui.focus; const b = ov.querySelector('.body'), top = b ? b.scrollTop : 0; settings.open(ui.tab, { keep: true }); const b2 = ov.querySelector('.body'); if (b2) b2.scrollTop = top; }
      else if (ui.view === 'main') pause.render(true);
    },
    flashMsg(s) {
      ui.flash = s; clearTimeout(ui.flashT);
      const f = ov && ov.querySelector('.flash'); if (f) f.textContent = s;
      ui.flashT = setTimeout(() => { ui.flash = ''; const f2 = ov && ov.querySelector('.flash'); if (f2) f2.textContent = ''; }, 4000);
    },
  };
  shell.ui = ui;

  // ════════════════════════════ the overlay (pause / settings / confirm) ════════════════════════════
  const CORNERS = '<i class="cn a"></i><i class="cn b"></i><i class="cn c"></i><i class="cn d"></i>';
  const crestHtml = () => {
    const c = cfg.crest; if (!c) return '';
    if (!/^\s*</.test(c)) return '<img class="crest" alt="" src="' + esc(c) + '">';
    return /class="crest"/.test(c) ? c : c.replace(/^\s*<svg/, '<svg class="crest"');
  };
  const ov = document.createElement('div'); ov.className = 'gs-ov'; ov.id = cfg.overlayId || 'gs-ov';
  ov.innerHTML = '<div class="bd"></div><div class="card"></div>';
  ov.addEventListener('contextmenu', (e) => e.preventDefault());
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('bd')) back(); });   // tap outside the card = back
  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'wheel'].forEach((t) => ov.addEventListener(t, (e) => e.stopPropagation()));
  const attach = (el) => (document.body ? document.body.appendChild(el) : addEventListener('DOMContentLoaded', () => document.body.appendChild(el)));
  attach(ov);
  shell.overlay = ov;
  const ovOpen = () => ov.classList.contains('on');
  function card(wide) { const c = ov.querySelector('.card'); c.className = 'card' + (wide ? ' wide' : ''); ui.rows = []; return c; }
  ui.card = card;
  const KEYS_MAIN = () => hint(['&uarr;', '&darr;'], ['DPAD'], 'choose') + hint(['ENTER'], ['A'], 'select') + hint(['ESC'], ['B'], 'resume');
  const KEYS_SET = () => hint(['&uarr;', '&darr;'], ['DPAD'], 'choose') + hint(['&larr;', '&rarr;'], ['LEFT', 'RIGHT'], 'adjust') +
    hint(['Q', 'E'], ['LB', 'RB'], 'tabs') + hint(['ESC'], ['B'], 'back');
  const KEYS_CONFIRM = () => hint(['&uarr;', '&darr;'], ['DPAD'], 'choose') + hint(['ENTER'], ['A'], 'select') + hint(['ESC'], ['B'], 'back');
  shell.keys = { main: KEYS_MAIN, settings: KEYS_SET, confirm: KEYS_CONFIRM };

  // ── confirm ──
  /** confirm({ title, text (html), buttons: [[label, act, cls]], back() }) — inside the overlay; opens it standalone if closed */
  function confirm(o) {
    if (!ovOpen()) { ov.classList.add('on', 'solo'); ui.standalone = true; ui.openedAt = performance.now(); }
    ui.view = 'confirm:' + (o.kind || 'ask'); ui.back = o.back || null;
    const c = card(false);
    c.innerHTML = CORNERS + '<div class="confirm"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '>' + crestHtml() + '<div class="ttl" style="font-size:19px;letter-spacing:.16em;padding-left:.16em">' +
      esc(o.title) + '</div><div class="rule"></div><p>' + (o.text || '') + '</p><div class="menu"></div></div><div class="keys">' + KEYS_CONFIRM() + '</div>';
    const host = c.querySelector('.menu');
    for (const [label, act, cls, id] of o.buttons) { const r = ui.item(host, label, act, { cls }); if (id) r.el.id = id; }
    ui.setFocus(o.focus || 0);
    syncOwner();
  }
  shell.confirm = confirm;
  /** info({ title, html, back }) — a scrollable card (credits, about, a help page). Up / down scroll it; Esc / B / Back close it. */
  function info(o) {
    if (!ovOpen()) { ov.classList.add('on', 'solo'); ui.standalone = true; ui.openedAt = performance.now(); }
    ui.view = 'info'; ui.back = o.back || null;
    const c = card(true);
    c.innerHTML = CORNERS + '<div class="hd"><div class="ttl">' + esc(o.title || '') + '</div><button class="back" type="button">' +
      (ui.standalone ? 'CLOSE &times;' : '&larr; BACK') + '</button></div><div class="body info">' + (o.html || '') + '</div><div class="keys">' +
      hint(['&uarr;', '&darr;'], ['DPAD'], 'scroll') + hint(['ESC'], ['B'], 'back') + '</div>';
    c.querySelector('.back').onclick = () => back();
    syncOwner();
  }
  shell.info = info;
  function closeOverlay() {
    ov.classList.remove('on', 'solo'); ui.view = 'closed'; ui.standalone = false; ui.rows = [];
    ov.querySelector('.card').innerHTML = '';          // nothing of a closed card stays findable (ids, focus)
    shell.closedAt = performance.now();
    syncOwner();
    if (title.visible()) title.focusFirst(true);
  }
  shell.closeOverlay = closeOverlay;

  // ── pause ──
  const PAUSE_DEF = {
    resume:   { label: 'Resume', act: () => pause.resume() },
    settings: { label: 'Settings', act: () => settings.open(null) },
    save:     { label: 'Save', show: () => !!(cfg.onSave || shell.save.adapter), act: () => pause.doSave() },
    load:     { label: 'Load', show: () => !!(cfg.onLoad || shell.save.adapter), disabled: () => !shell.save.has(),
                title: () => { const i = shell.save.info(); return i ? 'last save ' + i.label : 'no save yet'; }, act: () => pause.askLoad() },
    controls: { label: 'Controls', show: () => !!(cfg.controls || (cfg.settings && cfg.settings.controls)), act: () => settings.open('controls') },
    quit:     { label: 'Quit to title', cls: 'danger', act: () => pause.askQuit() },
  };
  const norm = (list, DEF) => (list || []).map((x) => (typeof x === 'string' ? Object.assign({}, DEF[x], { id: x }) : Object.assign({}, DEF[x.id] || {}, x)));
  const pause = {
    items: norm(cfg.pauseMenu || ['resume', 'settings', 'save', 'load', 'controls', 'quit'], PAUSE_DEF),
    get isOpen() { return ovOpen() && !ui.standalone; },
    /** replace the list (same forms as cfg.pauseMenu) */
    setItems(list) { pause.items = norm(list, PAUSE_DEF); if (ui.view === 'main') pause.render(true); },
    /** insert an item ({ id, label, act, show, disabled, title, cls }) at index (default: before Settings) */
    insert(item, at) {
      pause.items = pause.items.filter((x) => x.id !== item.id);
      const i = at != null ? at : Math.max(0, pause.items.findIndex((x) => x.id === 'settings'));
      pause.items.splice(i, 0, Object.assign({}, PAUSE_DEF[item.id] || {}, item));
      if (ui.view === 'main') pause.render(true);
    },
    open() {
      if (pause.isOpen && ui.view === 'main') return;
      ui.openedAt = performance.now(); ui.standalone = false;
      ov.classList.remove('solo'); ov.classList.add('on');
      pause.render(false);
      syncOwner();
      call(cfg.onPause, true);
    },
    /** close the overlay (programmatic; fires onPause(false)) */
    close() {
      if (!ovOpen()) return;
      const was = !ui.standalone; closeOverlay();
      if (was) call(cfg.onPause, false);
    },
    /** the player asked to resume (Resume, Esc / B / Start at the main list): the game decides (onResume), default close() */
    resume() { if (cfg.onResume) call(cfg.onResume); else pause.close(); },
    toggle() { pause.isOpen ? pause.resume() : pause.open(); },
    render(keep) {
      ui.view = 'main';
      const c = card(false);
      c.innerHTML = CORNERS + crestHtml() + '<div class="ttl">' + esc(cfg.pauseTitle || cfg.title || 'PAUSED') + '</div>' +
        (cfg.pauseSubtitle ? '<div class="sub">' + esc(cfg.pauseSubtitle) + '</div>' : '') +
        '<div class="rule"></div><div class="menu"></div><div class="rule" style="margin-top:12px"></div>' +
        '<div class="stat">' + (cfg.stat ? (call(cfg.stat) || '') : '') + '</div><div class="flash">' + esc(ui.flash) + '</div>' +
        '<div class="keys">' + KEYS_MAIN() + '</div>';
      const host = c.querySelector('.menu');
      for (const it of pause.items) {
        if (it.show && !call(it.show)) continue;
        ui.item(host, val(it.label), () => it.act(), { id: it.id, dis: !!(it.disabled && call(it.disabled)), cls: it.cls, title: it.title ? call(it.title) : '' });
      }
      ui.setFocus(keep ? ui.focus : 0);
      if (ui.rows[ui.focus] && ui.rows[ui.focus].dis) ui.move(1);
      call(cfg.onPauseRender, c);
    },
    doSave() {
      let ok;
      if (shell.save.adapter) ok = shell.save.write();
      else { const d = call(cfg.onSave); ok = d !== undefined && d !== false && shell.save.write(d); }
      ui.flashMsg(ok ? 'Saved — ' + clock() : 'Could not save');
      if (ui.view === 'main') pause.render(true);
      return ok;
    },
    askLoad() {
      const i = shell.save.info();
      confirm({ kind: 'load', title: text.loadAsk, back: () => pause.render(),
        text: i ? 'Saved ' + esc(i.label) + (cfg.saveDetail ? esc(call(cfg.saveDetail, i)) : '') + '.<br>' + text.loadText : 'There is no save yet.',
        buttons: i ? [['Load it', () => { const s = shell.save.read(); pause.resume(); call(cfg.onLoad, s); }], ['Cancel', () => pause.render()]] : [['Back', () => pause.render()]] });
    },
    askQuit() {
      const canSave = !!(cfg.onSave || shell.save.adapter);
      confirm({ kind: 'quit', title: text.quitAsk, text: text.quitText, back: () => pause.render(),
        buttons: (canSave ? [['Save and quit', () => pause.quit(true)], ['Quit without saving', () => pause.quit(false), 'danger']] : [['Quit', () => pause.quit(false), 'danger']])
          .concat([['Stay', () => pause.render()]]) });
    },
    quit(save) {
      if (save) { if (shell.save.adapter) shell.save.write(); else { const d = call(cfg.onSave); if (d !== undefined && d !== false) shell.save.write(d); } }
      if (cfg.onQuitToTitle) { closeOverlay(); call(cfg.onQuitToTitle, save); } else location.reload();
    },
  };
  shell.pause = pause;

  // ── settings ──
  const DEFAULT_TABS = [['audio', 'Audio'], ['graphics', 'Graphics'], ['gameplay', 'Gameplay'], ['controls', 'Controls']];
  const S = cfg.settings || {};
  const extenders = {};
  const settings = {
    tabs: (S.tabs || DEFAULT_TABS).map((t) => (Array.isArray(t) ? { id: t[0], label: t[1] } : t)),
    /** add rows to a tab: fn(ui, body, shell) runs after the tab's own rows (a game's extra settings) */
    extend(tab, fn) { (extenders[tab] = extenders[tab] || []).push(fn); },
    open(tab, o) {
      o = o || {};
      if (o.standalone || (!ovOpen() && !o.keep)) { ui.standalone = true; ov.classList.add('on', 'solo'); ui.openedAt = performance.now(); }
      ui.view = 'settings';
      const ids = settings.tabs.map((t) => t.id);
      ui.tab = tab && ids.includes(tab) ? tab : (ids.includes(ui.tab) ? ui.tab : ids[0]);
      const c = card(true);
      c.innerHTML = CORNERS + '<div class="hd"><div class="ttl">SETTINGS</div><button class="back" type="button">' +
        (ui.standalone ? 'CLOSE &times;' : '&larr; BACK') + '</button></div><div class="tabs"></div><div class="body"></div><div class="keys">' + KEYS_SET() + '</div>';
      c.querySelector('.back').onclick = () => back();
      const tabs = c.querySelector('.tabs');
      tabs.insertAdjacentHTML('beforeend', '<span class="tglyph">' + glyph('LB') + '</span>');
      for (const t of settings.tabs) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tab' + (t.id === ui.tab ? ' on' : ''); b.textContent = t.label;
        b.onclick = () => settings.open(t.id, { keep: true }); tabs.appendChild(b);
      }
      tabs.insertAdjacentHTML('beforeend', '<span class="tglyph">' + glyph('RB') + '</span>');
      ui.row(tabs, { adj: (d) => settings.step(d), act: () => settings.step(1), tabs: true });
      const body = c.querySelector('.body');
      const T = settings.tabs.find((t) => t.id === ui.tab);
      const own = (T && T.build) || S[ui.tab] || (S.defaults === false ? null : BUILTIN[ui.tab]);
      if (own) own(ui, body, shell);
      for (const fn of extenders[ui.tab] || []) call(fn, ui, body, shell);
      ui.setFocus(ui.keepFocus != null ? ui.keepFocus : 0); ui.keepFocus = null;
      syncOwner();
    },
    step(d) {
      const i = settings.tabs.findIndex((t) => t.id === ui.tab), n = settings.tabs.length;
      settings.open(settings.tabs[(i + d + n) % n].id, { keep: true });
    },
    get isOpen() { return ovOpen() && ui.view === 'settings'; },
  };
  shell.settings = settings;

  // ── fullscreen: shell.fullscreen.enter() / exit() / toggle() / auto(); cfg.orientation 'landscape' (default) | 'portrait' | null ──
  const fullscreen = {
    supported: FS_OK, inApp: IN_APP, active: () => !!fsEl(),
    /** call inside a user gesture (a click / tap handler), before any await */
    enter() {
      if (!FS_OK() || fsEl()) return Promise.resolve(false);
      const el = document.documentElement, req = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
      return Promise.resolve(req).then(() => {
        const o = cfg.orientation === undefined ? 'landscape' : cfg.orientation;
        if (o && COARSE() && root.screen && screen.orientation && screen.orientation.lock) return screen.orientation.lock(o).catch(() => {});   // unsupported or refused: ignore
      }).then(() => true, () => false);
    },
    exit() { if (!fsEl()) return Promise.resolve(); try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* */ } return (document.exitFullscreen ? document.exitFullscreen() : Promise.resolve(document.webkitExitFullscreen && document.webkitExitFullscreen())).catch(() => {}); },
    toggle() { return fsEl() ? fullscreen.exit() : fullscreen.enter(); },
    /** the "Start in fullscreen" preference: enter if it is on (Play / Continue call this) */
    auto() { if (cfg.fullscreen !== false && shell.prefs.fullscreen && FS_OK() && !fsEl()) return fullscreen.enter(); return Promise.resolve(false); },   // cfg.fullscreen:false = the game owns it (Tarnhollow)
  };
  shell.fullscreen = fullscreen;
  addEventListener('fullscreenchange', () => { if (title.visible && title.visible()) title.render(); });
  // a game without the shell's title card (Palm Tree, BREACH): the first touch is the gesture
  if (cfg.title === false || cfg.titleScreen === false) {
    const first = (e) => { if (e.pointerType && e.pointerType !== 'touch') return; removeEventListener('pointerup', first, true); fullscreen.auto(); };
    addEventListener('pointerup', first, true);
  }
  // Settings > Graphics always ends with the fullscreen row (after the game's own graphics rows, before its extenders)
  settings.extend('graphics', (u, body) => {
    if (!FS_OK() || cfg.fullscreen === false) return;
    u.choice(body, { label: 'Start in fullscreen', hint: COARSE() ? 'on the first Play or Continue' : 'on Play or Continue', opts: ONOFF, get: () => !!shell.prefs.fullscreen,
      set: (v) => { shell.setPref('fullscreen', v); if (v) fullscreen.enter(); else fullscreen.exit(); } });
  });

  const pct = (v) => Math.round(v * 100) + '%';
  const ONOFF = [[false, 'Off'], [true, 'On']];
  shell.ONOFF = ONOFF; shell.pct = pct;
  // built-in tab rows: what a new game gets for free (each writes shell.prefs and calls cfg.onPref)
  const BUILTIN = {
    audio(u, body) {
      u.group(body, 'Levels');
      u.slider(body, { label: 'Master', min: 0, max: 1, step: 0.05, get: () => shell.prefs.master, set: (v) => shell.setPref('master', v), fmt: pct });
      u.slider(body, { label: 'Music', min: 0, max: 1, step: 0.05, get: () => shell.prefs.music, set: (v) => shell.setPref('music', v), fmt: pct });
      u.slider(body, { label: 'Effects', min: 0, max: 1, step: 0.05, get: () => shell.prefs.sfx, set: (v) => shell.setPref('sfx', v), fmt: pct });
    },
    graphics(u, body) {
      if (tiersCur) tiersRows(u, body);
      else u.choice(body, { label: 'Show FPS', opts: ONOFF, get: () => !!shell.prefs.showFps, set: (v) => shell.setPref('showFps', v) });
    },
    gameplay(u, body) {
      u.group(body, 'Camera');
      u.slider(body, { label: 'Camera sensitivity', min: 0.25, max: 3, step: 0.05, get: () => shell.prefs.sens, set: (v) => shell.setPref('sens', v), fmt: (v) => v.toFixed(2) + '×' });
      u.choice(body, { label: 'Invert Y', opts: ONOFF, get: () => !!shell.prefs.invertY, set: (v) => shell.setPref('invertY', v) });
      if (cfg.fov) u.slider(body, { label: 'Field of view', min: cfg.fov.min || 45, max: cfg.fov.max || 90, step: 1,
        get: () => shell.prefs.fov || cfg.fov.default || 60, set: (v) => shell.setPref('fov', v), fmt: (v) => v + '°' });
      u.group(body, 'Controller');
      u.choice(body, { label: 'Controller rumble', opts: ONOFF, get: () => shell.prefs.rumble !== false, set: (v) => shell.setPref('rumble', v) });
    },
    controls(u, body) {
      u.controlsTable(body, val(cfg.controls) || [], cfg.controlsNote ? val(cfg.controlsNote) : '');
    },
  };
  shell.builtinTabs = BUILTIN;
  // GameKit tiers rows (Quality / Frame rate / Show FPS): the definitions come from tiers.js, the shell only draws them
  function tiersRows(u, body) {
    const onChange = (k, v, p) => { if (k === 'showFps' && cfg.fps !== false) fps.show(v); call(cfg.tiers.onChange, k, v, p); };
    const R = GT.settingRows ? GT.settingRows({ ns: tiersNs, current: tiersCur, prefs: tiersPrefs, onChange }) : [];
    u.group(body, 'Quality');
    for (const r of R) u.choice(body, { label: r.label, hint: r.hint, opts: r.opts, get: r.get, set: r.set, refresh: true });
    const pend = GT.settingRows && R.pending && R.pending();
    if (pend) {
      u.note(body, 'Quality changes rebuild the world: they apply when the game restarts.');
      const host = document.createElement('div'); body.appendChild(host);
      u.item(host, 'Restart now', () => call(cfg.tiers.onReload || (() => location.reload())));
    }
  }
  shell.tiersRows = tiersRows;

  function back() {
    const v = ui.view;
    if (v === 'main') return pause.resume();
    if (v === 'settings') return ui.standalone ? closeOverlay() : pause.render();
    if (v.startsWith('confirm') || v === 'info') { if (ui.back) return ui.back(); return ui.standalone ? closeOverlay() : pause.render(); }
    closeOverlay();
  }
  shell.back = back;

  // ════════════════════════════ title ════════════════════════════
  const TITLE_DEF = {
    continue:   { domId: 'gs-continue', label: 'Continue', disabled: () => !shell.save.has(), act: () => title.doContinue() },
    new:        { domId: 'gs-new', label: 'New game', act: () => title.doNew() },
    settings:   { domId: 'gs-settings', label: 'Settings', act: () => settings.open(null, { standalone: true }) },
    fullscreen: { domId: 'gs-fs', label: () => (document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'),
                  show: () => FS_OK(),   // touch too: phones are where fullscreen matters most
                  act: () => fullscreen.toggle().then(() => title.render()) },
    credits:    { domId: 'gs-credits', label: 'Credits', show: () => !!cfg.onCredits, act: () => call(cfg.onCredits) },
    quit:       { domId: 'gs-quit', label: 'Quit', show: () => !!cfg.onQuit, act: () => call(cfg.onQuit) },
  };
  const tEl = cfg.titleEl || document.createElement('div');
  tEl.classList.add('gs-title'); if (!cfg.titleEl) tEl.id = cfg.titleId || 'gs-title';
  const title = {
    el: tEl,
    items: norm(cfg.menu || ['continue', 'new', 'settings', 'fullscreen', 'credits', 'quit'], TITLE_DEF),
    rows: [], focus: 0, busy: false,
    visible: () => tEl.isConnected && tEl.style.display !== 'none' && !tEl.hidden,
    render() {
      const logo = cfg.logo ? (/^\s*</.test(cfg.logo) ? cfg.logo : '<img class="gs-logo" alt="" src="' + esc(cfg.logo) + '">') : '';
      tEl.innerHTML = (cfg.art ? '<div class="gs-art" style="background-image:url(\'' + esc(cfg.art) + '\')"></div>' : '<div class="gs-art"></div>') + '<div class="gs-scrim"></div>' +
        logo + (cfg.title && !cfg.hideTitleText ? '<h1>' + esc(cfg.title) + '</h1>' : '') + (cfg.subtitle ? '<p class="gs-tag">' + esc(cfg.subtitle) + '</p>' : '') + (cfg.blurb ? '<p class="gs-blurb">' + cfg.blurb + '</p>' : '') +
        '<div class="gs-items"></div>' + (cfg.titleFoot ? '<div class="gs-foot">' + cfg.titleFoot + '</div>' : '') +
        (cfg.version ? '<div class="gs-ver">' + esc(cfg.version) + '</div>' : '');
      const host = tEl.querySelector('.gs-items');
      title.rows = [];
      for (const it of title.items) {
        if (it.show && !call(it.show)) continue;
        const b = document.createElement('button'); b.type = 'button'; b.id = val(it.domId) || 'gs-' + it.id; b.dataset.item = it.id; b.textContent = val(it.label);
        b.disabled = !!(it.disabled && call(it.disabled));
        if (it.title) b.title = call(it.title) || '';
        b.onclick = () => { if (!b.disabled && !title.busy) it.act(b); };
        b.addEventListener('mouseenter', () => { const k = title.rows.indexOf(b); if (k >= 0 && !b.disabled) title.setFocus(k); });
        host.appendChild(b); title.rows.push(b);
      }
      title.focusFirst(!title.visible());
      call(cfg.onTitleRender, tEl);
    },
    setFocus(i, quiet) {
      const R = title.rows; if (!R.length) return;
      title.focus = Math.max(0, Math.min(R.length - 1, i));
      R.forEach((b, k) => b.classList.toggle('f', k === title.focus));
      if (!quiet) try { R[title.focus].focus({ preventScroll: true }); } catch (e) { /* */ }
    },
    focusFirst(quiet) { const i = title.rows.findIndex((b) => !b.disabled); title.setFocus(i < 0 ? 0 : i, quiet); },
    move(d) {
      const R = title.rows; if (!R.length) return;
      let i = title.focus;
      for (let n = 0; n < R.length; n++) { i = (i + d + R.length) % R.length; if (!R[i].disabled) break; }
      title.setFocus(i);
    },
    press() { const b = title.rows[title.focus]; if (b && !b.disabled) b.click(); },
    show() { tEl.style.display = ''; title.render(); syncOwner(); },
    hide() { tEl.style.display = 'none'; syncOwner(); },
    async doContinue() {
      fullscreen.auto();                               // still inside the tap: requestFullscreen needs the gesture
      if (!shell.save.has()) return;
      title.busy = true;
      try { await call(cfg.onContinue, shell.save.read()); } finally { title.busy = false; }
    },
    doNew() {
      fullscreen.auto();
      const go = (replacing) => call(cfg.onNewGame, { replacing });
      if (!shell.save.has() || cfg.askBeforeNew === false) return go(false);
      confirm({ kind: 'new', id: cfg.newGameAskId, title: text.newGameAsk, text: esc(text.newGameSub), focus: 0,
        buttons: [['Cancel', () => closeOverlay(), '', (cfg.newGameIds || [])[0]], [text.newGameYes, () => { closeOverlay(); go(true); }, '', (cfg.newGameIds || [])[1]]] });
    },
  };
  shell.title = title;
  if (cfg.title !== false && cfg.titleScreen !== false) {
    if (!cfg.titleEl) attach(tEl);
    const r = () => title.render();
    if (cfg.renderTitle !== false) document.body ? r() : addEventListener('DOMContentLoaded', r);
    if (cfg.startHidden) tEl.style.display = 'none';
  }

  // ════════════════════════════ loading screen ════════════════════════════
  const lEl = document.createElement('div'); lEl.className = 'gs-load'; lEl.id = (cfg.loading && cfg.loading.id) || 'gs-load';
  const L = cfg.loading || {};
  lEl.innerHTML = (L.art || cfg.art ? '<div class="gs-art" style="background-image:url(\'' + esc(L.art || cfg.art) + '\')"></div>' : '') +
    '<div class="box"><div class="ttl">' + esc(L.title != null ? L.title : (cfg.title || '')) + '</div><div class="msg"></div><div class="bar"><i></i></div><div class="tip"></div></div>';
  attach(lEl);
  const loading = {
    el: lEl, k: 0,
    /** show(msg?) — call before heavy work; tips rotate from cfg.loading.tips */
    show(msg) {
      lEl.style.opacity = '1'; lEl.classList.add('on'); loading.progress(0, msg);
      const tips = L.tips || []; clearInterval(loading._tt);
      if (tips.length) { let i = Math.floor(Math.random() * tips.length); const set = () => { lEl.querySelector('.tip').textContent = tips[i++ % tips.length]; }; set(); loading._tt = setInterval(set, 6000); }
    },
    /** progress(0..1, msg?) */
    progress(k, msg) {
      loading.k = Math.max(0, Math.min(1, k || 0));
      lEl.querySelector('.bar i').style.width = (loading.k * 100).toFixed(1) + '%';
      if (msg != null) lEl.querySelector('.msg').textContent = msg;
    },
    hide(fadeMs) {
      clearInterval(loading._tt);
      const ms = fadeMs == null ? 600 : fadeMs;
      if (!ms) { lEl.classList.remove('on'); return; }
      lEl.style.opacity = '0'; setTimeout(() => { if (lEl.style.opacity === '0') lEl.classList.remove('on'); }, ms);
    },
    get on() { return lEl.classList.contains('on'); },
    /** hide, then take the element out of the page (harnesses that wait for #loading to disappear) */
    done(fadeMs) { const ms = fadeMs == null ? 600 : fadeMs; loading.hide(ms); setTimeout(() => lEl.remove(), ms + 50); },
  };
  shell.loading = loading;

  // ════════════════════════════ keyboard ════════════════════════════
  function navKey(k, e) {
    const R = ui.rows, r = R[ui.focus];
    if (k === 'Escape') {
      if (ui.view === 'main' && performance.now() - ui.openedAt < 250) return;   // the Esc that released pointer lock also opened us
      return back();
    }
    // a settings tab with no rows (the controls table) or an info card: up / down scroll it instead
    if ((ui.view === 'settings' && R.length <= 1) || ui.view === 'info') {
      const b = ov.querySelector('.body');
      if (b && (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS')) { b.scrollTop += (k === 'ArrowDown' || k === 'KeyS') ? 70 : -70; return; }
      if (b && (k === 'PageDown' || k === 'PageUp')) { b.scrollTop += k === 'PageDown' ? 200 : -200; return; }
    }
    if (k === 'ArrowUp' || k === 'KeyW') return ui.move(-1);
    if (k === 'ArrowDown' || k === 'KeyS') return ui.move(1);
    if (ui.view === 'settings' && (k === 'KeyQ' || (k === 'Tab' && e && e.shiftKey))) return settings.step(-1);
    if (ui.view === 'settings' && (k === 'KeyE' || k === 'Tab')) return settings.step(1);
    if (k === 'ArrowLeft' || k === 'KeyA') { if (r && r.adj && !r.dis) r.adj(-1); return; }
    if (k === 'ArrowRight' || k === 'KeyD') { if (r && r.adj && !r.dis) r.adj(1); return; }
    if (k === 'Enter' || k === 'NumpadEnter' || k === 'Space') { if (r && r.act && !r.dis) r.act(); }
  }
  shell.nav = navKey;
  addEventListener('keydown', (e) => {
    if (root.GameTiers && root.GameTiers.menuOpen) return;                  // the tiers Graphics menu owns the keys while it is up
    if (ovOpen()) {
      e.preventDefault(); e.stopImmediatePropagation();                     // the overlay owns the keyboard while it is up
      if (cfg.onKey && call(cfg.onKey, e, ui.view)) return;
      if (e.repeat && (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter')) return;
      navKey(e.code, e); return;
    }
    if (title.visible()) {
      const k = e.code;
      if (k === 'ArrowUp' || k === 'KeyW') { e.preventDefault(); title.move(-1); }
      else if (k === 'ArrowDown' || k === 'KeyS') { e.preventDefault(); title.move(1); }
      else if ((k === 'Enter' || k === 'Space' || k === 'NumpadEnter') && !e.repeat) {
        // a native button with focus already clicks itself on Enter/Space: only press when focus is elsewhere
        const b = title.rows[title.focus]; if (document.activeElement !== b) { e.preventDefault(); title.press(); }
      }
      return;
    }
    if (cfg.pauseKey !== false && e.code === (cfg.pauseKey || 'Escape') && !e.repeat && (!cfg.canPause || call(cfg.canPause))) { e.preventDefault(); pause.open(); }
  }, true);
  addEventListener('keyup', (e) => { if (ovOpen()) e.stopImmediatePropagation(); }, true);

  // ════════════════════════════ gamepad ════════════════════════════
  // D-pad / left stick: move (up/down) and adjust (left/right) · A: choose · B: back · LB/RB: settings tabs · Start: back /
  // resume, or pause in play (padPause) · nothing held when a screen opens counts as a press.
  let prevOwner, owning = false;
  function active() { return ovOpen() || title.visible(); }
  function syncOwner() {
    const a = active() && cfg.pad !== false;
    if (a && !owning) { prevOwner = root.__padOwner; root.__padOwner = 'shell'; owning = true; padPrev = []; }
    else if (!a && owning) { if (root.__padOwner === 'shell') root.__padOwner = prevOwner; owning = false; shell.closedAt = performance.now(); }
  }
  shell.syncOwner = syncOwner;
  /** true while a shell screen owns input, and for 250 ms after it closes (so the B that closed it does not also act in the game) */
  shell.busy = () => active() || performance.now() - shell.closedAt < 250;
  let padPrev = [], navT = 0, rafId = 0;
  function padLoop(t) {
    rafId = requestAnimationFrame(padLoop);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let g = null; for (const p of pads) if (p && p.connected) { g = p; break; }
    syncOwner();                                    // also with no pad: the game may hide the title itself (style.display)
    if (!g) { padPrev = []; return; }
    const b = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
    const now = g.buttons.map((x, i) => b(i));
    const lx = g.axes[0] || 0, ly = g.axes[1] || 0;
    if (now.some(Boolean) || Math.abs(lx) > 0.5 || Math.abs(ly) > 0.5) {
      if (shell.input.padId !== g.id) { shell.input.padId = g.id; shell.input.ps = /054c|dualsense|dualshock|playstation|wireless controller/i.test(g.id); }
      setMode('pad');
    }
    if (padPrev.length === 0) { padPrev = now; return; }
    const prev = padPrev, edge = (i) => now[i] && !prev[i];
    padPrev = now;
    if (root.GameTiers && root.GameTiers.menuOpen) return;
    if (!active()) {
      if (cfg.pad !== false && cfg.padPause !== false && edge(PB.START) && (!cfg.canPause || call(cfg.canPause))) pause.open();
      return;
    }
    if (cfg.pad === false) return;
    const dir = b(PB.UP) || ly < -0.6 ? 'ArrowUp' : b(PB.DOWN) || ly > 0.6 ? 'ArrowDown' : b(PB.LEFT) || lx < -0.6 ? 'ArrowLeft' : b(PB.RIGHT) || lx > 0.6 ? 'ArrowRight' : null;
    const onTitle = !ovOpen();
    if (dir) {
      if (t >= navT) {
        if (onTitle) { if (dir === 'ArrowUp') title.move(-1); else if (dir === 'ArrowDown') title.move(1); }
        else navKey(dir);
        navT = t + (navT ? 160 : 380);
      }
    } else navT = 0;
    if (edge(PB.A)) { if (onTitle) title.press(); else navKey('Enter'); }
    if (!onTitle) {
      if (edge(PB.B)) navKey('Escape');
      if (edge(PB.START)) { if (ui.view === 'main') pause.resume(); else back(); }
      if (ui.view === 'settings') { if (edge(PB.LB)) settings.step(-1); if (edge(PB.RB)) settings.step(1); }
    }
  }
  rafId = requestAnimationFrame(padLoop);
  addEventListener('gamepadconnected', () => { padPrev = []; });

  // ════════════════════════════ touch pause button ════════════════════════════
  // cfg.pauseButton: 'touch' (coarse pointers) | true (always) | false. Shown while the game could pause (canPause) and no card is up.
  let pBtn = null;
  const wantPBtn = cfg.pauseButton === true || ((cfg.pauseButton === 'touch' || cfg.pauseButton === undefined) && matchMedia('(pointer: coarse)').matches);
  if (wantPBtn && cfg.pauseKey !== false) {
    pBtn = document.createElement('button'); pBtn.type = 'button'; pBtn.className = 'gs-pausebtn'; pBtn.setAttribute('aria-label', 'Pause');
    pBtn.innerHTML = '<i></i><i></i>';
    ['pointerdown', 'touchstart', 'mousedown'].forEach((t) => pBtn.addEventListener(t, (e) => e.stopPropagation()));
    pBtn.addEventListener('click', (e) => { e.stopPropagation(); pause.open(); });
    attach(pBtn);
    const tickBtn = () => { requestAnimationFrame(tickBtn); const on = !active() && !loading.on && (!cfg.canPause || !!call(cfg.canPause)); if (pBtn.hidden === on) pBtn.hidden = !on; };
    requestAnimationFrame(tickBtn);
  }
  shell.pauseButton = pBtn;

  shell.unmount = () => { cancelAnimationFrame(rafId); ov.remove(); lEl.remove(); if (pBtn) pBtn.remove(); if (!cfg.titleEl) tEl.remove(); fps.show(false); };
  GameShell.current = shell;
  return shell;
}

const GameShell = { version: VERSION, mount, makeSave, PB, current: null, esc, clock };
root.GameShell = GameShell;
export default GameShell;
export { mount, makeSave };
