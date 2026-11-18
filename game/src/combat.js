// Combat on foot: a punch at close range (knocks a pedestrian down) or, when
// no one is in reach, a shot that flies in the direction the player faces and
// drops the first pedestrian it hits.  Both crimes raise the wanted level.

import { PLAYER } from './config.js';
import { directionVector } from './sprites.js';
import { downPedestrian, anyPedestrianNear } from './pedestrians.js';

export function createCombat() {
  return { cooldown: 0 };
}

export function updateCombat(game, dt) {
  if (game.combat.cooldown > 0) game.combat.cooldown -= dt;
}

function facing(game) {
  return directionVector(game.player.facing);
}

export function attack(game) {
  if (game.combat.cooldown > 0) return;
  const p = game.player;
  const f = facing(game);
  game.combat.cooldown = PLAYER.punchCooldown;

  // Melee first: the nearest living pedestrian inside a short forward cone.
  const target = anyPedestrianNear(game, p.x, p.y, PLAYER.punchRange);
  if (target) {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const dot = (dx / d) * f.x + (dy / d) * f.y;
    if (dot > 0.3) {
      downPedestrian(target);
      game.wanted.shootPerson();
      game.effects.push({ kind: 'punch', x: p.x + f.x * 20, y: p.y + f.y * 20, t: 0 });
      return;
    }
  }

  // Otherwise a shot: a short-lived bullet in the facing direction.
  game.bullets.push({
    x: p.x + f.x * 16,
    y: p.y + f.y * 16,
    vx: f.x * 760,
    vy: f.y * 760,
    life: PLAYER.shootRange / 760,
  });
  game.combat.cooldown = PLAYER.shootCooldown;
  game.effects.push({ kind: 'muzzle', x: p.x + f.x * 18, y: p.y + f.y * 18, t: 0 });
}

export function updateBullets(game, dt) {
  for (const b of game.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0) continue;
    const hit = anyPedestrianNear(game, b.x, b.y, 14);
    if (hit) {
      downPedestrian(hit);
      game.wanted.shootPerson();
      b.life = 0;
    }
  }
  game.bullets = game.bullets.filter((b) => b.life > 0);
}
