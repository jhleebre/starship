import * as THREE from 'three';
import { renderer } from './renderer.js';

// Every texture is drawn on a canvas at startup, so the game ships no image files.

export function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Light tile with a bright border; instance colours tint it per tile type
export const tileTex = canvasTex(64, (g, s) => {
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, 4); g.fillRect(0, s - 4, s, 4); g.fillRect(0, 0, 4, s); g.fillRect(s - 4, 0, 4, s);
  g.fillStyle = '#9a9a9a'; g.fillRect(4, 4, s - 8, 2); g.fillRect(4, 4, 2, s - 8);
});

// Soft round dot used by particles, nebulae and glows
export const glowTex = canvasTex(128, (g, s) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});

// Dark radial blob for the shadow right under the ship
export const blobTex = canvasTex(64, (g, s) => {
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});

// Vertical fade used as an alpha map for contact shadows. Alpha maps read the
// green channel, so this is an opaque grey ramp (strongest at the top edge).
export const fadeTex = canvasTex(64, (g, s) => {
  const gr = g.createLinearGradient(0, 0, 0, s);
  gr.addColorStop(0, 'rgb(140,140,140)'); gr.addColorStop(1, 'rgb(0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

export const checkerTex = canvasTex(128, (g) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) {
    g.fillStyle = (x + y) % 2 ? '#ffffff' : '#20223a'; g.fillRect(x * 8, y * 32, 8, 32);
  }
});
checkerTex.wrapS = THREE.RepeatWrapping; checkerTex.repeat.set(2, 1);

// Greyscale banded planet; sky.js tints it per level
export const planetTex = canvasTex(256, (c, s) => {
  const gr = c.createLinearGradient(0, 0, s, s);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#9a9a9a'); gr.addColorStop(1, '#2a2a2a');
  c.fillStyle = gr; c.fillRect(0, 0, s, s);
  c.globalAlpha = .16; c.fillStyle = '#fff'; for (let y = 0; y < s; y += 22) c.fillRect(0, y, s, 8);
});

// Icons painted over special tiles. Top of the canvas points down the track.
const ICON_DRAW = {
  '>': g => { g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; for (const y of [40, 78]) { g.beginPath(); g.moveTo(26, y + 22); g.lineTo(64, y - 12); g.lineTo(102, y + 22); g.stroke(); } },
  'j': g => { g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(64, 64, 42, 0, Math.PI * 2); g.stroke(); g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, 76); g.lineTo(64, 46); g.lineTo(88, 76); g.stroke(); },
  'f': g => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64, 18); g.bezierCurveTo(90, 56, 100, 70, 100, 84); g.arc(64, 84, 36, 0, Math.PI); g.bezierCurveTo(28, 70, 38, 56, 64, 18); g.fill(); g.fillStyle = '#000'; g.fillRect(58, 66, 12, 36); g.fillRect(46, 78, 36, 12); },
  'x': (g, s) => { g.fillStyle = '#fff'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 24, 0); g.lineTo(i * 24 + 12, 0); g.lineTo(i * 24 + 12 + s, s); g.lineTo(i * 24 + s, s); g.fill(); } },
  '~': g => { g.strokeStyle = '#fff'; g.lineWidth = 7; for (const y of [36, 64, 92]) { g.beginPath(); for (let x = 12; x <= 116; x += 2) g.lineTo(x, y + Math.sin(x / 10) * 7); g.stroke(); } },
};
const ICON_COLOR = { '>': 0x7ff4ff, 'j': 0xfff08a, 'f': 0x9dffb8, 'x': 0xffa060, '~': 0xd8a070 };

export const iconMats = {};
for (const k in ICON_DRAW) {
  iconMats[k] = new THREE.MeshBasicMaterial({
    map: canvasTex(128, ICON_DRAW[k]), color: ICON_COLOR[k],
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

/** Pulses the hazard and boost icons. */
export function animateIcons(t) {
  const pulse = .65 + Math.sin(t * 6) * .35;
  iconMats['x'].opacity = pulse;
  iconMats['>'].opacity = .7 + Math.sin(t * 10) * .3;
  iconMats['j'].opacity = pulse;
}
