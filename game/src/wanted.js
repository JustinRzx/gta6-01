// The wanted level: crimes raise it, shown as stars; losing the police for a while cools it down.
// reportCrime is the single entry point every crime (car theft, hitting a person or a police car)
// calls through.

import { WANTED } from './config.js';

export function createWanted() {
  return { stars: 0, coolTimer: 0 };
}

/** Raise the wanted level by `stars` (never past the cap), resetting the cool-down. */
export function reportCrime(game, stars) {
  const w = game.wanted;
  w.stars = Math.min(WANTED.maxStars, w.stars + stars);
  w.coolTimer = 0;
}

/** True while any police car is still close enough to count as "on the player". */
function policeNearby(game) {
  const target = game.player.car || game.player;
  for (const v of game.vehicles) {
    if (v.driver !== 'police') continue;
    if (Math.hypot(v.x - target.x, v.y - target.y) < WANTED.despawnDistance) return true;
  }
  return false;
}

export function stepWanted(game, dt) {
  const w = game.wanted;
  if (w.stars <= 0) return;
  if (policeNearby(game)) {
    w.coolTimer = 0;
  } else {
    w.coolTimer += dt;
    if (w.coolTimer >= WANTED.cooldownTime) {
      w.stars -= 1;
      w.coolTimer = 0;
      if (w.stars <= 0) removePolice(game);
    }
  }
}

/** Recall every police car when the heat is gone. */
export function removePolice(game) {
  game.vehicles = game.vehicles.filter((v) => v.driver !== 'police');
}
