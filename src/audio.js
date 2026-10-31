// Synthesised sounds (no audio files): card snaps, flips, chip clacks, a win arpeggio.
import { store } from './store.js';
let ctx = null, master = null, noiseBuf = null;
export function unlockAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return; }
  }
  if (ctx.state === 'suspended') ctx.resume();
}
const on = () => ctx && store.settings.sound;
function noise(dur, freq, q, gain, when = 0, type = 'bandpass') {
  const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
}
function tone(freq, dur, gain, when = 0, type = 'sine') {
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}
export const sfx = {
  slide(when = 0) { if (on()) noise(0.09, 2400 + Math.random() * 800, 0.8, 0.25, when); },
  place(when = 0) { if (on()) { noise(0.05, 1500, 1.2, 0.35, when); noise(0.03, 300, 1, 0.3, when, 'lowpass'); } },
  flip(when = 0) { if (on()) { noise(0.04, 3200, 1.5, 0.25, when); noise(0.05, 1800, 1.5, 0.22, when + 0.06); } },
  shuffle() { if (on()) for (let i = 0; i < 14; i++) noise(0.04, 2600 + Math.random() * 1200, 1, 0.12, i * 0.035); },
  chip(when = 0) { if (on()) { tone(2600 + Math.random() * 300, 0.06, 0.12, when, 'triangle'); noise(0.03, 5000, 2, 0.15, when); } },
  bad() { if (on()) { tone(180, 0.12, 0.15, 0, 'square'); tone(140, 0.14, 0.12, 0.08, 'square'); } },
  tap() { if (on()) tone(880, 0.05, 0.08, 0, 'triangle'); },
  win() { if (on()) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 0.16, i * 0.09, 'triangle')); },
  lose() { if (on()) [392, 330, 262].forEach((f, i) => tone(f, 0.3, 0.13, i * 0.12, 'triangle')); },
};
