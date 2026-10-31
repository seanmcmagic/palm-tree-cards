// Music: my songs through an embedded YouTube player (IFrame API, privacy-enhanced host). YouTube's terms want
// the player visible while it plays (at least 200 x 200), so it lives in a small panel; closing the panel pauses it.
// TRACKS is the set list, in order (YouTube video ids); it loops. ?music=<playlist id> plays any playlist instead.
export const MUSIC = {
  artist: 'Sean McMagic',
  tracks: [
    { title: 'Intergalactic Hip Hop', id: 'P5vhge2Qax4' },   // The McMagic Mixtape
    { title: 'Heartbreak & Romance', id: 'NFKjEk_Cc3I' },     // The McMagic Mixtape
    { title: 'Piano Anatomy', id: 'XDciGzC5PDI' },            // The McMagic Mixtape
    { title: "It's a Beautiful Day", id: 'F4JfK-YA9ZE' },     // It's a Beautiful Day
  ],
};

let player = null, ready = null, panel = null;
const override = () => new URLSearchParams(location.search).get('music');

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
      <button class="btn sm" data-m="prev" aria-label="Previous song">⏮</button>
      <button class="btn sm" data-m="toggle" aria-label="Play or pause">⏯</button>
      <button class="btn sm" data-m="next" aria-label="Next song">⏭</button>
      <button class="btn sm" data-m="close" aria-label="Close music">✕</button></span></div>
    <p class="music-now">&nbsp;</p>
    <div class="music-frame"><div id="ytPlayer"></div></div>`;
  document.body.append(panel);
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const a = b.dataset.m;
    if (a === 'close') return closeMusic();
    if (!player?.getPlayerState) return;
    if (a === 'toggle') player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
    else if (a === 'next') player.nextVideo();
    else if (a === 'prev') player.previousVideo();
  });
}
function nowPlaying() { // the song title from my list (YouTube's own title as a fallback)
  const d = player?.getVideoData?.(); if (!d) return;
  const t = MUSIC.tracks.find((x) => x.id === d.video_id)?.title || d.title || '';
  panel.querySelector('.music-now').textContent = t ? `♪ ${t}` : ' ';
}

export async function openMusic(app) {
  if (!panel) build();
  panel.hidden = false;
  if (player) { player.playVideo?.(); return; }
  try {
    const YT = await loadApi(), list = override(), ids = MUSIC.tracks.map((t) => t.id);
    player = new YT.Player('ytPlayer', {
      host: 'https://www.youtube-nocookie.com', width: 240, height: 200,
      playerVars: list ? { listType: 'playlist', list, playsinline: 1, rel: 0, autoplay: 1 }
        : { playlist: ids.join(','), loop: 1, playsinline: 1, rel: 0, autoplay: 1 },
      videoId: list ? undefined : ids[0],
      events: { onStateChange: nowPlaying, onReady: nowPlaying },
    });
  } catch (e) { app?.toast('Music needs an internet connection'); }
}
export function closeMusic() { if (panel) panel.hidden = true; player?.pauseVideo?.(); }
export const musicOpen = () => !!panel && !panel.hidden;
