// Car entities and their physics: position, heading and speed, the throttle /
// brake / steer integration that makes a car coast and turn by speed, and the
// collision that stops a car when it hits a building, a kerb or another car.

import { CAR } from './config.js';
import { isDriveable } from './city.js';

export function createCar(overrides) {
  const car = {
    kind: 'traffic', // 'player' | 'traffic' | 'police' | 'parked'
    x: 0,
    y: 0,
    heading: 0,
    speed: 0,
    accel: CAR.accel,
    reverseAccel: CAR.reverseAccel,
    brake: CAR.brake,
    coastDecel: CAR.coastDecel,
    maxSpeed: CAR.maxSpeed,
    maxReverse: CAR.maxReverse,
    turnRate: CAR.turnRate,
    length: CAR.length,
    width: CAR.width,
    sprite: 'car-sedan',
    // AI fields (traffic / police):
    steer: 0,
    throttle: 0,
    targetSpeed: 0,
    lane: null, // { axis: 'v'|'h', dir: 1|-1, road: index, offset: +/-lane }
    state: 'cruise',
    timer: 0,
    lightPhase: 0,
    wanter: 0,
    flash: 0,
  };
  Object.assign(car, overrides);
  return car;
}

/** Unit forward vector for a car's heading. */
export function forward(car) {
  return { x: Math.cos(car.heading), y: Math.sin(car.heading) };
}

/** The four corners of a car's oriented bounding box. */
export function carCorners(car) {
  const fx = Math.cos(car.heading);
  const fy = Math.sin(car.heading);
  const rx = -fy; // right side of the car
  const ry = fx;
  const hl = car.length / 2;
  const hw = car.width / 2;
  const out = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      out.push({
        x: car.x + fx * sx * hl + rx * sy * hw,
        y: car.y + fy * sx * hl + ry * sy * hw,
      });
    }
  }
  return out;
}

/** Circles that over-approximate the car, for cheap collision tests. */
export function carCircles(car) {
  const f = forward(car);
  const rx = -f.y;
  const ry = f.x;
  const r = car.width / 2;
  const hl = car.length / 2 - r;
  return [
    { x: car.x + f.x * hl, y: car.y + f.y * hl, r },
    { x: car.x - f.x * hl, y: car.y - f.y * hl, r },
  ];
}

/** Integrate speed, heading and position for one step. */
export function stepCarPhysics(car, throttle, steer, dt) {
  let v = car.speed;
  if (throttle > 0.01) {
    if (v < 0) v += car.brake * dt;
    else v += car.accel * dt;
  } else if (throttle < -0.01) {
    if (v > 0) v -= car.brake * dt;
    else v -= car.reverseAccel * dt;
  } else if (v > 0) {
    v = Math.max(0, v - car.coastDecel * dt);
  } else {
    v = Math.min(0, v + car.coastDecel * dt);
  }
  if (v > car.maxSpeed) v = car.maxSpeed;
  if (v < -car.maxReverse) v = -car.maxReverse;

  const speedFrac = Math.min(1, Math.abs(v) / 120);
  const turn = steer * car.turnRate * (CAR.turnAtStandstill + (1 - CAR.turnAtStandstill) * speedFrac);
  if (Math.abs(v) > 3) car.heading += turn * dt * (v < 0 ? -1 : 1);

  car.speed = v;
  car.x += Math.cos(car.heading) * v * dt;
  car.y += Math.sin(car.heading) * v * dt;
}

/**
 * After moving, check the car's corners against the driveable ground; if any
 * corner has left the road, undo the move and stop.  Returns true on a hit.
 */
export function resolveCarCollision(car, city, px, py, ph) {
  for (const c of carCorners(car)) {
    if (!isDriveable(city, c.x, c.y)) {
      car.x = px;
      car.y = py;
      car.heading = ph;
      car.speed = 0;
      return true;
    }
  }
  return false;
}

/** Distance from point to a car's centre (for enter/exit reach tests). */
export function distToCar(car, x, y) {
  return Math.hypot(car.x - x, car.y - y);
}
