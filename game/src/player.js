// The player on foot: WASD/arrow movement, a facing direction, and collision against buildings.
// When driving, the player is inside a car (see driving.js); this module only walks.

import { PLAYER, HEALTH } from './config.js';
import { DIR_VEC } from './sprites.js';

export function createPlayer(x, y, dir) {
  return {
    mode: 'foot',
    x, y,
    dir,           // facing, one of sprites.DIR
    car: null,     // the vehicle the player is in when driving
    punchTimer: 0,
    punchCooldown: 0,
    walkAnim: 0,
    health: HEALTH.max,
  };
}

export function stepPlayerFoot(player, axis, dt, city) {
  let dx = axis.x;
  let dy = axis.y;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  if (dx !== 0 || dy !== 0) {
    const speed = PLAYER.walkSpeed;
    const nx = player.x + dx * speed * dt;
    if (nx > PLAYER.radius && nx < city.worldWidth - PLAYER.radius && !city.circleHitsBuilding(nx, player.y, PLAYER.radius)) {
      player.x = nx;
    }
    const ny = player.y + dy * speed * dt;
    if (ny > PLAYER.radius && ny < city.worldHeight - PLAYER.radius && !city.circleHitsBuilding(player.x, ny, PLAYER.radius)) {
      player.y = ny;
    }
    player.walkAnim += dt * speed;
    // Face the dominant direction of travel.
    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 1 : 3;
    else player.dir = dy > 0 ? 2 : 0;
  }
  if (player.punchTimer > 0) player.punchTimer -= dt;
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
}

/** The vector the player is facing (for look-ahead and combat). */
export function playerFacingVector(player) {
  return DIR_VEC[player.dir];
}
