// Casino night behind the title table: a midnight wall with gold lattice and a gold rail, my uncut print sheets in
// gold frames, a neon "Palm Tree" sign and a strip of marquee bulbs. Unlit materials (MeshBasic) throughout, so it
// glows like a lit room and costs no extra lights; the bulbs are one InstancedMesh.
import * as THREE from 'three';
import { C, FONT, canvas } from './art.js';
import { loadTiered, manifestRoom } from './cards.js';

export const WALL_Z = -2.6; // the wall's distance behind the box (the box is centred on the origin)
const POSTER_H = 2.5, POSTER_Y = 2.35, GOLD = 0xd9b45a;
export const ROOM_TOP = POSTER_Y + POSTER_H / 2 + 2.8; // the sign's top: the title camera keeps this in view

function wallTexture() { // one repeating tile: midnight, a faint gold diamond lattice, a small gold dot at each crossing
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#001b33'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(245,195,100,0.16)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 128); g.lineTo(128, 0); g.lineTo(256, 128); g.lineTo(128, 256); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(245,195,100,0.35)';
  for (const [x, y] of [[0, 128], [128, 0], [256, 128], [128, 256]]) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function neonTexture() { // "Palm Tree" in flamingo neon over "CASINO" in gold, glow drawn with canvas shadows
  const [c, g] = canvas(1024, 384); g.textAlign = 'center'; g.textBaseline = 'middle';
  const glow = (text, font, y, color, blur) => {
    g.font = font; g.fillStyle = color; g.shadowColor = color;
    for (const b of [blur * 2, blur, blur / 3]) { g.shadowBlur = b; g.fillText(text, 512, y); }
    g.shadowBlur = 0; g.fillStyle = '#fff4f6'; g.globalAlpha = 0.55; g.fillText(text, 512, y); g.globalAlpha = 1;
  };
  glow('Palm Tree', `400 170px ${FONT.script}`, 150, C.flamingo, 30);
  glow('C A S I N O', `400 78px ${FONT.display}`, 315, C.gold, 22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function buildRoom(mobile, dirty = () => {}) { // dirty: ask for a redraw (the app renders on demand)
  const room = new THREE.Group();
  const tex = wallTexture(); tex.repeat.set(30, 8);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), new THREE.MeshBasicMaterial({ map: tex }));
  wall.position.set(0, 8, WALL_Z); room.add(wall);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(60, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: GOLD }));
  rail.position.set(0, 0.85, WALL_Z + 0.06); room.add(rail);
  const dado = new THREE.Mesh(new THREE.PlaneGeometry(60, 0.85), new THREE.MeshBasicMaterial({ color: 0x00142a }));
  dado.position.set(0, 0.425, WALL_Z + 0.01); room.add(dado);
  // the uncut sheets, left to right, in gold frames
  const posters = manifestRoom().posters || [], gap = 0.9;
  const widths = posters.map((p) => POSTER_H * p.aspect), total = widths.reduce((a, b) => a + b, 0) + gap * (posters.length - 1);
  let x = -total / 2;
  for (let i = 0; i < posters.length; i++) {
    const w = widths[i], cx = x + w / 2; x += w + gap;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.26, POSTER_H + 0.26, 0.08), new THREE.MeshBasicMaterial({ color: GOLD }));
    frame.position.set(cx, POSTER_Y, WALL_Z + 0.05); room.add(frame);
    const mat = new THREE.MeshBasicMaterial({ color: 0xf4f1ea });
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w, POSTER_H), mat);
    art.position.set(cx, POSTER_Y, WALL_Z + 0.1); room.add(art);
    loadTiered(posters[i].files).then((t) => { if (t) { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; dirty(); } });
  }
  // neon sign above the posters, and marquee bulbs along its top and bottom
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.1), new THREE.MeshBasicMaterial({ map: neonTexture(), transparent: true, depthWrite: false }));
  sign.position.set(0, POSTER_Y + POSTER_H / 2 + 1.35, WALL_Z + 0.12); room.add(sign);
  const n = mobile ? 40 : 70, span = Math.max(total + 2, 12);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), n * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const bx = -span / 2 + (span * i) / (n - 1);
    m.makeTranslation(bx, POSTER_Y + POSTER_H / 2 + 2.55, WALL_Z + 0.15); bulbs.setMatrixAt(i, m);
    m.makeTranslation(bx, POSTER_Y - POSTER_H / 2 - 0.35, WALL_Z + 0.15); bulbs.setMatrixAt(n + i, m);
  }
  room.add(bulbs);
  return room;
}
