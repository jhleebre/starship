// Checks that every level can still be finished. Run after editing segments or levels.
//   npm run check-levels            all levels
//   npm run check-levels -- 3 5     only levels 3 and 5 (1-based)
// No Node? Open tools/check-levels.html through the local server instead.
import { LEVELS } from '../src/data/levels.js';
import { checkLevels } from './level-check.js';

const picked = process.argv.slice(2).map(n => Number(n) - 1).filter(n => n >= 0 && n < LEVELS.length);
process.exit(checkLevels(picked.length ? picked : undefined) ? 1 : 0);
