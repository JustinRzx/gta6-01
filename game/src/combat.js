// Combat: a punch (Space) and a short-range shot (K or left click). Both hurt
// nearby pedestrians and the shot can rattle a police car; either counts as a
// crime and raises the wanted level.
import { ACTION_PUNCH, ACTION_SHOOT } from './input.js';
import { addWanted } from './wanted.js';

const BULLET_SPEED = 920;
const BULLET_RANGE = 340;
const PUNCH_RANGE = 48;

function facing(game) {
  const body = game.mode === 'car' ? game.car : game.player;
  return { x: body.x, y: body.y, angle: body.angle };
}

export function handleCombat(game, actions) {
  if (actions & ACTION_PUNCH) punch(game);
  if (actions & ACTION_SHOOT) shoot(game);
}

function punch(game) {
  const f = facing(game);
  if (game.mode === 'car') return;
  const p = game.player;
  p.punch = 0.24;
  const fx = Math.cos(p.angle);
  const fy = Math.sin(p.angle);
  for (const ped of game.pedestrians) {
    if (ped.downed > 0) continue;
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < PUNCH_RANGE && (dx * fx + dy * fy) / d > 0.2) {
      knockDown(game, ped);
      addWanted(game, 1);
      return;
    }
  }
  void f;
}

function shoot(game) {
  const f = facing(game);
  const body = game.mode === 'car' ? game.car : game.player;
  if (game.mode === 'foot') game.player.shoot = 0.18;
  const fx = Math.cos(body.angle);
  const fy = Math.sin(body.angle);
  game.bullets.push({
    x: body.x + fx * 22,
    y: body.y + fy * 22,
    vx: fx * BULLET_SPEED,
    vy: fy * BULLET_SPEED,
    life: BULLET_RANGE / BULLET_SPEED,
  });
  if (game.mode === 'foot') addWanted(game, 1); // firing a gun in the street
  void f;
}

function knockDown(game, ped) {
  ped.downed = 2;
  ped.downedDir = ped.dirIndex ?? 0;
}

export function updateBullets(game, dt) {
  const city = game.city;
  for (let i = game.bullets.length - 1; i >= 0; i -= 1) {
    const b = game.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;

    if (city.blocksFoot(b.x, b.y)) dead = true;

    if (!dead) {
      for (const ped of game.pedestrians) {
        if (ped.downed > 0) continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
          knockDown(game, ped);
          addWanted(game, 1);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of game.cars) {
        if (car.role === 'police' && Math.hypot(car.x - b.x, car.y - b.y) < car.length / 2) {
          car.damage = (car.damage ?? 0) + 34;
          dead = true;
          break;
        }
      }
    }
    if (dead) game.bullets.splice(i, 1);
  }
}
