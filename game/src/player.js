// The player on foot: WASD/arrows movement with a facing direction, blocked by
// buildings, plus health (lost when rammed by the police) and a respawn.

import { PLAYER } from './config.js';
import { isSolid } from './city.js';
import { facingToDirection } from './sprites.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    facing: 'down',
    moving: false,
    health: PLAYER.maxHealth,
    money: 0,
    car: null,
    driving: false,
    combatCooldown: 0,
    respawn: { x, y },
  };
}

/** Move the player on foot with axis-separated collision (slides on walls). */
export function stepPlayerFoot(game, move, dt) {
  const p = game.player;
  let dx = move.x;
  let dy = move.y;
  const mag = Math.hypot(dx, dy);
  p.moving = mag > 0.01;
  if (mag > 0.01) {
    dx /= mag;
    dy /= mag;
    const step = PLAYER.speed * dt;
    const nx = p.x + dx * step;
    if (!isSolid(game.city, nx, p.y)) p.x = nx;
    const ny = p.y + dy * step;
    if (!isSolid(game.city, p.x, ny)) p.y = ny;
    p.facing = facingToDirection(Math.atan2(dy, dx));
  }

  if (p.combatCooldown > 0) p.combatCooldown -= dt;

  // Clamp to the world.
  if (p.x < 6) p.x = 6;
  if (p.y < 6) p.y = 6;
  if (p.x > game.city.worldW - 6) p.x = game.city.worldW - 6;
  if (p.y > game.city.worldH - 6) p.y = game.city.worldH - 6;
}

/** Apply damage; on death, respawn at the stored point and clear heat. */
export function damagePlayer(game, amount) {
  const p = game.player;
  if (p.health <= 0) return;
  p.health = Math.max(0, p.health - amount);
  if (p.health <= 0) {
    if (p.driving && p.car !== null) {
      const car = game.cars[p.car];
      p.x = car.x + car.width;
      p.y = car.y;
      p.car = null;
      p.driving = false;
      car.kind = 'parked';
      car.speed = 0;
    }
    p.x = p.respawn.x;
    p.y = p.respawn.y;
    p.health = PLAYER.maxHealth;
    p.money = Math.max(0, p.money - 200);
    game.wanted.set(0);
  }
}
