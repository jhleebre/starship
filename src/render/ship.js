import * as THREE from 'three';
import { STEP } from '../config.js';
import { footprint } from '../world/track.js';
import { scene } from './renderer.js';
import { blobTex } from './textures.js';

/**
 * Builds the ship model. Forward is -z, about 1.1 long and 0.9 wide.
 * Every part's orientation is baked into its geometry so rotations and
 * scales never combine into a skew. Returns the group and its two flames.
 */
export function createShipModel() {
  const group = new THREE.Group();
  const flames = [];
  const phong = (color, extra) => new THREE.MeshPhongMaterial(Object.assign({ color, flatShading: true, shininess: 70, specular: 0x445066 }, extra));
  const white = phong(0xe9edff), orange = phong(0xff7a1f), dark = phong(0x262b4f, { shininess: 20 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };
  const along = g => g.rotateY(Math.PI / 8).rotateX(-Math.PI / 2).scale(1.3, .62, 1); // +y axis -> forward, flattened octagon

  // Hull and nose share the same cross-section so they meet flush
  add(along(new THREE.CylinderGeometry(.19, .21, .62, 8)), white, 0, .17, .14);
  add(along(new THREE.ConeGeometry(.19, .62, 8)), white, 0, .17, -.48);
  // Canopy
  add(new THREE.SphereGeometry(.12, 16, 10).scale(1, .75, 2), phong(0x48e0ff, { emissive: 0x0b4a66, shininess: 120 }), 0, .27, -.12);

  // Swept wings, built per side so normals stay correct
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(sx * .12, -.16); sh.lineTo(sx * .44, .2); sh.lineTo(sx * .44, .4); sh.lineTo(sx * .12, .44); sh.closePath();
    add(new THREE.ExtrudeGeometry(sh, { depth: .035, bevelEnabled: false }).rotateX(Math.PI / 2), orange, 0, .14, 0);
    // Wingtip fin with a running light
    add(new THREE.BoxGeometry(.03, .14, .2), white, sx * .44, .2, .31);
    add(new THREE.SphereGeometry(.028, 8, 6), new THREE.MeshBasicMaterial({ color: sx < 0 ? 0xff4a5a : 0x4affb0 }), sx * .44, .28, .24);
    // Engine pod with glowing nozzle and flame
    add(new THREE.CylinderGeometry(.075, .085, .3, 12).rotateX(Math.PI / 2), dark, sx * .14, .15, .42);
    add(new THREE.CircleGeometry(.06, 12), new THREE.MeshBasicMaterial({ color: 0xffc070 }), sx * .14, .15, .571);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(.06, .4, 10).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
    fl.position.set(sx * .14, .15, .78); group.add(fl); flames.push(fl);
  }
  // Tail fin
  const tf = new THREE.Shape();
  tf.moveTo(.18, 0); tf.lineTo(.44, 0); tf.lineTo(.47, .24); tf.lineTo(.38, .24); tf.closePath();
  add(new THREE.ExtrudeGeometry(tf, { depth: .03, bevelEnabled: false }).translate(0, 0, -.015).rotateY(-Math.PI / 2), orange, 0, .26, 0);

  group.traverse(o => { if (o.isMesh && !o.material.isMeshBasicMaterial) o.castShadow = true; });
  return { group, flames };
}

// The player's ship in the scene, with its engine glow and landing shadow
const model = createShipModel();
export const ship = model.group;
scene.add(ship);
const engineLight = new THREE.PointLight(0xff9a40, 1.1, 7);
scene.add(engineLight);
// Blob shadow straight below the ship: the landing guide for jumps
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
blob.rotation.x = -Math.PI / 2;
scene.add(blob);

export function setShipVisible(v) {
  ship.visible = engineLight.visible = blob.visible = v;
}

export function updateShip(P, K, t) {
  ship.position.set(P.x, P.y, -P.s);
  ship.rotation.z = -P.vx * .05;
  ship.rotation.x = THREE.MathUtils.clamp(P.vy * .025, -.35, .35);
  const thr = (K.up && P.fuel > 0 ? 1 : .45) + (P.boost > 0 ? .8 : 0);
  for (const fl of model.flames) {
    const s = .6 + thr * .7 + Math.sin(t * 60 + fl.position.x * 9) * .12;
    fl.scale.set(1, 1, s); fl.position.z = .57 + .2 * s;
    fl.material.color.setHex(P.boost > 0 ? 0x7ff4ff : 0xffb04a);
  }
  engineLight.position.set(P.x, P.y + .3, -P.s + 1);
  engineLight.intensity = .6 + thr * .6;
  engineLight.color.setHex(P.boost > 0 ? 0x5fe8ff : 0xff9a40);
  if (!ship.visible) return;
  const f = footprint(P.x, P.s, P.y + STEP);
  if (f.g > -Infinity) {
    const d = P.y - f.g;
    blob.visible = true;
    blob.position.set(P.x, f.g + .02, -P.s);
    const sc = Math.max(.3, 1.1 - d * .15); blob.scale.set(sc * .9, sc * 1.4, 1);
    blob.material.opacity = Math.max(.12, .75 - d * .15);
  } else blob.visible = false;
}
