// The city, generated once from a fixed seed: a street grid of two-lane roads on
// a regular lattice, sidewalks carrying the pavement tile, and blocks between
// them filled with buildings (some tall), parks and parking lots. It also owns
// the collision rules (what blocks a person vs a car) and the street names used
// by the mission objectives.
import { BLOCK_W, PERIOD, ROAD_W, ROADS_X, ROADS_Y, WALK_W, WORLD_H, WORLD_W } from './config.js';
import { chance, int, pick } from './random.js';

const ROAD_HALF = ROAD_W / 2;
const WALK_CENTER = ROAD_HALF + WALK_W / 2; // 123: sidewalk centre from a road centre

const BLOCK_LEFT = ROAD_HALF + ROAD_HALF + WALK_W; // 246: block left edge from its road

const H_NAMES = [
  'Calder Street', 'Marlowe Street', 'Huxley Avenue', 'Verne Street',
  'Oswald Avenue', 'Beckett Street', 'Larkin Street', 'Nova Avenue',
  'Fulton Street', 'Peregrine Street', 'Amber Avenue', 'Cobble Street',
];
const V_NAMES = [
  '5th Avenue', 'Kings Road', 'Meridian Boulevard', 'Jasper Road',
  'Orchid Way', 'Grand Avenue', 'Linden Road', 'Sable Street',
  'Ironbark Way', 'Vantage Road', 'Quarry Lane', 'Cinder Road',
];

function roadX(j) {
  return ROAD_HALF + j * PERIOD;
}
function roadY(i) {
  return ROAD_HALF + i * PERIOD;
}

// Roof colours: ordinary buildings, tall buildings (glass) and warm accents.
const ROOF = ['#6b7480', '#7a6a5c', '#8a5a4a', '#5c6b78', '#747d6a', '#6f5f73'];
const GLASS = ['#5b7f95', '#4d718c', '#63849a', '#527088'];
const TALL_ROOF = ['#3f4750', '#4a443c', '#44383a'];

export function createCity(seed) {
  const rand = (function make() {
    // local seeded RNG so the city does not consume the shared game RNG stream
    let a = (seed * 2654435761) | 0;
    return function next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const cols = ROADS_X - 1;
  const rows = ROADS_Y - 1;

  const hNames = [];
  const vNames = [];
  for (let i = 0; i < ROADS_Y; i += 1) hNames.push(H_NAMES[i % H_NAMES.length]);
  for (let j = 0; j < ROADS_X; j += 1) vNames.push(V_NAMES[j % V_NAMES.length]);

  const blockTypes = [];
  const buildings = [];
  const parks = [];
  const parkingLots = [];
  const blocks = [];

  for (let i = 0; i < rows; i += 1) {
    blockTypes.push([]);
    for (let j = 0; j < cols; j += 1) {
      const roll = rand();
      let type = 'building';
      if (roll < 0.15) type = 'park';
      else if (roll < 0.30) type = 'parking';
      blockTypes[i].push(type);

      const x = roadX(j) + BLOCK_LEFT;
      const y = roadY(i) + BLOCK_LEFT;
      blocks.push({ i, j, x, y, w: BLOCK_W, h: BLOCK_W, type });

      if (type === 'building') {
        fillBlockBuildings(rand, x, y, buildings);
      } else if (type === 'park') {
        parks.push(makePark(rand, x, y));
      } else {
        parkingLots.push({ x, y, w: BLOCK_W, h: BLOCK_W, spots: makeParkingSpots(rand, x, y) });
      }
    }
  }

  function fillBlockBuildings(r, x, y, out) {
    const pad = 9;
    const inner = BLOCK_W - pad * 2;
    const split = chance(r, 0.34);
    if (split) {
      const horizontal = chance(r, 0.5);
      const gap = 10;
      if (horizontal) {
        const h = (inner - gap) * (0.4 + r() * 0.2);
        out.push(makeBuilding(x + pad, y + pad, inner, h));
        out.push(makeBuilding(x + pad, y + pad + h + gap, inner, inner - h - gap));
      } else {
        const w = (inner - gap) * (0.4 + r() * 0.2);
        out.push(makeBuilding(x + pad, y + pad, w, inner));
        out.push(makeBuilding(x + pad + w + gap, y + pad, inner - w - gap, inner));
      }
    } else {
      out.push(makeBuilding(x + pad, y + pad, inner, inner));
    }
  }

  function makeBuilding(x, y, w, h) {
    const tall = chance(rand, 0.22);
    let color;
    if (tall) color = pick(rand, TALL_ROOF);
    else if (chance(rand, 0.4)) color = pick(rand, ROOF);
    else color = pick(rand, GLASS);
    return { x, y, w, h, color, tall, windows: chance(rand, 0.6) };
  }

  function makePark(r, x, y) {
    const trees = [];
    const count = int(r, 3, 6);
    for (let k = 0; k < count; k += 1) {
      trees.push({ x: x + 26 + r() * (BLOCK_W - 52), y: y + 26 + r() * (BLOCK_W - 52), r: 10 + r() * 7 });
    }
    return { x, y, w: BLOCK_W, h: BLOCK_W, trees, path: chance(r, 0.6) };
  }

  function makeParkingSpots(r, x, y) {
    const spots = [];
    const colsCount = 2;
    const rowsCount = 4;
    const cw = BLOCK_W / (colsCount + 1);
    const ch = (BLOCK_W - 20) / rowsCount;
    for (let c = 1; c <= colsCount; c += 1) {
      for (let rr = 0; rr < rowsCount; rr += 1) {
        spots.push({
          x: x + c * cw - 22,
          y: y + 10 + rr * ch + ch / 2,
          w: 44,
          h: ch - 14,
          occupied: chance(r, 0.35),
        });
      }
    }
    return spots;
  }

  // ---- classification -----------------------------------------------------

  function band(d) {
    if (d < ROAD_HALF) return 'road';
    if (d < ROAD_HALF + WALK_W) return 'walk';
    return 'block';
  }

  function distanceToRoad(coord) {
    const u = coord % PERIOD;
    const dx = Math.abs(u - ROAD_HALF);
    return Math.min(dx, PERIOD - dx);
  }

  function classify(x, y) {
    const bx = band(distanceToRoad(x));
    const by = band(distanceToRoad(y));
    if (bx === 'road' || by === 'road') return 'road';
    if (bx === 'walk' || by === 'walk') return 'walk';
    return 'block';
  }

  function blockAt(x, y) {
    const j = Math.floor((x - BLOCK_LEFT) / PERIOD);
    const i = Math.floor((y - BLOCK_LEFT) / PERIOD);
    if (i < 0 || i >= rows || j < 0 || j >= cols) return null;
    return blockTypes[i][j];
  }

  function inside(x, y) {
    return x >= 0 && x <= WORLD_W && y >= 0 && y <= WORLD_H;
  }

  function blocksFoot(x, y) {
    if (!inside(x, y)) return true;
    if (classify(x, y) !== 'block') return false;
    return blockAt(x, y) === 'building';
  }

  function blocksCar(x, y) {
    if (!inside(x, y)) return true;
    if (classify(x, y) !== 'block') return false;
    const type = blockAt(x, y);
    return type === 'building' || type === 'park';
  }

  function isRoad(x, y) {
    return classify(x, y) === 'road';
  }

  // A point is on a drivable road (not sidewalk) — used by traffic staging.
  function onRoadLane(x, y) {
    return classify(x, y) === 'road';
  }

  // Sidewalk ring for a block: four centre-line segments pedestrians walk around.
  function walkRing(i, j) {
    const left = roadX(j) + WALK_CENTER;
    const right = roadX(j + 1) - WALK_CENTER;
    const top = roadY(i) + WALK_CENTER;
    const bottom = roadY(i + 1) - WALK_CENTER;
    return { left, right, top, bottom };
  }

  return {
    seed,
    cols,
    rows,
    blocks,
    buildings,
    parks,
    parkingLots,
    hNames,
    vNames,
    roadX,
    roadY,
    classify,
    blockAt,
    blocksFoot,
    blocksCar,
    isRoad,
    onRoadLane,
    walkRing,
    H_NAMES,
    V_NAMES,
  };
}
