// A vehicle: its motion and the physics every car shares (accelerate, brake, coast, steer, hit a
// building and stop). The driver (player, traffic or police) supplies a throttle and steer each
// step; this module integrates them and keeps cars out of buildings.

import { VEHICLE } from './config.js';

let nextId = 0;

/** The axis-aligned box that bounds a car at (x, y) with the given heading. */
export function carAABB(x, y, heading, length, width) {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const hx = length / 2;
  const hy = width / 2;
  const ax = Math.abs(cos * hx) + Math.abs(sin * hy);
  const ay = Math.abs(sin * hx) + Math.abs(cos * hy);
  return { x: x - ax, y: y - ay, w: ax * 2, h: ay * 2 };
}

export function createVehicle(kind, x, y, heading) {
  const id = nextId++;
  return {
    id,
    x, y, heading, speed: 0,
    kind,                 // 'civilian' | 'police'
    driver: 'parked',     // 'parked' | 'player' | 'traffic' | 'police'
    length: VEHICLE.length,
    width: VEHICLE.width,
    lane: null,           // traffic: { axis, dir, pos, road }
    wait: 0,              // time waiting at an intersection
    flash: (id * 0.618034) % 1,
    stuck: 0,
  };
}

/** Move a car one fixed step from throttle (-1..1) and steer (-1..1). */
export function stepVehicle(v, throttle, steer, dt, city) {
  applyControls(v, throttle, steer, dt);
  integrate(v, dt, city);
}

function applyControls(v, throttle, steer, dt) {
  const { accel, brake, coast, maxSpeed, reverseMax } = VEHICLE;
  if (throttle > 0) {
    v.speed += accel * throttle * dt;
    if (v.speed > maxSpeed) v.speed = maxSpeed;
  } else if (throttle < 0) {
    if (v.speed > 0) {
      v.speed -= brake * dt;
      if (v.speed < 0) v.speed = 0;
    } else {
      v.speed -= accel * 0.5 * dt;
      if (v.speed < -reverseMax) v.speed = -reverseMax;
    }
  } else {
    if (v.speed > 0) {
      v.speed -= coast * dt;
      if (v.speed < 0) v.speed = 0;
    } else if (v.speed < 0) {
      v.speed += coast * dt;
      if (v.speed > 0) v.speed = 0;
    }
  }
  const speedTurn = 1 - VEHICLE.steerAtSpeed * Math.abs(v.speed);
  const reverse = v.speed < 0 ? -1 : 1;
  v.heading += steer * VEHICLE.steer * Math.max(0, speedTurn) * reverse * dt;
}

function integrate(v, dt, city) {
  const nx = v.x + Math.cos(v.heading) * v.speed * dt;
  const ny = v.y + Math.sin(v.heading) * v.speed * dt;
  if (nx < v.length / 2 || nx > city.worldWidth - v.length / 2) { v.speed = 0; return; }
  if (ny < v.length / 2 || ny > city.worldHeight - v.length / 2) { v.speed = 0; return; }
  if (city.solidAtRect(carAABB(nx, ny, v.heading, v.length, v.width))) {
    v.speed = 0;
    return;
  }
  v.x = nx;
  v.y = ny;
}
