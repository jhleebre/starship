import * as THREE from 'three';

// Renderer, scene, camera and lights shared by every render module.
export const canvas = document.getElementById('cv');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
// Background and fog share one colour object; sky.js retints it per level
export const BG = new THREE.Color(0x05061a);
scene.background = BG;
scene.fog = new THREE.Fog(BG, 35, 120);

export const camera = new THREE.PerspectiveCamera(62, 1, .1, 900);
scene.add(new THREE.AmbientLight(0x8890c0, .55));

// Sun shadows: the light and its shadow box follow the ship
const sun = new THREE.DirectionalLight(0xffffff, 1);
const SUN_OFS = new THREE.Vector3(5, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
scene.add(sun, sun.target);

export function updateSun(P) {
  sun.target.position.set(P.x * .5, 0, -P.s - 6);
  sun.position.copy(sun.target.position).add(SUN_OFS);
}

export function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
