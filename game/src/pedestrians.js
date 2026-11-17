// Pedestrians walking the pavements: each one follows the sidewalk ring around a
// block, so they turn at the corners and never walk into a building or a road.
// Movement is a single distance around the ring, clockwise or anti-clockwise.
import { PED_SPEED } from './config.js';
import { angleToDir } from './sprites.js';

function ringLength(ring) {
  return 2 * (ring.right - ring.left) + 2 * (ring.bottom - ring.top);
}

export function ringPosition(ring, d) {
  const w = ring.right - ring.left;
  const h = ring.bottom - ring.top;
  const total = 2 * (w + h);
  let r = ((d % total) + total) % total;
  if (r < w) return { x: ring.left + r, y: ring.top, angle: 0 };
  r -= w;
  if (r < h) return { x: ring.right, y: ring.top + r, angle: Math.PI / 2 };
  r -= h;
  if (r < w) return { x: ring.right - r, y: ring.bottom, angle: Math.PI };
  r -= w;
  return { x: ring.left, y: ring.bottom - r, angle: -Math.PI / 2 };
}

export function makePedestrian(city, blockI, blockJ, d, dirSign, person, speed) {
  return { blockI, blockJ, d, dir: dirSign, person, speed, phase: Math.random() * 100 };
}

export function spawnPedestrians(game, count) {
  const city = game.city;
  for (let k = 0; k < count; k += 1) {
    const i = Math.floor(game.random() * city.rows);
    const j = Math.floor(game.random() * city.cols);
    const ring = city.walkRing(i, j);
    const len = ringLength(ring);
    const person = Math.floor(game.random() * 4);
    game.pedestrians.push(makePedestrian(
      city,
      i,
      j,
      game.random() * len,
      game.random() < 0.5 ? 1 : -1,
      person,
      PED_SPEED * (0.75 + game.random() * 0.6),
    ));
  }
}

export function updatePedestrian(game, ped, dt) {
  const city = game.city;
  const ring = city.walkRing(ped.blockI, ped.blockJ);
  const len = ringLength(ring);
  ped.d += ped.dir * ped.speed * dt;
  ped.d = ((ped.d % len) + len) % len;
  const pos = ringPosition(ring, ped.d);
  ped.x = pos.x;
  ped.y = pos.y;
  ped.angle = pos.angle;
  ped.dirIndex = angleToDir(pos.angle);
  ped.phase += dt;
}
