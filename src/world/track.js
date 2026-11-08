import { TL, COLS, HALF_W, HALF_L, cellH } from '../config.js';

// The course currently being played. Grid queries read from here.
export const track = { rows: [], endS: 0 };

export function setTrack(level) {
  track.rows = level.rows;
  track.endS = level.endS;
}

export function cellAt(r, c) {
  if (r < 0 || r >= track.rows.length || c < 0 || c >= COLS) return '.';
  return track.rows[r][c];
}
export const colOf = x => Math.floor(x + 3.5);
export const rowOf = s => Math.floor(s / TL);

// World placement of a tile: x across, z forward (negative), shared by rendering.
export const tileX = c => c - 3;
export const tileZ = r => -(r + .5) * TL;

/**
 * Looks at the tiles under a ship footprint centred at (x, s).
 * g: highest surface at or below `limit`; wall: any tile rising above `limit`.
 */
export function footprint(x, s, limit) {
  const c0 = colOf(x - HALF_W), c1 = colOf(x + HALF_W), r0 = rowOf(s - HALF_L), r1 = rowOf(s + HALF_L);
  let g = -Infinity, wall = false;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const h = cellH(cellAt(r, c));
    if (h <= limit) { if (h > g) g = h; } else wall = true;
  }
  return { g, wall };
}

/** Tile the ship is resting on (centre tile first) as [code, unique tile id]. */
export function surfaceType(P) {
  const ch = cellAt(rowOf(P.s), colOf(P.x));
  if (Math.abs(cellH(ch) - P.y) < 1e-3) return [ch, rowOf(P.s) * COLS + colOf(P.x)];
  const c0 = colOf(P.x - HALF_W), c1 = colOf(P.x + HALF_W), r0 = rowOf(P.s - HALF_L), r1 = rowOf(P.s + HALF_L);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const k = cellAt(r, c);
    if (Math.abs(cellH(k) - P.y) < 1e-3) return [k, r * COLS + c];
  }
  return ['.', -1];
}
