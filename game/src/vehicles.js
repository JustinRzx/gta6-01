// Cars: their shared state and the enter/exit mechanics. Every car in the world
// (parked at the kerb, cruising as traffic, chasing as police, or the player's)
// is one object with a role, position, heading and speed; the sprites module
// resolves which image it draws.
import { CAR_LENGTH } from './config.js';
import { carPoliceImage, carSedanImage } from './sprites.js';

export const ROLE_PARKED = 'parked';
export const ROLE_TRAFFIC = 'traffic';
export const ROLE_POLICE = 'police';
export const ROLE_PLAYER = 'player';

export function carWidth(images, sprite) {
  const img = sprite === 'police' ? carPoliceImage(images) : carSedanImage(images);
  return CAR_LENGTH * (img.height / img.width);
}

export function makeCar(images, sprite, x, y, angle, role) {
  return {
    sprite,
    x,
    y,
    angle,
    speed: 0,
    length: CAR_LENGTH,
    width: carWidth(images, sprite),
    role,
    owned: false,
    lane: null, // traffic/police lane: { axis, road, dir }
    cruise: 0,
    stuck: 0,
    target: null, // police target { x, y }
    flash: Math.random() * Math.PI * 2,
    horn: 0,
  };
}

/** The nearest parked car within `maxDist` of the point (or null). */
export function findNearbyCar(game, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of game.cars) {
    if (car.role !== ROLE_PARKED) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

export function enterCar(game, car) {
  car.role = ROLE_PLAYER;
  car.owned = true;
  car.speed = 0;
  game.car = car;
  game.mode = 'car';
}

export function exitCar(game) {
  const car = game.car;
  if (!car) return;
  // Place the player just off the driver's door (left side of the car).
  const left = Math.cos(car.angle - Math.PI / 2);
  const leftY = Math.sin(car.angle - Math.PI / 2);
  const px = car.x + left * (car.width / 2 + 16);
  const py = car.y + leftY * (car.width / 2 + 16);
  if (!game.city.blocksFoot(px, py)) {
    game.player.x = px;
    game.player.y = py;
  } else {
    game.player.x = car.x + 16;
    game.player.y = car.y + 16;
  }
  car.role = ROLE_PARKED;
  car.speed = 0;
  game.car = null;
  game.mode = 'foot';
}
