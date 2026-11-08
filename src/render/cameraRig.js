import { camera } from './renderer.js';

// Chase camera behind and above the ship, widening the view with speed.
const cam = { x: 0, y: 2.6, z: 6, ly: 0 };
let snap = true;

/** Jump straight to the target on the next update (new level, teleports). */
export function snapCamera() { snap = true; }

export function updateCamera(P, dt) {
  const gy = Math.max(P.y, -1.2);
  const tx = P.x * .6, ty = gy + 2.6, tz = -(P.s - 6.2);
  const kx = snap ? 1 : 1 - Math.exp(-dt * 8), ky = snap ? 1 : 1 - Math.exp(-dt * 5);
  cam.x += (tx - cam.x) * kx; cam.y += (ty - cam.y) * ky; cam.z = tz;
  cam.ly += (gy - cam.ly) * ky;
  snap = false;
  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(P.x * .85, cam.ly + .5, -(P.s + 10));
  const fov = 60 + Math.min(P.vz, 45) * .32;
  if (Math.abs(camera.fov - fov) > .05) { camera.fov += (fov - camera.fov) * .1; camera.updateProjectionMatrix(); }
}
