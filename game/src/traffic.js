// Traffic: cars cruise the lanes in both directions, slow for the car ahead instead of passing
// through it, and stop at an intersection when a car on the crossing road is in it. They stay on
// their lane (spawned straight and driven straight), so they never leave the road.

import { TRAFFIC } from './config.js';
import { createVehicle, stepVehicle } from './vehicles.js';
import { randInt, randRange, pick } from './random.js';

const AXIS_H = 'h';
const AXIS_V = 'v';

export function laneHeading(axis, dir) {
  if (axis === AXIS_H) return dir > 0 ? 0 : Math.PI;
  return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
}

export function spawnTraffic(game) {
  const { city, random } = game;
  const lanes = [];
  for (const lane of city.horizontalLanes) lanes.push({ axis: AXIS_H, ...lane });
  for (const lane of city.verticalLanes) lanes.push({ axis: AXIS_V, ...lane });

  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const lane = pick(random, lanes);
    const axis = lane.axis;
    const pos = lane.pos;
    const road = lane.road;
    const low = axis === AXIS_H ? city.vRoads[0] + 40 : city.hRoads[0] + 40;
    const high = axis === AXIS_H ? city.vRoads[city.nx] - 40 : city.hRoads[city.ny] - 40;
    const s = randRange(random, low, high);
    const x = axis === AXIS_H ? s : pos;
    const y = axis === AXIS_H ? pos : s;
    const v = createVehicle('civilian', x, y, laneHeading(axis, lane.dir));
    v.driver = 'traffic';
    v.lane = { axis, dir: lane.dir, pos, road };
    cars.push(v);
  }
  return cars;
}

function laneScalar(v) {
  return v.lane.axis === AXIS_H ? v.x : v.y;
}

function sameLane(a, b) {
  return a.lane.axis === b.lane.axis && a.lane.dir === b.lane.dir && Math.abs(a.lane.pos - b.lane.pos) < 10;
}

/** Distance to the nearest car in the same lane ahead, or Infinity. */
function carAhead(game, v, maxDist) {
  const s = laneScalar(v);
  let best = Infinity;
  for (const other of game.vehicles) {
    if (other === v || !other.lane) continue;
    if (!sameLane(v, other)) continue;
    const os = laneScalar(other);
    const d = (os - s) * v.lane.dir;
    if (d > 0 && d < best) best = d;
  }
  return best > maxDist ? Infinity : best;
}

/** The next road crossing ahead, with its centre and the distance to it. */
function nextIntersection(game, v) {
  const { city } = game;
  if (v.lane.axis === AXIS_H) {
    for (const rx of city.vRoads) {
      const d = (rx - v.x) * v.lane.dir;
      if (d > -v.length / 2) return { cx: rx, cy: v.lane.road, dist: d };
    }
  } else {
    for (const ry of city.hRoads) {
      const d = (ry - v.y) * v.lane.dir;
      if (d > -v.length / 2) return { cx: v.lane.road, cy: ry, dist: d };
    }
  }
  return null;
}

/** Whether a car on the crossing road is inside the intersection box. */
function intersectionBlocked(game, v, inter) {
  const rw = game.city.roadWidth;
  const half = rw / 2;
  for (const other of game.vehicles) {
    if (other === v || !other.lane) continue;
    if (other.lane.axis === v.lane.axis) continue;
    if (Math.abs(other.x - inter.cx) < half && Math.abs(other.y - inter.cy) < half) return true;
  }
  return false;
}

export function stepTraffic(game, dt) {
  const { city } = game;
  const margin = city.roadWidth / 2 + 70;
  for (const v of game.vehicles) {
    if (v.driver !== 'traffic') continue;
    let throttle = 1;
    const ahead = carAhead(game, v, TRAFFIC.gap * 7);
    if (ahead < TRAFFIC.gap) throttle = 0;
    else if (ahead < TRAFFIC.gap * 2.2) throttle = 0.6;

    const inter = nextIntersection(game, v);
    if (inter && inter.dist < TRAFFIC.stopDistance) {
      if (intersectionBlocked(game, v, inter)) {
        throttle = 0;
        v.wait += dt;
        if (v.wait > TRAFFIC.yieldWait) {
          throttle = 1;
          v.wait = 0;
        }
      } else {
        v.wait = 0;
      }
    }

    stepVehicle(v, throttle, 0, dt, city);

    // Turn around near the edge of the world, where the road ends.
    const s = laneScalar(v);
    const max = v.lane.axis === AXIS_H ? city.worldWidth : city.worldHeight;
    if (s < margin || s > max - margin) {
      v.lane.dir = -v.lane.dir;
      v.heading = laneHeading(v.lane.axis, v.lane.dir);
      v.wait = 0;
    }
  }
}
