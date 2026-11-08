// Level clearability check shared by check-levels.mjs (Node) and check-levels.html (browser).
// The search itself lives in src/dev/solver.js (also used by ?autoplay).
import { LEVELS } from '../src/data/levels.js';
import { solveLevel } from '../src/dev/solver.js';

/** Checks levels (0-based indexes, default all) and reports each result line through `log`. Returns the failure count. */
export function checkLevels(list = LEVELS.map((_, i) => i), log = console.log) {
  let failed = 0;
  for (const li of list) {
    const t0 = Date.now();
    const r = solveLevel(li);
    const name = `${li + 1}. ${LEVELS[li].name}`;
    if (r.ok) {
      let line = `✔ ${name}  cleared in ${r.time.toFixed(1)}s (fuel left ${r.fuel.toFixed(0)}%)`;
      // Levels with a finite tank should be impossible without picking up fuel
      if (Number.isFinite(LEVELS[li].tank)) {
        const nf = solveLevel(li, { noFuel: true });
        if (nf.ok) { failed++; line += `  ✘ also clearable without fuel (fuel left ${nf.fuel.toFixed(0)}%)`; }
        else line += `  · without fuel: stuck at ${Math.round(nf.far / nf.endS * 100)}% (${nf.lastDeath ? nf.lastDeath.reason : '?'})`;
      }
      log(line + `  [${Date.now() - t0}ms]`);
    } else {
      failed++;
      log(`✘ ${name}  stuck at ${r.far.toFixed(1)} / ${r.endS}` + (r.lastDeath ? `  last death: ${r.lastDeath.reason}` : '') + (r.timeout ? '  (timeout)' : ''));
      if (r.near) log('   rows around there:\n' + r.near.map(x => '     ' + x).join('\n'));
    }
  }
  return failed;
}
