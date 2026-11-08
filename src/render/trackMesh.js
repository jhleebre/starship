import * as THREE from 'three';
import { TL, COLS, WALL_H, cellH } from '../config.js';
import { cellAt, tileX, tileZ } from '../world/track.js';
import { scene } from './renderer.js';
import { tileTex, fadeTex, checkerTex, glowTex, iconMats } from './textures.js';

// Builds the meshes for a course: tiles, see-through walls, contact shadows,
// tile icons and the finish gate. Rebuilt whenever a level starts.

// Box with darker bottom vertices: block sides fade darker toward their base,
// which gives a cheap ambient-occlusion look where blocks meet the floor.
const tileBox = (() => {
  const g = new THREE.BoxGeometry(1, 1, 1), pos = g.attributes.position, c = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const v = pos.getY(i) > 0 ? 1 : .38; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
})();
// Soft contact shadow laid on the floor beside low blocks (dark edge toward local -z)
const aoPlane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const aoMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: fadeTex, transparent: true, depthWrite: false });
const iconPlane = new THREE.PlaneGeometry(.9, TL * .9).rotateX(-Math.PI / 2);

// Glow over the finish gate, visible from far away (no fog)
export const gateGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff2c0, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
gateGlow.scale.set(16, 7, 1);
scene.add(gateGlow);

let group = null, wallMesh = null, wallTiles = [], wallSink = [];

function tileColor(col, ch, r, c, hue) {
  const chk = (r + c) % 2, band = Math.floor(r / 8) % 2;
  switch (ch) {
    case 'b': return col.setHSL((hue + .5) % 1, .45, chk ? .58 : .52);
    case '>': return col.setHSL(.52, .9, .48);
    case '~': return col.setHSL(.07, .5, .25);
    case 'f': return col.setHSL(.38, .6, .42);
    case 'x': return col.setHSL(.01, .85, .48);
    case 'j': return col.setHSL(.13, .9, .52);
    case 'E': return col.setHex(chk ? 0xf4f4f4 : 0x26283a);
    default: return col.setHSL((hue + (band ? .06 : 0)) % 1, .5, chk ? .42 : .36);
  }
}

export function buildTrackMesh(rows, hue) {
  if (group) {
    group.traverse(o => { if (o.isInstancedMesh) o.dispose(); if (o.userData.own) o.material.dispose(); });
    scene.remove(group);
  }
  group = new THREE.Group();
  scene.add(group);

  const tiles = [], icons = {};
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < COLS; c++) {
    const ch = rows[r][c]; if (ch === '.') continue;
    tiles.push([r, c, ch]);
    if (iconMats[ch]) (icons[ch] = icons[ch] || []).push([r, c]);
  }
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();

  // Solid tiles (walls get a floor tile here and their own mesh below)
  const im = new THREE.InstancedMesh(tileBox, new THREE.MeshLambertMaterial({ map: tileTex, vertexColors: true }), tiles.length);
  im.castShadow = im.receiveShadow = true; im.userData.own = true;
  tiles.forEach(([r, c, ch], i) => {
    const h = ch === 'W' ? 0 : cellH(ch), hh = h + .4;
    p.set(tileX(c), h - hh / 2, tileZ(r)); sc.set(1, hh, TL);
    im.setMatrixAt(i, m4.compose(p, q, sc));
    im.setColorAt(i, tileColor(col, ch, r, c, hue));
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  group.add(im);

  // See-through walls
  const walls = tiles.filter(t => t[2] === 'W');
  const wim = new THREE.InstancedMesh(tileBox, new THREE.MeshLambertMaterial({ map: tileTex, transparent: true, opacity: .42, depthWrite: false, emissive: 0x221030 }), Math.max(1, walls.length));
  wim.count = walls.length; wim.renderOrder = 3; wim.userData.own = true;
  walls.forEach(([r, c], i) => {
    p.set(tileX(c), WALL_H / 2, tileZ(r)); sc.set(.98, WALL_H, TL * .98);
    wim.setMatrixAt(i, m4.compose(p, q, sc));
    wim.setColorAt(i, col.setHSL((hue + .8) % 1, .75, (r + c) % 2 ? .62 : .56));
  });
  wim.instanceMatrix.needsUpdate = true; if (wim.instanceColor) wim.instanceColor.needsUpdate = true;
  group.add(wim);
  wallMesh = wim; wallTiles = walls.map(([r, c]) => [r, c]); wallSink = walls.map(() => 1);

  // Contact shadows on floor tiles that touch a low block
  const ao = [];
  for (const [r, c, ch] of tiles) {
    if (ch !== 'b') continue;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (cellH(cellAt(r + dr, c + dc)) !== 0) continue;
      const w = .45;
      const ex = tileX(c) + dc * (.5 + w / 2), ez = tileZ(r) + (dr ? -dr * (TL / 2 + w / 2) : 0);
      ao.push([ex, ez, Math.atan2(dc, -dr), dr ? 1 : TL, w]);
    }
  }
  if (ao.length) {
    const aim = new THREE.InstancedMesh(aoPlane, aoMat, ao.length);
    const yq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    ao.forEach(([x, z, a, len, w], i) => { p.set(x, .008, z); yq.setFromAxisAngle(up, a); sc.set(len, 1, w); aim.setMatrixAt(i, m4.compose(p, yq, sc)); });
    aim.instanceMatrix.needsUpdate = true; aim.renderOrder = 1;
    group.add(aim);
  }

  // Finish gate over the first checkered row
  const gz = tileZ(rows.findIndex(r => r[0] === 'E'));
  const pm = new THREE.MeshLambertMaterial({ color: 0xdfe4ff });
  for (const sx of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(.35, 5.4, .35), pm);
    pl.position.set(sx * 4.1, 2.3, gz); pl.castShadow = true; pl.userData.own = true;
    group.add(pl);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(8.6, .7, .3), new THREE.MeshBasicMaterial({ map: checkerTex }));
  beam.position.set(0, 5, gz); beam.userData.own = true;
  group.add(beam);
  gateGlow.position.set(0, 5, gz + .3);

  // Icons on special tiles
  for (const k in icons) {
    const list = icons[k], ii = new THREE.InstancedMesh(iconPlane, iconMats[k], list.length);
    list.forEach(([r, c], i) => { m4.makeTranslation(tileX(c), .015, tileZ(r)); ii.setMatrixAt(i, m4); });
    ii.instanceMatrix.needsUpdate = true; ii.renderOrder = 2;
    group.add(ii);
  }
}

// Walls the ship has left behind sink into the floor so they never hide the ship.
// Purely visual: collision still uses the full wall, and backing up raises them again.
const _wm = new THREE.Matrix4(), _wp = new THREE.Vector3(), _ws = new THREE.Vector3(), _wq = new THREE.Quaternion();
export function updateWalls(s) {
  if (!wallMesh) return;
  let dirty = false;
  wallTiles.forEach(([r, c], i) => {
    const k = Math.max(0, Math.min(1, 1 - (s - (r + 1) * TL) / .6));
    if (Math.abs(k - wallSink[i]) < .005) return;
    wallSink[i] = k; dirty = true;
    const h = WALL_H * k;
    _wp.set(tileX(c), h / 2, tileZ(r));
    if (k > 0) _ws.set(.98, h, TL * .98); else _ws.set(0, 0, 0);
    wallMesh.setMatrixAt(i, _wm.compose(_wp, _wq, _ws));
  });
  if (dirty) wallMesh.instanceMatrix.needsUpdate = true;
}

export function animateGate(t) {
  gateGlow.material.opacity = .4 + Math.sin(t * 3) * .12;
}
