// The city: a fixed-seed street grid. Roads run two lanes wide and carry the road tile, sidewalks
// carry the pavement tile, and the blocks between are filled with buildings, parks or parking lots
// drawn from above. It also answers the geometry the rest of the game asks for: what is solid,
// what is road, where the driving lanes and the sidewalk walkways are.

import { CITY, STREET_WIDTH, SIDEWALK_OFFSET, LANE_OFFSET } from './config.js';
import { randInt, randRange, pick } from './random.js';

const ROOF_TONES = ['#9aa1ab', '#8b929d', '#a7a3b0', '#8d8f98', '#b3a68f', '#7f8a94'];

/** Whether a rectangle overlaps a building (or park tree trunk, treated as solid). */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function makeBuildings(random, x, y, size) {
  const gap = 6;
  const half = (size - gap) / 2;
  const cells = [
    { x, y },
    { x: x + half + gap, y },
    { x, y: y + half + gap },
    { x: x + half + gap, y: y + half + gap },
  ];
  const buildings = [];
  for (const c of cells) {
    if (random() < 0.88) {
      const height = 1 + Math.floor(random() * 4);
      buildings.push({
        x: c.x + 1, y: c.y + 1, w: half - 2, h: half - 2,
        height, tone: pick(random, ROOF_TONES), vent: random() < 0.6,
      });
    }
  }
  return { buildings, trees: [], spots: [] };
}

function makePark(random, x, y, size) {
  const trees = [];
  for (let i = 0; i < 7; i += 1) {
    trees.push({ x: x + randRange(random, 14, size - 14), y: y + randRange(random, 14, size - 14), r: randRange(random, 7, 12) });
  }
  return { buildings: [], trees, spots: [] };
}

function makeParkingLot(random, x, y, size) {
  const spots = [];
  const rows = 2;
  const perRow = 3;
  const spotW = 30;
  const spotH = 46;
  const startX = x + (size - perRow * spotW) / 2;
  for (let r = 0; r < rows; r += 1) {
    const rowY = y + 16 + r * (spotH + 18);
    for (let s = 0; s < perRow; s += 1) {
      const cx = startX + s * spotW + spotW / 2;
      if (random() < 0.7) {
        spots.push({ x: cx, y: rowY + spotH / 2, heading: Math.PI / 2, kind: 'sedan' });
      }
    }
  }
  return { buildings: [], trees: [], spots };
}

function makeBlock(random, bx, by, x, y, size) {
  const roll = random();
  const kind = roll < 0.68 ? 'buildings' : roll < 0.84 ? 'park' : 'parking';
  if (kind === 'park') return { bx, by, x, y, w: size, h: size, kind, ...makePark(random, x, y, size) };
  if (kind === 'parking') return { bx, by, x, y, w: size, h: size, kind, ...makeParkingLot(random, x, y, size) };
  return { bx, by, x, y, w: size, h: size, kind, ...makeBuildings(random, x, y, size) };
}

export function createCity(random) {
  const { nx, ny, blockSize, roadWidth, sidewalkWidth } = CITY;
  const street = STREET_WIDTH;
  const worldWidth = nx * blockSize + (nx + 1) * street;
  const worldHeight = ny * blockSize + (ny + 1) * street;

  const hRoads = [];
  const vRoads = [];
  for (let h = 0; h <= ny; h += 1) hRoads.push(h * (blockSize + street) + street / 2);
  for (let v = 0; v <= nx; v += 1) vRoads.push(v * (blockSize + street) + street / 2);

  const blocks = [];
  for (let by = 0; by < ny; by += 1) {
    for (let bx = 0; bx < nx; bx += 1) {
      const x = bx * (blockSize + street) + street;
      const y = by * (blockSize + street) + street;
      blocks.push(makeBlock(random, bx, by, x, y, blockSize));
    }
  }

  const buildings = [];
  const trees = [];
  const parkedSpots = [];
  for (const block of blocks) {
    for (const b of block.buildings) buildings.push(b);
    for (const t of block.trees) trees.push(t);
    for (const s of block.spots) parkedSpots.push(s);
  }

  // A few cars parked at the kerb, on quiet blocks' sidewalks.
  const curbSpots = [];
  for (let i = 0; i < 10; i += 1) {
    const h = randInt(random, 0, ny);
    const horizontal = random() < 0.5;
    if (horizontal) {
      const y = hRoads[h] + (random() < 0.5 ? -1 : 1) * SIDEWALK_OFFSET;
      const x = vRoads[randInt(random, 0, nx)] + randRange(random, -blockSize / 2, blockSize / 2);
      curbSpots.push({ x, y, heading: random() < 0.5 ? 0 : Math.PI, kind: 'sedan' });
    } else {
      const x = vRoads[randInt(random, 0, nx)] + (random() < 0.5 ? -1 : 1) * SIDEWALK_OFFSET;
      const y = hRoads[h] + randRange(random, -blockSize / 2, blockSize / 2);
      curbSpots.push({ x, y, heading: random() < 0.5 ? Math.PI / 2 : -Math.PI / 2, kind: 'sedan' });
    }
  }

  const horizontalLanes = [];
  for (const y of hRoads) {
    horizontalLanes.push({ y: y - LANE_OFFSET, dir: -1, road: y });
    horizontalLanes.push({ y: y + LANE_OFFSET, dir: 1, road: y });
  }
  const verticalLanes = [];
  for (const x of vRoads) {
    verticalLanes.push({ x: x - LANE_OFFSET, dir: -1, road: x });
    verticalLanes.push({ x: x + LANE_OFFSET, dir: 1, road: x });
  }

  const hRails = [];
  for (const y of hRoads) {
    hRails.push(y - SIDEWALK_OFFSET, y + SIDEWALK_OFFSET);
  }
  const vRails = [];
  for (const x of vRoads) {
    vRails.push(x - SIDEWALK_OFFSET, x + SIDEWALK_OFFSET);
  }

  const city = {
    nx, ny, blockSize, roadWidth, sidewalkWidth, street,
    worldWidth, worldHeight, hRoads, vRoads,
    blocks, buildings, trees, parkedSpots, curbSpots,
    horizontalLanes, verticalLanes, hRails, vRails,
  };

  city.isRoad = (x, y) => {
    for (const rx of vRoads) if (Math.abs(x - rx) <= roadWidth / 2) return true;
    for (const ry of hRoads) if (Math.abs(y - ry) <= roadWidth / 2) return true;
    return false;
  };
  city.isStreet = (x, y) => {
    for (const rx of vRoads) if (Math.abs(x - rx) <= street / 2) return true;
    for (const ry of hRoads) if (Math.abs(y - ry) <= street / 2) return true;
    return false;
  };
  city.isSidewalk = (x, y) => {
    if (city.isRoad(x, y)) return false;
    return city.isStreet(x, y);
  };

  /** The first building a rectangle overlaps, or null. */
  city.solidAtRect = (rect) => {
    for (const b of buildings) if (rectsOverlap(rect, b)) return b;
    return null;
  };
  city.solidAtPoint = (x, y) => {
    for (const b of buildings) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
    }
    return false;
  };

  /** Whether a circle overlaps a building (people colliding with walls). */
  city.circleHitsBuilding = (x, y, r) => {
    for (const b of buildings) {
      const cx = Math.max(b.x, Math.min(x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(y, b.y + b.h));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  };

  /** A sidewalk point inside the world, for spawning people safely. */
  city.randomSidewalkPoint = () => {
    const h = randInt(random, 0, ny);
    const y = pick(random, hRails);
    const x = vRoads[0] + randRange(random, 40, (vRoads[nx] - vRoads[0]) - 40);
    return { x, y };
  };

  /** Rebuild the flattened building/tree/parking lists after a block is changed. */
  function rebuildIndexes() {
    city.buildings.length = 0;
    city.trees.length = 0;
    city.parkedSpots.length = 0;
    for (const block of city.blocks) {
      for (const b of block.buildings) city.buildings.push(b);
      for (const t of block.trees) city.trees.push(t);
      for (const s of block.spots) city.parkedSpots.push(s);
    }
  }

  /** Force a block to a kind (park, parking or buildings), used by the screenshot staging. */
  city.reconfigureBlock = (bx, by, kind) => {
    const block = city.blocks[by * nx + bx];
    block.kind = kind;
    if (kind === 'park') Object.assign(block, makePark(random, block.x, block.y, block.w));
    else if (kind === 'parking') Object.assign(block, makeParkingLot(random, block.x, block.y, block.w));
    else Object.assign(block, makeBuildings(random, block.x, block.y, block.w));
    rebuildIndexes();
  };

  return city;
}
