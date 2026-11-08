// Game-wide tuning constants and tile rules. No DOM or three.js here, so the
// world simulation (and tools/check-levels.mjs) can run anywhere.

// Track grid: each row is COLS tiles across; a tile is 1 wide and TL long.
export const TL = 2, COLS = 7;

// Ship footprint (half sizes) and how high a ledge it can drive up onto.
export const HALF_W = 0.3, HALF_L = 0.5, STEP = 0.1;

export const LAT = 7;        // sideways speed
export const ACC = 14;       // forward acceleration
export const BRK = 30;       // braking
export const JUMP = 11;      // jump launch speed
export const CRASH = 14;     // hitting a wall faster than this explodes
export const SLOW_V = 7;     // speed cap on slow tiles
export const REV_V = 6;      // slow reverse so a stalled ship can back up for another run-up
export const BOOST_MUL = 1.35;
export const WALL_H = 2.4;   // just above a normal jump; walls are see-through so the road ahead stays visible
export const PAD_H = 5.2;    // jump pads launch to the same height on every planet

export const FIXED_DT = 1 / 120;

/**
 * Tile codes used in segment strings:
 * '#' floor  '.' gap  'b' low block (jump onto)  'W' wall
 * '>' boost  '~' slow  'f' fuel  'x' burning floor  'j' jump pad  'E' finish
 */
export function cellH(ch) {
  if (ch === '.' || ch === undefined) return -Infinity;
  if (ch === 'b') return 1;
  if (ch === 'W') return WALL_H;
  return 0;
}
