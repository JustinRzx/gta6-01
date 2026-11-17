// The wanted level: crimes raise it (shown as stars), and evading the police for
// a while lowers it back down. Crimes are recorded here so the caller only has to
// say what happened, not how the stars are scored.
import { COOL_SECONDS, WANTED_MAX } from './config.js';

export function addWanted(game, amount) {
  game.wanted.level = Math.min(WANTED_MAX, game.wanted.level + amount);
  game.wanted.cool = 0;
  game.wanted.flash = 1;
}

export function updateWanted(game, dt) {
  const w = game.wanted;
  if (w.flash > 0) w.flash -= dt;
  if (w.level <= 0) {
    w.level = 0;
    return;
  }
  const target = game.mode === 'car' ? game.car : game.player;
  let nearest = Infinity;
  for (const car of game.cars) {
    if (car.role !== 'police') continue;
    nearest = Math.min(nearest, Math.hypot(car.x - target.x, car.y - target.y));
  }
  // "Lost them": no police car within a good distance for a while cools a star.
  if (nearest > 1400 || nearest === Infinity) {
    w.cool += dt;
    if (w.cool >= COOL_SECONDS) {
      w.cool = 0;
      w.level -= 1;
    }
  } else {
    w.cool = 0;
  }
}
