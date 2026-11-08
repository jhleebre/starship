// Game flow: modes (menu / play / pause / dead / clear), level start, death,
// finish, and turning input into actions. Connects the world simulation to
// rendering, sound and UI.
import { FIXED_DT, BOOST_MUL } from './config.js';
import { LEVELS } from './data/levels.js';
import { makeLevel } from './world/generator.js';
import { setTrack } from './world/track.js';
import { createPlayer, resetPlayer, requestJump, step } from './world/physics.js';
import { save, writeSave } from './util/storage.js';
import { sound } from './audio/sound.js';
import { setSkyTheme } from './render/sky.js';
import { buildTrackMesh, gateGlow } from './render/trackMesh.js';
import { setShipVisible } from './render/ship.js';
import { fx, clearEffects } from './render/effects.js';
import { snapCamera } from './render/cameraRig.js';
import * as hud from './ui/hud.js';

export const P = createPlayer();
export const K = { left: false, right: false, up: false, down: false };
export const G = {
  mode: 'menu',     // 'menu' | 'play' | 'pause' | 'dead' | 'clear'
  level: null,      // current level from makeLevel()
  runTime: 0,
  deadTimer: 0,     // seconds until the crash card shows
  sel: Math.max(0, Math.min(save.unlocked - 1, LEVELS.length - 1)), // highlighted menu entry
  menuT: 0,
  tick: 0,          // physics steps since the level started
  pilot: null,      // autoplay: called before every physics step to set the controls
  pilotStop: null,  // autoplay: called when the player presses Esc to take back control
};

// Simulation events -> sound and effects
const events = {
  die,
  win,
  jump: () => { sound.jump(); fx.jump(P); },
  land: (gy, vy) => { sound.land(); fx.land(P, gy, vy); },
  pad: () => { sound.pad(); fx.pad(P); },
  boost: () => { sound.boost(); fx.boost(P); },
  fuel: () => { sound.fuel(); fx.fuel(P); },
  bump: () => { sound.bump(); fx.bump(P); },
};

function loadLevel(i) {
  G.level = makeLevel(i);
  setTrack(G.level);
  buildTrackMesh(G.level.rows, G.level.hue);
  setSkyTheme(i, G.level.hue);
  fx.setDustHue(G.level.hue);
  resetPlayer(P);
  setShipVisible(true);
  clearEffects();
  snapCamera();
}

/** Shows level 1 behind the menu with the ship cruising along. */
export function initMenuBackground() {
  loadLevel(0);
  hud.renderLevels(LEVELS, save, G.sel, startLevel);
}

export function startLevel(i) {
  loadLevel(i);
  G.sel = i;
  G.runTime = 0; G.tick = 0;
  hud.setLevelChip(`단계 ${i + 1} · ${G.level.name}`);
  hud.hideOverlays();
  G.mode = 'play';
  hud.showBanner(`단계 ${i + 1}  ${G.level.name}`, G.level.sub);
  sound.init(); sound.engineOn(true);
}

function die(reason) {
  if (P.dead) return;
  P.dead = true; P.reason = reason;
  G.mode = 'dead'; G.deadTimer = 1.1;
  setShipVisible(false);
  fx.explode(P);
  sound.engineOn(false); sound.boom();
}

const DEATH = { edge: '틈을 넘지 못했어요', wall: '벽에 부딪혔어요', fall: '우주로 떨어졌어요', burn: '불바닥에 닿았어요', fuel: '연료가 떨어졌어요' };
const DEATH_TIP = { edge: '조금 더 빨리 달려서 일찍 점프해 보세요.', wall: '속도를 줄이면 부딪혀도 멈추기만 해요.', fall: '틈 앞에서 스페이스로 점프하세요.', burn: '빨간 바닥은 피하거나 뛰어넘으세요.', fuel: '초록색 연료 칸을 밟으면 가득 찹니다.' };

function showDeath() {
  hud.showResult({
    title: DEATH[P.reason], sub: DEATH_TIP[P.reason],
    stat: `<div>${Math.floor(Math.min(100, P.s / G.level.endS * 100))}%<small>진행</small></div>`,
    main: ['다시 하기', () => startLevel(G.level.index)], alt: ['', null],
  });
}

function win() {
  const lv = G.level, li = lv.index;
  G.mode = 'clear';
  sound.engineOn(false); sound.win();
  // Fireworks over the finish gate
  for (let k = 0; k < 7; k++) setTimeout(() => {
    if (G.mode !== 'clear') return;
    fx.firework(gateGlow.position, k);
    sound.firework();
  }, k * 230);

  const record = !G.pilot; // autoplay runs don't count as records
  const prev = save.best[li];
  const isBest = record && (prev === undefined || G.runTime < prev);
  if (isBest) save.best[li] = G.runTime;
  if (record) {
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, li + 2));
    writeSave();
  }
  const last = li === LEVELS.length - 1;
  hud.showResult({
    title: last ? '은하 끝에 도착!' : '도착!',
    sub: last ? '모든 단계를 끝냈어요. 기록을 더 줄여 보세요.' : `단계 ${li + 1} · ${lv.name}`,
    stat: `<div>${hud.fmt(G.runTime)}<small>${isBest ? '새 최고 기록' : '이번 기록'}</small></div><div>${hud.fmt(save.best[li])}<small>최고 기록</small></div>`,
    main: last ? ['처음부터', () => startLevel(0)] : ['다음 단계', () => startLevel(li + 1)],
    alt: ['다시 하기', () => startLevel(li)],
  });
}

function togglePause() {
  if (G.mode === 'play') {
    G.mode = 'pause'; sound.engineOn(false);
    hud.showResult({
      title: '잠시 멈춤', sub: `단계 ${G.level.index + 1} · ${G.level.name}`,
      main: ['계속하기', resume], alt: ['다시 하기', () => startLevel(G.level.index)],
    });
  } else if (G.mode === 'pause') resume();
}
function resume() { hud.hideResult(); G.mode = 'play'; sound.engineOn(true); }

export function openMenu() {
  G.mode = 'menu'; sound.engineOn(false);
  G.sel = Math.min(save.unlocked - 1, G.sel);
  hud.showMenu(LEVELS, save, G.sel, startLevel);
}

function moveSelection(d) {
  G.sel = Math.max(0, Math.min(save.unlocked - 1, G.sel + d));
  hud.renderLevels(LEVELS, save, G.sel, startLevel);
}

const resultReady = () => G.mode === 'clear' || G.mode === 'pause' || (G.mode === 'dead' && G.deadTimer <= 0);

/** Input handler (see ui/input.js for action names). */
export function onAction(a, down, repeat) {
  if (down) sound.init();
  if (G.pilot) {
    // Autoplay owns the controls; Esc hands them back, M still mutes
    if (down && a === 'pause' && G.pilotStop) G.pilotStop();
    else if (down && a === 'mute') hud.setMuteLabel(sound.toggleMute());
    return;
  }
  if (a in K) {
    if (down && G.mode === 'menu') {
      if (a === 'left' || a === 'up') moveSelection(-1);
      else moveSelection(1);
      return;
    }
    K[a] = down;
    return;
  }
  if (!down || repeat) return;
  switch (a) {
    case 'primary':
      if (G.mode === 'menu') startLevel(G.sel);
      else if (G.mode === 'play') requestJump(P);
      else if (resultReady()) hud.resultMain();
      break;
    case 'confirm':
      if (G.mode === 'menu') startLevel(G.sel);
      else if (resultReady()) hud.resultMain();
      break;
    case 'restart':
      if (G.mode !== 'menu') startLevel(G.level.index);
      break;
    case 'pause':
      if (G.mode === 'play' || G.mode === 'pause') togglePause(); else openMenu();
      break;
    case 'mute':
      hud.setMuteLabel(sound.toggleMute());
      break;
  }
}

export function onBlur() {
  for (const k in K) K[k] = false;
  if (G.mode === 'play' && !G.pilot) togglePause();
}

export function onMenuButton() { if (G.mode === 'play') togglePause(); else openMenu(); }
export function onMuteButton() { sound.init(); hud.setMuteLabel(sound.toggleMute()); }

// Fixed-step simulation so physics behaves the same at any frame rate
let acc = 0;
export function update(dt) {
  if (G.mode === 'play') {
    acc += dt;
    let n = 0;
    while (acc >= FIXED_DT && n < 8 && G.mode === 'play') {
      if (G.pilot) G.pilot(G.tick);
      step(P, K, G.level, FIXED_DT, events); G.tick++; acc -= FIXED_DT; n++;
    }
    if (n === 8) acc = 0;
    if (P.started && G.mode === 'play') G.runTime += dt;
    sound.engineSet(P.vz, K.up ? 1 : 0);
  } else acc = 0;

  if (G.mode === 'dead' && G.deadTimer > 0) {
    G.deadTimer -= dt;
    if (G.deadTimer <= 0) showDeath();
  }
  if (G.mode === 'menu') {
    // Idle fly-over behind the menu
    const t = G.menuT += dt;
    Object.assign(P, { s: (t * 12) % Math.max(1, G.level.endS - 20) + 3, vz: 12, x: Math.sin(t * .6) * 1.2, vx: Math.cos(t * .6) * .7, y: 0, vy: 0 });
  }
}

/** HUD values for the frame. */
export function hudValues() {
  const lv = G.level;
  return [P.s / lv.endS, G.runTime, P.vz / (lv.maxV * BOOST_MUL), P.fuel];
}
