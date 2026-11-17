// Pedestrians: people who walk the sidewalks, turn at corners rather than walking into buildings,
// and scatter out of the way when a car comes at them. They follow the sidewalk "rails" — the
// lines that run beside each road — and turn only where two rails cross.

import { PEDESTRIAN } from './config.js';
import { DIR } from './sprites.js';
import { randInt, randRange, pick } from './random.js';

const AXIS_H = 'h';
const AXIS_V = 'v';

function facingOf(axis, dir) {
  if (axis === AXIS_H) return dir > 0 ? DIR.RIGHT : DIR.LEFT;
  return dir > 0 ? DIR.DOWN : DIR.UP;
}

export function spawnPedestrians(game) {
  const { city, random } = game;
  const peds = [];
  for (let i = 0; i < PEDESTRIAN.count; i += 1) {
    const horizontal = random() < 0.5;
    let x, y, axis, dir;
    if (horizontal) {
      y = pick(random, city.hRails);
      x = randRange(random, city.vRails[0], city.vRails[city.nx]);
      axis = AXIS_H;
      dir = random() < 0.5 ? 1 : -1;
    } else {
      x = pick(random, city.vRails);
      y = randRange(random, city.hRails[0], city.hRails[city.ny]);
      axis = AXIS_V;
      dir = random() < 0.5 ? 1 : -1;
    }
    peds.push({
      x, y, axis, dir,
      person: randInt(random, 0, 3),
      speed: PEDESTRIAN.speed * randRange(random, 0.85, 1.2),
      facing: facingOf(axis, dir),
      scatter: 0,
      fleeX: 0,
      fleeY: 0,
    });
  }
  return peds;
}

function carApproaching(game, ped) {
  for (const v of game.vehicles) {
    if (v.driver === 'parked') continue;
    const dx = ped.x - v.x;
    const dy = ped.y - v.y;
    const d = Math.hypot(dx, dy);
    if (d > PEDESTRIAN.scatterRange) continue;
    const sp = Math.abs(v.speed);
    if (sp < 40) continue;
    const vx = Math.cos(v.heading) * v.speed;
    const vy = Math.sin(v.heading) * v.speed;
    if (vx * dx + vy * dy > 0) return { dx: dx / d, dy: dy / d };
  }
  return null;
}

export function stepPedestrians(game, dt) {
  const { city } = game;
  const min = city.vRails[0];
  const maxX = city.vRails[city.nx];
  const minY = city.hRails[0];
  const maxY = city.hRails[city.ny];

  for (const ped of game.peds) {
    if (ped.scatter > 0) {
      ped.scatter -= dt;
      const speed = PEDESTRIAN.scatterSpeed;
      const nx = ped.x + ped.fleeX * speed * dt;
      const ny = ped.y + ped.fleeY * speed * dt;
      if (!city.circleHitsBuilding(nx, ny, 7)) {
        ped.x = nx;
        ped.y = ny;
      }
      if (Math.abs(ped.fleeX) > Math.abs(ped.fleeY)) ped.facing = ped.fleeX > 0 ? DIR.RIGHT : DIR.LEFT;
      else ped.facing = ped.fleeY > 0 ? DIR.DOWN : DIR.UP;
      continue;
    }

    const coming = carApproaching(game, ped);
    if (coming) {
      ped.scatter = 0.7;
      ped.fleeX = coming.dx;
      ped.fleeY = coming.dy;
      continue;
    }

    const speed = ped.speed;
    const step = speed * dt;
    const nx = ped.x + (ped.axis === AXIS_H ? ped.dir * step : 0);
    const ny = ped.y + (ped.axis === AXIS_V ? ped.dir * step : 0);
    if (!city.circleHitsBuilding(nx, ny, 7) && nx > min - 6 && nx < maxX + 6 && ny > minY - 6 && ny < maxY + 6) {
      ped.x = nx;
      ped.y = ny;
    } else {
      ped.dir = -ped.dir;
      ped.facing = facingOf(ped.axis, ped.dir);
      continue;
    }

    // Turn at corners where a perpendicular rail crosses.
    if (ped.axis === AXIS_H) {
      for (const rx of city.vRails) {
        if (Math.abs(ped.x - rx) < step * 0.6 && game.random() < 0.4) {
          ped.x = rx;
          ped.axis = AXIS_V;
          ped.dir = game.random() < 0.5 ? 1 : -1;
          ped.facing = facingOf(ped.axis, ped.dir);
          break;
        }
      }
    } else {
      for (const ry of city.hRails) {
        if (Math.abs(ped.y - ry) < step * 0.6 && game.random() < 0.4) {
          ped.y = ry;
          ped.axis = AXIS_H;
          ped.dir = game.random() < 0.5 ? 1 : -1;
          ped.facing = facingOf(ped.axis, ped.dir);
          break;
        }
      }
    }
  }
}
