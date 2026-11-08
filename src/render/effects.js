import * as THREE from 'three';
import { scene } from './renderer.js';
import { glowTex } from './textures.js';

// Particles: one additive point cloud shared by every effect. Colour fades to
// black over each particle's life, which reads as fading out under additive blending.
const N = 1200;
const pos = new Float32Array(N * 3).fill(-999), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), base = new Float32Array(N * 3);
const life = new Float32Array(N), maxLife = new Float32Array(N), grav = new Float32Array(N);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: .16, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
points.frustumCulled = false;
scene.add(points);
let next = 0;
const tmp = new THREE.Color();

/**
 * Spawns n particles at (x,y,z). Options:
 * color, speed (outward), up (extra upward), flat (no random vertical), grav,
 * life (seconds), jitter (spawn spread), vary (0..1 brightness variation), vx, vz.
 */
export function emit(x, y, z, n, o) {
  tmp.set(o.color);
  for (let k = 0; k < n; k++) {
    const i = next; next = (next + 1) % N;
    const a = Math.random() * Math.PI * 2, sp = (o.speed || 2) * (.4 + Math.random() * .6);
    pos[i * 3] = x + (Math.random() - .5) * (o.jitter || 0); pos[i * 3 + 1] = y; pos[i * 3 + 2] = z + (Math.random() - .5) * (o.jitter || 0);
    vel[i * 3] = Math.cos(a) * sp + (o.vx || 0);
    vel[i * 3 + 1] = (o.up || 0) * (.5 + Math.random() * .5) + (o.flat ? 0 : (Math.random() - .3) * sp);
    vel[i * 3 + 2] = Math.sin(a) * sp + (o.vz || 0);
    const v = o.vary ? (1 - o.vary * Math.random()) : 1;
    base[i * 3] = tmp.r * v; base[i * 3 + 1] = tmp.g * v; base[i * 3 + 2] = tmp.b * v;
    life[i] = maxLife[i] = (o.life || .6) * (.6 + Math.random() * .4); grav[i] = o.grav || 0;
  }
}

function updateParticles(dt) {
  for (let i = 0; i < N; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    if (life[i] <= 0) { pos[i * 3 + 1] = -999; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
    vel[i * 3 + 1] -= grav[i] * dt;
    const d = Math.max(0, 1 - dt * 1.5); vel[i * 3] *= d; vel[i * 3 + 2] *= d;
    pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    const k = life[i] / maxLife[i];
    col[i * 3] = base[i * 3] * k; col[i * 3 + 1] = base[i * 3 + 1] * k; col[i * 3 + 2] = base[i * 3 + 2] * k;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
}

// Explosion debris: small tumbling cubes plus a flash of light
const debris = [];
{
  const g = new THREE.BoxGeometry(.12, .12, .12);
  const cols = [0xffffff, 0xff8a2a, 0xffd23f, 0xff4a3a];
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: cols[i % 4], transparent: true }));
    m.visible = false; scene.add(m); debris.push({ m, v: new THREE.Vector3(), life: 0 });
  }
}
const flash = new THREE.PointLight(0xffa040, 0, 18);
scene.add(flash);

export function clearEffects() {
  life.fill(0); pos.fill(-999); col.fill(0);
  geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  for (const d of debris) d.m.visible = false;
  flash.intensity = 0;
}

/** Advances particles and debris. g: gravity for the debris. */
export function updateEffects(dt, g) {
  updateParticles(dt);
  for (const d of debris) {
    if (!d.m.visible) continue;
    d.life -= dt;
    if (d.life <= 0) { d.m.visible = false; continue; }
    d.v.y -= g * .5 * dt;
    d.m.position.addScaledVector(d.v, dt);
    d.m.rotation.x += dt * 8; d.m.rotation.y += dt * 6;
    d.m.material.opacity = Math.min(1, d.life);
  }
  flash.intensity = Math.max(0, flash.intensity - dt * 6);
}

// ---- Effect presets, keyed by what happened to the ship (P = player state) ----
const dust = new THREE.Color();
const FIREWORK = [0xff5a7a, 0xffd23f, 0x5fe8ff, 0x9dff8a, 0xc38bff];
const at = (P, n, o, dy = 0) => emit(P.x, P.y + dy, -P.s, n, o);

export const fx = {
  setDustHue(hue) { dust.setHSL(hue, .5, .8); },
  jump: P => at(P, 10, { color: 0xc8d0ff, speed: 1.8, flat: true, life: .35, jitter: .4 }),
  land: (P, groundY, vy) => emit(P.x, groundY + .05, -P.s, Math.min(40, Math.round(-vy * 1.5)), { color: dust, speed: 3.5, flat: true, up: .9, grav: 4, life: .55, jitter: .5, vary: .4 }),
  pad: P => at(P, 40, { color: 0xffe060, speed: 2.5, up: 7, grav: 8, life: .8, jitter: .9 }),
  boost: P => at(P, 26, { color: 0x7ff4ff, speed: 3.5, flat: true, life: .5, vz: -P.vz * .3 }),
  fuel: P => at(P, 30, { color: 0x7dffa0, speed: 1.2, up: 3.5, grav: -1, life: .9, jitter: .9 }, .2),
  bump: P => emit(P.x, P.y + .2, -P.s - .6 * Math.sign(P.vz), 14, { color: 0xffffff, speed: 3, up: 2, grav: 8, life: .4 }),
  explode(P) {
    for (const d of debris) {
      d.m.visible = true; d.m.position.set(P.x, P.y + .2, -P.s);
      d.v.set((Math.random() - .5) * 9, Math.random() * 7 + 1, -(Math.random() - .3) * 9 - P.vz * .25);
      d.life = 1.3 + Math.random() * .6; d.m.material.opacity = 1;
    }
    flash.position.set(P.x, P.y + .6, -P.s); flash.intensity = 4;
    at(P, 80, { color: 0xffa040, speed: 7, up: 3, grav: 6, life: 1.1, vary: .6 }, .2);
    at(P, 30, { color: 0xffffff, speed: 4, up: 2, grav: 4, life: .6 }, .2);
  },
  /** k-th burst of the finish fireworks around position p. */
  firework(p, k) {
    emit(p.x + (Math.random() - .5) * 7, 2.5 + Math.random() * 4, p.z - Math.random() * 4, 100, { color: FIREWORK[k % FIREWORK.length], speed: 6.5, up: 1, grav: 3, life: 1.3 });
  },
  /** Engine trail: cyan streaks while boosted, faint exhaust while thrusting. */
  trail(P, K) {
    for (const sx of [-1, 1]) {
      if (P.boost > 0) emit(P.x + sx * .14, P.y + .15, -P.s + .65, 2, { color: 0x6fe8ff, speed: .4, flat: true, life: .4 });
      else if (K.up && P.fuel > 0 && Math.random() < .5) emit(P.x + sx * .14, P.y + .15, -P.s + .65, 1, { color: 0xff8a3a, speed: .3, flat: true, life: .25 });
    }
  },
};
