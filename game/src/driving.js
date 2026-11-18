// Entering, driving and leaving cars.  On foot the player walks up to a car and
// presses E; driving maps the movement keys to throttle and steering (the car
// coasts and brakes, and steering depends on speed), and E steps back out.

import { distToCar, stepCarPhysics, resolveCarCollision } from './vehicles.js';

/** The nearest car within maxDist of (x, y), or null. */
export function nearestCar(game, x, y, maxDist) {
  let best = -1;
  let bestD = maxDist;
  for (let i = 0; i < game.cars.length; i += 1) {
    const c = game.cars[i];
    const d = distToCar(c, x, y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best < 0 ? null : best;
}

/** Step into car `idx`.  Stealing a parked/traffic car is a crime (wanted). */
export function enterCar(game, idx) {
  const car = game.cars[idx];
  game.player.car = idx;
  game.player.driving = true;
  car.kind = 'player';
  car.speed = 0;
  if (game.wanted) game.wanted.steal(car);
  car.owned = true;
}

/** Step out beside the car, on the driver side. */
export function exitCar(game) {
  const car = game.cars[game.player.car];
  const f = { x: Math.cos(car.heading), y: Math.sin(car.heading) };
  const sx = car.x + f.y * (car.width / 2 + 22);
  const sy = car.y - f.x * (car.width / 2 + 22);
  game.player.x = sx;
  game.player.y = sy;
  game.player.car = null;
  game.player.driving = false;
  car.kind = 'parked';
  car.speed = 0;
}

/** Movement vector -> {throttle, steer} for the player's car. */
export function controlToInput(move) {
  return { throttle: move.y === 0 ? 0 : -move.y, steer: move.x };
}

/** One driving step for the player's car, with collision. */
export function stepPlayerCar(game, move, dt) {
  const car = game.cars[game.player.car];
  const { throttle, steer } = controlToInput(move);
  const px = car.x;
  const py = car.y;
  const ph = car.heading;
  stepCarPhysics(car, throttle, steer, dt);
  resolveCarCollision(car, game.city, px, py, ph);
  car.throttle = throttle;
  car.steer = steer;
}
