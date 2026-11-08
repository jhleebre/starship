// Entry point: wires input and UI to the game and runs the frame loop.
import { renderer, scene, camera, resize, updateSun } from './render/renderer.js';
import { followCamera, setSkyProgress } from './render/sky.js';
import { updateShip } from './render/ship.js';
import { updateWalls, animateGate } from './render/trackMesh.js';
import { updateEffects, fx } from './render/effects.js';
import { updateCamera } from './render/cameraRig.js';
import { animateIcons } from './render/textures.js';
import { sound } from './audio/sound.js';
import { music } from './audio/music.js';
import { bindInput } from './ui/input.js';
import * as hud from './ui/hud.js';
import * as game from './game.js';

const { P, K, G } = game;

bindInput({ onAction: game.onAction, onBlur: game.onBlur });
hud.bindHud({ onMenu: game.onMenuButton, onMute: game.onMuteButton, onMusic: game.onMusicButton, onResultMenu: game.openMenu });
hud.setMuteLabel(sound.muted);
hud.setMusicLabel(music.enabled);
game.initMenuBackground();
resize();

let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  const t = now / 1000;

  game.update(dt);

  updateShip(P, K, t);
  updateWalls(P.s);
  updateCamera(P, dt);
  followCamera(camera);
  updateSun(P);
  if (!P.dead) fx.trail(P, K);
  updateEffects(dt, G.level.g);
  hud.updateHud(...game.hudValues());
  if (G.mode !== 'menu') setSkyProgress(P.s / G.level.endS);
  animateGate(t);
  animateIcons(t);

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ?autoplay[&from=N]: the bot plays every level from N on, for QA
const params = new URLSearchParams(location.search);
if (params.has('autoplay')) import('./dev/autoplay.js').then(m => m.runAutoplay(Number(params.get('from') || 1) - 1));
