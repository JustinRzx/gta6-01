// The city: a fixed-seed street grid.  Roads two lanes wide run vertically and
// horizontally; a pavement (sidewalk) runs along each road; the blocks between
// are filled with buildings, parks or parking lots.  The whole thing is a
// regular lattice, so the ground type under any point is computed analytically
// in O(1) instead of stored in a big tile map.

import { CITY, PALETTE } from './config.js';
import { pick } from './random.js';

/** blockW + 2*sidewalkW + roadW: the repeat of the grid in both axes. */
export const SPACING = CITY.blockW + 2 * CITY.sidewalkW + CITY.roadW;

// Ground types returned by groundAt().
export const G_OUTSIDE = -1;
export const G_ROAD = 0;
export const G_SIDEWALK = 1;
export const G_PARK = 2;
export const G_PARKING = 3;
export const G_BLOCK = 4;

// Block fill types.
const T_BUILDINGS = 0;
const T_PARK = 1;
const T_PARKING = 2;

export function createCity(random) {
  const { roadW, sidewalkW, blockW, gridX, gridY } = CITY;
  const spacing = SPACING;
  const worldW = gridX * spacing + roadW;
  const worldH = gridY * spacing + roadW;

  // One entry per block, row-major.
  const blocks = [];
  for (let y = 0; y < gridY; y += 1) {
    for (let x = 0; x < gridX; x += 1) {
      const r = random();
      let type = T_BUILDINGS;
      if (r < 0.15) type = T_PARK;
      else if (r < 0.29) type = T_PARKING;
      blocks.push({ x, y, type });
    }
  }

  const buildings = [];
  const parks = [];
  const parkingLots = [];
  const parkedCars = [];
  const trees = [];

  for (const b of blocks) {
    const rect = blockRect(b.x, b.y);
    if (b.type === T_BUILDINGS) {
      const plots = CITY.plots;
      const gap = 5;
      const pw = (rect.w - gap * (plots + 1)) / plots;
      const ph = (rect.h - gap * (plots + 1)) / plots;
      for (let py = 0; py < plots; py += 1) {
        for (let px = 0; px < plots; px += 1) {
          buildings.push({
            x: rect.x + gap + px * (pw + gap),
            y: rect.y + gap + py * (ph + gap),
            w: pw,
            h: ph,
            color: pick(random, PALETTE.buildingRoof),
            door: random() < 0.5,
          });
        }
      }
    } else if (b.type === T_PARK) {
      parks.push(rect);
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i += 1) {
        trees.push({
          x: rect.x + 12 + random() * (rect.w - 24),
          y: rect.y + 12 + random() * (rect.h - 24),
          r: 9 + random() * 7,
        });
      }
    } else {
      parkingLots.push(rect);
      const cols = Math.max(2, Math.floor(rect.w / 46));
      const rows = Math.max(1, Math.floor(rect.h / 92));
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (random() < 0.55) continue;
          parkedCars.push({
            x: rect.x + 26 + c * ((rect.w - 52) / Math.max(1, cols - 1)),
            y: rect.y + 34 + r * ((rect.h - 68) / Math.max(1, rows - 1)),
            heading: Math.PI / 2,
          });
        }
      }
    }
  }

  const city = {
    worldW,
    worldH,
    spacing,
    roadW,
    laneW: CITY.laneW,
    sidewalkW,
    blockW,
    gridX,
    gridY,
    blocks,
    buildings,
    parks,
    parkingLots,
    parkedCars,
    trees,
  };

  return city;
}

/** World x of the centre line of vertical road j (0..gridX). */
export function roadCenterX(city, j) {
  return city.roadW / 2 + j * city.spacing;
}

/** World y of the centre line of horizontal road i (0..gridY). */
export function roadCenterY(city, i) {
  return city.roadW / 2 + i * city.spacing;
}

/** The block interior rect (the part between the pavements) for block (bx, by). */
export function blockRect(bx, by) {
  const halfRoad = CITY.roadW / 2;
  const x = halfRoad + bx * SPACING + CITY.roadW / 2 + CITY.sidewalkW;
  const y = halfRoad + by * SPACING + CITY.roadW / 2 + CITY.sidewalkW;
  return { x, y, w: CITY.blockW, h: CITY.blockW };
}

/** The block index (bx, by) that contains world point (x, y), or null. */
export function blockIndexAt(city, x, y) {
  const halfRoad = city.roadW / 2;
  const bx = Math.floor((x - halfRoad - city.roadW / 2 - city.sidewalkW) / city.spacing);
  const by = Math.floor((y - halfRoad - city.roadW / 2 - city.sidewalkW) / city.spacing);
  if (bx < 0 || by < 0 || bx >= city.gridX || by >= city.gridY) return null;
  return { bx, by };
}

/** The block record at (x, y), or null when outside the grid. */
export function blockAt(city, x, y) {
  const idx = blockIndexAt(city, x, y);
  if (!idx) return null;
  return city.blocks[idx.by * city.gridX + idx.bx];
}

/** The coarse ground type under a world point (see G_*). */
export function groundAt(city, x, y) {
  if (Number.isNaN(x) || Number.isNaN(y)) return G_OUTSIDE;
  if (x < 0 || y < 0 || x > city.worldW || y > city.worldH) return G_OUTSIDE;
  const halfRoad = city.roadW / 2;
  const rx = x - halfRoad;
  const ry = y - halfRoad;
  const jx = Math.round(rx / city.spacing);
  const jy = Math.round(ry / city.spacing);
  const dx = Math.abs(rx - jx * city.spacing);
  const dy = Math.abs(ry - jy * city.spacing);

  const inRoadX = dx <= halfRoad;
  const inRoadY = dy <= halfRoad;
  if (inRoadX || inRoadY) return G_ROAD;

  // Not on a road: maybe on a pavement, else inside a block.
  const sidewalkEdge = halfRoad + city.sidewalkW;
  const inSidewalkX = dx <= sidewalkEdge;
  const inSidewalkY = dy <= sidewalkEdge;
  if (inSidewalkX || inSidewalkY) return G_SIDEWALK;

  const idx = blockIndexAt(city, x, y);
  if (!idx) return G_OUTSIDE;
  const b = city.blocks[idx.by * city.gridX + idx.bx];
  if (b.type === T_PARK) return G_PARK;
  if (b.type === T_PARKING) return G_PARKING;
  return G_BLOCK;
}

/** True when a car may drive here (road or parking lot). */
export function isDriveable(city, x, y) {
  const g = groundAt(city, x, y);
  return g === G_ROAD || g === G_PARKING;
}

/** True when a point is solid (inside a building block or off the world). */
export function isSolid(city, x, y) {
  const g = groundAt(city, x, y);
  return g === G_BLOCK || g === G_OUTSIDE;
}

/** True when a point is on a pavement (a pedestrian's natural home). */
export function isSidewalk(city, x, y) {
  return groundAt(city, x, y) === G_SIDEWALK;
}
