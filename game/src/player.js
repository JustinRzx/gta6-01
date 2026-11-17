// The player on foot: WASD/arrows move them, buildings block them, and the
// direction they face follows the direction they move (so the pedestrian sprite
// can be picked). The health lives here whether the player is on foot or driving.
import { FOOT_SPEED, PLAYER_HEALTH } from './config.js';import { angleToDir } from './sprites.js';

const RADIUS = 13;

export function spawnPlayer(x, y, angle) {
  return {
    x,
    y,
    angle,
    dir: angleToDir(angle),
    speed: 0,
    moving: false,
    health: PLAYER_HEALTH,
    anim: 0,
    punch: 0,
    shoot: 0,
  };
}

function collidesFoot(city, x, y) {
  const samples = [
    [0, 0], [RADIUS, 0], [-RADIUS, 0], [0, RADIUS], [0, -RADIUS],
    [RADIUS, RADIUS], [RADIUS, -RADIUS], [-RADIUS, RADIUS], [-RADIUS, -RADIUS],
  ];
  for (const [ox, oy] of samples) {
    if (city.blocksFoot(x + ox, y + oy)) return true;
  }
  return false;
}

export function updateFoot(game, move, dt) {
  const p = game.player;
  const city = game.city;
  let dx = move.x;
  let dy = move.y;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  p.moving = len > 0;

  const nx = p.x + dx * FOOT_SPEED * dt;
  const ny = p.y + dy * FOOT_SPEED * dt;
  if (!collidesFoot(city, nx, p.y)) p.x = nx;
  if (!collidesFoot(city, p.x, ny)) p.y = ny;

  if (p.moving) {
    p.angle = Math.atan2(dy, dx);
    p.dir = angleToDir(p.angle);
  }

  p.anim += dt * (p.moving ? 1 : 0);
  if (p.punch > 0) p.punch -= dt;
  if (p.shoot > 0) p.shoot -= dt;
}
