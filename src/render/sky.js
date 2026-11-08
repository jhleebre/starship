import * as THREE from 'three';
import { scene, BG } from './renderer.js';
import { glowTex, planetTex } from './textures.js';

// Everything far away: gradient dome, stars, nebulae and the destination planet.
// The group follows the camera so it never gets closer.
export const sky = new THREE.Group();
scene.add(sky);

const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top,hor,bot;varying vec3 vDir;void main(){float y=vDir.y;vec3 c=y>0.?mix(hor,top,pow(min(1.,y*2.4),.6)):mix(hor,bot,min(1.,-y*5.));gl_FragColor=vec4(c,1.);}',
  side: THREE.BackSide, depthWrite: false, fog: false,
}));
dome.renderOrder = -10;
sky.add(dome);

{
  const n = 1800, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 380 + Math.random() * 80, q = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(a) * q * r; pos[i * 3 + 1] = Math.abs(u) * r * .9 - 60; pos[i * 3 + 2] = Math.sin(a) * q * r;
    const b = .55 + Math.random() * .45, t = Math.random();
    col[i * 3] = b * (t < .2 ? .75 : 1); col[i * 3 + 1] = b * (t > .85 ? .8 : .92); col[i * 3 + 2] = b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sky.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, vertexColors: true, fog: false, sizeAttenuation: false })));
}

const nebulae = [[-.55, .18, -1, 260], [.7, .3, -.8, 320], [.15, .5, -1, 200], [-.9, .05, -.3, 240]].map(([x, y, z, size]) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sp.position.set(x, y, z).normalize().multiplyScalar(500); sp.scale.set(size, size * .6, 1);
  sky.add(sp);
  return sp;
});

const planet = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 32), new THREE.MeshBasicMaterial({ map: planetTex, fog: false }));
const ring = new THREE.Mesh(new THREE.RingGeometry(92, 120, 64), new THREE.MeshBasicMaterial({ transparent: true, opacity: .35, side: THREE.DoubleSide, fog: false }));
ring.rotation.set(1.25, .2, .35);
const planetGroup = new THREE.Group();
planetGroup.add(planet, ring);
sky.add(planetGroup);
const PLANET_POS = [[-150, 40, -330], [170, 55, -320], [-120, 90, -340], [140, 30, -330], [-170, 60, -300], [120, 80, -340], [-140, 25, -320], [0, 70, -360]];

/** Recolours the sky, fog and planet for a level. */
export function setSkyTheme(li, hue) {
  const u = dome.material.uniforms;
  u.hor.value.setHSL(hue, .55, .17); u.top.value.setHSL((hue + .06) % 1, .6, .025); u.bot.value.setHSL(hue, .45, .04);
  BG.setHSL(hue, .5, .11); scene.fog.color.copy(BG); // far track fades into the horizon colour
  nebulae.forEach((n, i) => n.material.color.setHSL((hue + [.1, -.12, .25, -.05][i] + 1) % 1, .85, .55));
  planet.material.color.setHSL((hue + .45) % 1, .55, .68);
  ring.material.color.setHSL((hue + .38) % 1, .5, .78);
  planetGroup.position.fromArray(PLANET_POS[li % PLANET_POS.length]);
  planetGroup.scale.setScalar(1);
}

/** progress 0..1: the destination planet looms larger as you near the goal. */
export function setSkyProgress(progress) {
  planetGroup.scale.setScalar(1 + .45 * Math.min(1, progress));
}

export function followCamera(cam) {
  sky.position.set(cam.position.x, 0, cam.position.z);
}
