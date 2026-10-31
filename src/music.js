// Music: my albums through an embedded YouTube player (IFrame API, privacy-enhanced host). YouTube's terms want
// the player visible while it plays (at least 200 x 200), so it lives in a small panel; closing the panel pauses it.
// Each album is a YouTube playlist id (the part after list= in its URL). Add more albums to the list; the panel's
// album button cycles through them. ?music=<list id> plays any playlist instead, for testing.
export const MUSIC = {
  artist: 'Sean McMagic',
  albums: [
    { name: 'The McMagic Mixtape', list: 'OLAK5uy_ldv0iOTRLvnJpqQRwsh1S9ldAD-SSKJIg' },
    { name: "It's a Beautiful Day", list: 'OLAK5uy_kYRs41pDxjGLaFxSp9kZfh1TzLq8l-Bh8' },
  ],
};

let player = null, ready = null, panel = null, album = 0;
const override = () => new URLSearchParams(location.search).get('music');
const albums = () => (override() ? [{ name: 'Playlist', list: override() }] : MUSIC.albums);

function loadApi() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { ready = null; reject(new Error('YouTube unreachable')); };
    document.head.append(s);
  });
  return ready;
}

function build() {
  panel = document.createElement('div'); panel.id = 'music'; panel.className = 'panel music-panel'; panel.hidden = true;
  panel.innerHTML = `<div class="music-head"><b>${MUSIC.artist}</b><span class="music-btns">
      <button class="btn sm" data-m="prev" aria-label="Previous track">⏮</button>
      <button class="btn sm" data-m="toggle" aria-label="Play or pause">⏯</button>
      <button class="btn sm" data-m="next" aria-label="Next track">⏭</button>
      <button class="btn sm" data-m="close" aria-label="Close music">✕</button></span></div>
    <button class="btn sm music-album" data-m="album"></button>
    <div class="music-frame"><div id="ytPlayer"></div><p class="music-empty" hidden>Add an album to <code>MUSIC.albums</code> in <code>src/music.js</code>.</p></div>`;
  document.body.append(panel);
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = b.dataset.m;
    if (a === 'close') return closeMusic();
    if (a === 'album') return nextAlbum();
    if (!player?.getPlayerState) return;
    if (a === 'toggle') player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
    else if (a === 'next') player.nextVideo();
    else if (a === 'prev') player.previousVideo();
  });
}
function label() {
  const list = albums(), b = panel.querySelector('.music-album');
  b.textContent = list.length ? `Album: ${list[album].name}${list.length > 1 ? '  ›' : ''}` : 'No album';
  b.disabled = list.length < 2;
}
function nextAlbum() {
  const list = albums(); if (list.length < 2) return;
  album = (album + 1) % list.length; label();
  player?.loadPlaylist?.({ listType: 'playlist', list: list[album].list, index: 0 }); // index is needed, or it keeps the old track
}

export async function openMusic(app) {
  if (!panel) build();
  panel.hidden = false; label();
  const list = albums();
  panel.querySelector('.music-empty').hidden = list.length > 0; if (!list.length) return;
  if (player) { player.playVideo?.(); return; }
  try {
    const YT = await loadApi();
    player = new YT.Player('ytPlayer', {
      host: 'https://www.youtube-nocookie.com', width: 240, height: 200,
      playerVars: { listType: 'playlist', list: list[album].list, playsinline: 1, rel: 0, autoplay: 1 },
    });
  } catch (e) { app?.toast('Music needs an internet connection'); }
}
export function closeMusic() { if (panel) panel.hidden = true; player?.pauseVideo?.(); }
export const musicOpen = () => !!panel && !panel.hidden;
