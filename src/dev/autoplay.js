// QA autoplay (open index.html?autoplay, or ?autoplay&from=5).
// For each level the solver first finds a winning input sequence, then the real
// game replays it live. Physics runs on a fixed step, so the replay follows
// exactly the path the solver found. Esc stops and returns to the menu.
import { LEVELS } from '../data/levels.js';
import { requestJump } from '../world/physics.js';
import { solveLevel, applyAction, TICKS_PER_ACTION } from './solver.js';
import * as game from '../game.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = cond => new Promise(r => { const i = setInterval(() => { if (cond()) { clearInterval(i); r(); } }, 100); });

function makeTag() {
  const el = document.createElement('div');
  el.className = 'chip';
  Object.assign(el.style, { position: 'absolute', left: '50%', top: '52px', transform: 'translateX(-50%)', borderColor: '#ffc23f', pointerEvents: 'none', zIndex: 5 });
  document.getElementById('app').appendChild(el);
  return el;
}

export async function runAutoplay(from = 0) {
  const { G, P, K } = game;
  const tag = makeTag();
  let stopped = false;
  G.pilotStop = () => { stopped = true; };
  // Between levels the pilot stays set (as a no-op) so player input keeps being ignored
  const idle = () => {};
  const release = () => { G.pilot = idle; for (const k in K) K[k] = false; };
  const results = [];

  for (let li = Math.max(0, from); li < LEVELS.length && !stopped; li++) {
    const name = `${li + 1}단계 ${LEVELS[li].name}`;
    tag.textContent = `자동 플레이 · ${name} 경로 계산 중…`;
    await sleep(60); // let the label paint before the blocking search
    const plan = solveLevel(li);
    if (!plan.ok) { results.push(`${li + 1}✘`); tag.textContent = `자동 플레이 · ${name}: 깰 수 있는 경로를 찾지 못했어요`; break; }

    const acts = plan.actions;
    G.pilot = tick => {
      const i = Math.floor(tick / TICKS_PER_ACTION), a = acts[Math.min(i, acts.length - 1)];
      applyAction(K, a);
      if (tick % TICKS_PER_ACTION === 0 && a.j && i < acts.length) requestJump(P);
    };
    game.startLevel(li);
    tag.textContent = `자동 플레이 · ${name}  (Esc: 그만하기)`;
    await until(() => stopped || G.mode === 'clear' || G.mode === 'dead');
    const mode = G.mode;
    release();
    if (stopped) break;
    if (mode !== 'clear') {
      results.push(`${li + 1}✘`);
      tag.textContent = `자동 플레이 · ${name}: 재생 중 실패 (${P.reason})`;
      break;
    }
    results.push(`${li + 1}✔ ${G.runTime.toFixed(1)}초`);
    await sleep(3500); // let the finish fireworks play
  }

  release();
  G.pilot = null; G.pilotStop = null;
  if (stopped) { tag.remove(); game.openMenu(); return; }
  if (results.length === LEVELS.length - Math.max(0, from) && results.every(r => r.includes('✔'))) {
    tag.textContent = `자동 플레이 완료 · ${results.join(' · ')}`;
  }
  console.log('[autoplay]', results.join(' | '));
}
