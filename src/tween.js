// Tiny tween runner. tick() returns true while anything is moving, so the app renders on demand.
const active = new Set();
export const ease = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
export function tween({ dur = 300, delay = 0, ease: e = ease.out, update, onStart }) {
  return new Promise((resolve) => {
    active.add({ t0: performance.now() + delay, dur: Math.max(1, dur), e, update, onStart, resolve, started: false });
  });
}
export const wait = (ms) => tween({ dur: ms, update() {} });
export function tick(now) {
  for (const tw of active) {
    const t = (now - tw.t0) / tw.dur;
    if (t < 0) continue;
    if (!tw.started) { tw.started = true; tw.onStart?.(); }
    const k = Math.min(1, t);
    if (tw.update(tw.e(k), k) === false || k >= 1) { active.delete(tw); tw.resolve(); }
  }
  return active.size > 0;
}
export const busy = () => active.size > 0;
