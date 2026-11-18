// Pedestrians walking the pavements: each one follows the sidewalk grid, turns
// at corners instead of walking into buildings, occasionally pauses, and can
// step across a road at a crosswalk.  A pedestrian can be knocked down (by a
// punch or a car) and gets back up after a moment.

import { PEDESTRIAN } from './config.js';
import { groundAt, G_ROAD, G_BLOCK, G_SIDEWALK, G_OUTSIDE } from './city.js';
import { directionVector } from './sprites.js';

const PERP = { up: ['left', 'right'], down: ['left', 'right'], left: ['up', 'down'], right: ['up', 'down'] };

export function createPedestrian(x, y, dir, person) {
  return {
    x,
    y,
    dir,
    person,
    speed: PEDESTRIAN.speed * (0.85 + Math.random() * 0.3),
    mode: 'walk',
    timer: Math.random() * 2,
    crossDist: 0,
    downed: false,
    downedTimer: 0,
    bob: Math.random() * Math.PI * 2,
  };
}

/** A pavement point chosen pseudo-randomly for spawning. */
export function spawnPoint(game) {
  const r = game.random;
  const city = game.city;
  const vertical = r() < 0.5;
  const road = Math.floor(r() * (vertical ? city.gridX + 1 : city.gridY + 1));
  const length = (vertical ? city.gridY : city.gridX) * city.spacing;
  const along = 0.12 + r() * 0.76;
  const side = r() < 0.5 ? -1 : 1;
  const offset = city.roadW / 2 + city.sidewalkW * 0.5;
  const halfRoad = city.roadW / 2;
  let x;
  let y;
  if (vertical) {
    x = halfRoad + road * city.spacing + side * offset;
    y = halfRoad + along * length;
  } else {
    y = halfRoad + road * city.spacing + side * offset;
    x = halfRoad + along * length;
  }
  return { x, y };
}

function sample(game, x, y) {
  return groundAt(game.city, x, y);
}

function pickDir(game, from, options) {
  // Prefer a direction whose next step stays walkable (sidewalk/park/etc.).
  const r = game.random;
  for (let attempt = 0; attempt < options.length; attempt += 1) {
    const dir = options[Math.floor(r() * options.length)];
    const v = directionVector(dir);
    const g = sample(game, from.x + v.x * 20, from.y + v.y * 20);
    if (g !== G_BLOCK && g !== G_ROAD && g !== G_OUTSIDE) return dir;
  }
  return options[Math.floor(r() * options.length)];
}

function knockDown(p) {
  p.downed = true;
  p.downedTimer = 5;
}

export function updatePedestrians(game, dt) {
  const city = game.city;
  for (const p of game.people) {
    if (p.downed) {
      p.downedTimer -= dt;
      if (p.downedTimer <= 0) {
        p.downed = false;
      }
      continue;
    }

    p.bob += dt * (p.mode === 'walk' ? 11 : 0);
    if (p.mode === 'pause') {
      p.timer -= dt;
      if (p.timer <= 0) {
        p.mode = 'walk';
        p.timer = 0;
      }
      continue;
    }
    if (p.mode === 'cross') {
      const v = directionVector(p.dir);
      p.x += v.x * p.speed * dt;
      p.y += v.y * p.speed * dt;
      p.crossDist -= p.speed * dt;
      if (p.crossDist <= 0) p.mode = 'walk';
      continue;
    }

    // Walking along a sidewalk.
    const v = directionVector(p.dir);
    const aheadX = p.x + v.x * 18;
    const aheadY = p.y + v.y * 18;
    const g = sample(game, aheadX, aheadY);

    if (g === G_BLOCK || g === G_OUTSIDE) {
      p.dir = pickDir(game, p, PERP[p.dir]);
    } else if (g === G_ROAD) {
      // Reached a crossing: either step across or turn along the pavement.
      if (game.random() < 0.4) {
        p.mode = 'cross';
        p.crossDist = city.roadW + city.sidewalkW;
      } else {
        p.dir = pickDir(game, p, PERP[p.dir]);
      }
    } else {
      p.x += v.x * p.speed * dt;
      p.y += v.y * p.speed * dt;
    }

    // Occasionally stop for a rest.
    if (p.mode === 'walk' && game.random() < dt * 0.06) {
      p.mode = 'pause';
      p.timer = PEDESTRIAN.pauseMin + game.random() * (PEDESTRIAN.pauseMax - PEDESTRIAN.pauseMin);
    }
  }
}

export function downPedestrian(p) {
  knockDown(p);
}

export function anyPedestrianNear(game, x, y, range) {
  for (const p of game.people) {
    if (p.downed) continue;
    if (Math.hypot(p.x - x, p.y - y) < range) return p;
  }
  return null;
}
