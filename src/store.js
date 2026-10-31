// Stats, settings and bankroll in localStorage, versioned. Reads and writes never throw.
const KEY = 'palmtree-cards-v1';
const fresh = () => ({
  v: 1,
  settings: { sound: true, draw: 1, deck: 'original' },
  sol: { played: 0, won: 0, streak: 0, bestStreak: 0, bestTime: null, bestMoves: null },
  votes: {}, // concept deck id -> "I'd buy this" taps on this device
  bj: { bank: 500, hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, peak: 500, rebuys: 0 },
});
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.v === 1) {
      const f = fresh();
      return { ...f, ...raw, settings: { ...f.settings, ...raw.settings }, sol: { ...f.sol, ...raw.sol }, bj: { ...f.bj, ...raw.bj } };
    }
  } catch (e) { /* private mode or corrupt: start fresh */ }
  return fresh();
}
export const store = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage blocked */ } }
export function resetStats() {
  const f = fresh(); store.sol = f.sol; store.bj = f.bj; save();
}
