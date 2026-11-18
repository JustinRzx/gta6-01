// Traffic that drives: cars cruise the lanes in both directions, slow for the
// car ahead instead of driving through it, and stop at an intersection while a
// car is crossing it.  They never leave the road.  Staging places each car on
// its own lane with no two cars stacked on the same point.

import { TRAFFIC, CAR } from './config.js';
import { roadCenterX, roadCenterY } from './city.js';
import { createCar } from './vehicles.js';

/** The fixed lateral coordinate (the axis the car does not move along). */
export function laneLateral(city, lane) {
  const center = lane.axis === 'v' ? roadCenterX(city, lane.road) : roadCenterY(city, lane.road);
  return center + lane.side * city.laneW / 2;
}

export function laneHeading(lane) {
  if (lane.axis === 'v') return lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  return lane.dir > 0 ? 0 : Math.PI;
}

export function longOf(car) {
  return car.lane.axis === 'v' ? car.y : car.x;
}

export function latOf(car) {
  return car.lane.axis === 'v' ? car.x : car.y;
}

function setPos(car, city, long) {
  const lat = laneLateral(city, car.lane);
  if (car.lane.axis === 'v') {
    car.x = lat;
    car.y = long;
  } else {
    car.x = long;
    car.y = lat;
  }
}

/** Place a traffic car in `lane` at longitudinal coordinate `long`. */
export function placeInLane(car, city, lane, long) {
  car.lane = lane;
  car.heading = laneHeading(lane);
  setPos(car, city, long);
  car.speed = TRAFFIC.cruise;
}

/** Random lane; avoids stacking on an existing car when possible. */
function randomLane(game, city) {
  const r = game.random;
  const axis = r() < 0.5 ? 'v' : 'h';
  const road = Math.floor(r() * (axis === 'v' ? city.gridX + 1 : city.gridY + 1));
  const side = r() < 0.5 ? -1 : 1;
  const dir = r() < 0.5 ? 1 : -1;
  return { axis, road, side, dir };
}

function longRange(city, lane) {
  const roads = lane.axis === 'v' ? city.gridY : city.gridX;
  return { lo: city.roadW / 2 + 40, hi: city.roadW / 2 + roads * city.spacing - 40 };
}

/** Nearest car ahead of `car` in its own lane (any car, lane-bound or not). */
function carAhead(game, car) {
  const lookahead = TRAFFIC.lookahead + CAR.length;
  const axis = car.lane.axis;
  let best = null;
  let bestGap = Infinity;
  const myLong = axis === 'v' ? car.y : car.x;
  const myLat = axis === 'v' ? car.x : car.y;
  for (const other of game.cars) {
    if (other === car || other.kind === 'parked') continue;
    const oLong = axis === 'v' ? other.y : other.x;
    const oLat = axis === 'v' ? other.x : other.y;
    if (Math.abs(oLat - myLat) > game.city.laneW * 0.75) continue;
    const gap = (oLong - myLong) * car.lane.dir;
    if (gap > 0 && gap < lookahead && gap < bestGap) {
      bestGap = gap;
      best = other;
    }
  }
  return best;
}

/** Distance to the next intersection in the direction of travel, or Infinity. */
function nextIntersection(game, car) {
  const city = game.city;
  const halfRoad = city.roadW / 2;
  if (car.lane.axis === 'v') {
    const myLong = car.y;
    for (let i = 0; i <= city.gridY; i += 1) {
      const cy = halfRoad + i * city.spacing;
      const d = (cy - myLong) * car.lane.dir;
      if (d > -city.roadW / 2 && d < city.spacing) return d;
    }
  } else {
    const myLong = car.x;
    for (let i = 0; i <= city.gridX; i += 1) {
      const cx = halfRoad + i * city.spacing;
      const d = (cx - myLong) * car.lane.dir;
      if (d > -city.roadW / 2 && d < city.spacing) return d;
    }
  }
  return Infinity;
}

/** Is any car currently crossing the intersection the car is approaching? */
function crossingCar(game, car) {
  const city = game.city;
  const halfRoad = city.roadW / 2;
  let cx;
  let cy;
  if (car.lane.axis === 'v') {
    cx = roadCenterX(city, car.lane.road);
    cy = car.y + car.lane.dir * (nextIntersection(game, car) || 0);
  } else {
    cy = roadCenterY(city, car.lane.road);
    cx = car.x + car.lane.dir * (nextIntersection(game, car) || 0);
  }
  const box = halfRoad + 26;
  for (const other of game.cars) {
    if (other === car || other.kind === 'parked') continue;
    if (!other.lane || other.lane.axis === car.lane.axis) continue;
    if (Math.abs(other.x - cx) < box && Math.abs(other.y - cy) < box) return true;
  }
  return false;
}

export function spawnTraffic(game) {
  const city = game.city;
  let placed = 0;
  let attempts = 0;
  while (placed < TRAFFIC.count && attempts < 400) {
    attempts += 1;
    const lane = randomLane(game, city);
    const { lo, hi } = longRange(city, lane);
    const long = lo + game.random() * (hi - lo);
    const car = createCar({ kind: 'traffic', sprite: 'car-sedan' });
    placeInLane(car, city, lane, long);
    // No stacking: reject if too close to any existing car.
    let ok = true;
    for (const other of game.cars) {
      if (Math.hypot(other.x - car.x, other.y - car.y) < CAR.length * 1.5) {
        ok = false;
        break;
      }
    }
    if (ok) {
      game.cars.push(car);
      placed += 1;
    }
  }
}

export function updateTraffic(game, dt) {
  const city = game.city;
  for (const car of game.cars) {
    if (car.kind !== 'traffic') continue;
    let target = TRAFFIC.cruise;

    const ahead = carAhead(game, car);
    if (ahead) {
      const aheadLong = car.lane.axis === 'v' ? ahead.y : ahead.x;
      const gap = Math.abs(aheadLong - longOf(car)) - CAR.length;
      if (gap < TRAFFIC.stopGap) target = 0;
      else if (gap < TRAFFIC.lookahead) {
        target = Math.min(target, TRAFFIC.cruise * ((gap - TRAFFIC.stopGap) / (TRAFFIC.lookahead - TRAFFIC.stopGap)));
      }
    }

    // Yield at an intersection where a car is crossing.
    const inter = nextIntersection(game, car);
    if (inter < TRAFFIC.lookahead && inter > 0 && crossingCar(game, car)) {
      target = Math.min(target, Math.max(0, (inter - 20) * 3));
    }

    // Approach the target speed.
    const dv = target - car.speed;
    const maxDelta = (dv > 0 ? TRAFFIC.accel : TRAFFIC.brake) * dt;
    car.speed += Math.abs(dv) < maxDelta ? dv : Math.sign(dv) * maxDelta;
    car.speed = Math.max(0, car.speed);

    const long = longOf(car) + car.lane.dir * car.speed * dt;
    setPos(car, city, long);
    car.heading = laneHeading(car.lane);
  }
}
