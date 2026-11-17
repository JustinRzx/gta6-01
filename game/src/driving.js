// Getting in and out of cars and driving the player's car. W/S are throttle and brake, A/D steer
// (steering depends on speed, the car coasts and brakes). Entering a car the player does not own
// is grand theft auto and raises the wanted level.

import { PLAYER } from './config.js';
import { directionFromAngle } from './sprites.js';
import { stepVehicle } from './vehicles.js';

export function findNearbyCar(game) {
  const p = game.player;
  let best = null;
  let bestD = PLAYER.enterRange;
  for (const v of game.vehicles) {
    if (v.driver === 'player') continue;
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function enterCar(game, vehicle) {
  const p = game.player;
  if (game.playerCar && game.playerCar !== vehicle) {
    game.reportCrime(vehicle.kind === 'police' ? 2 : 1);
  }
  vehicle.driver = 'player';
  vehicle.speed = 0;
  p.car = vehicle;
  p.mode = 'car';
  game.playerCar = vehicle;
}

export function exitCar(game) {
  const p = game.player;
  const v = p.car;
  if (!v) return;
  const side = v.heading + Math.PI / 2;
  const offset = v.width / 2 + PLAYER.radius + 6;
  let ex = v.x + Math.cos(side) * offset;
  let ey = v.y + Math.sin(side) * offset;
  ex = Math.max(PLAYER.radius, Math.min(game.city.worldWidth - PLAYER.radius, ex));
  ey = Math.max(PLAYER.radius, Math.min(game.city.worldHeight - PLAYER.radius, ey));
  if (game.city.circleHitsBuilding(ex, ey, PLAYER.radius)) {
    ex = v.x;
    ey = v.y;
  }
  p.x = ex;
  p.y = ey;
  p.dir = directionFromAngle(v.heading);
  p.mode = 'foot';
  v.driver = 'parked';
  p.car = null;
}

/** Drive the player's car from the input for one fixed step. */
export function stepDriving(game, dt, controls) {
  const v = game.player.car;
  const axis = controls || game.input.axis();
  let throttle = 0;
  let steer = 0;
  if (axis.y < 0) throttle = 1;
  else if (axis.y > 0) throttle = -1;
  if (axis.x !== 0) steer = axis.x;
  stepVehicle(v, throttle, steer, dt, game.city);
}
