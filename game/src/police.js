// Police: when the wanted level rises, police cruisers spawn on nearby roads
// and chase the player, steering toward them and braking to avoid ramming.
// Losing the chase for a while (or cooling the wanted level) sends them away.

import { POLICE, WANTED } from './config.js';
import { isDriveable } from './city.js';
import { createCar, stepCarPhysics, resolveCarCollision } from './vehicles.js';

function steerToward(car, tx, ty) {
  const desired = Math.atan2(ty - car.y, tx - car.x);
  let diff = desired - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.max(-1, Math.min(1, diff * 3));
}

/** The nearest car ahead of `car` along its heading (to avoid piling up). */
function carAhead(game, car) {
  const fx = Math.cos(car.heading);
  const fy = Math.sin(car.heading);
  let bestGap = Infinity;
  for (const o of game.cars) {
    if (o === car || o.kind === 'parked') continue;
    const dx = o.x - car.x;
    const dy = o.y - car.y;
    const proj = dx * fx + dy * fy;
    const lat = Math.abs(dx * -fy + dy * fx);
    if (proj > 0 && proj < 200 && lat < car.width * 0.9 && proj < bestGap) {
      bestGap = proj;
    }
  }
  return bestGap;
}

function findRoadNear(game, cx, cy, minD, maxD) {
  for (let i = 0; i < 40; i += 1) {
    const ang = game.random() * Math.PI * 2;
    const d = minD + game.random() * (maxD - minD);
    const x = cx + Math.cos(ang) * d;
    const y = cy + Math.sin(ang) * d;
    if (isDriveable(game.city, x, y)) return { x, y };
  }
  return null;
}

export function spawnPolice(game) {
  const target = game.player.driving ? game.cars[game.player.car] : game.player;
  const spot = findRoadNear(game, target.x, target.y, 380, 720);
  if (!spot) return null;
  const car = createCar({
    kind: 'police',
    sprite: 'car-police',
    accel: POLICE.accel,
    maxSpeed: POLICE.maxSpeed,
    brake: POLICE.brake,
    turnRate: POLICE.turnRate,
    x: spot.x,
    y: spot.y,
    heading: Math.atan2(target.y - spot.y, target.x - spot.x),
    state: 'chase',
    timer: 0,
    stuck: 0,
  });
  game.cars.push(car);
  return car;
}

/** Keep the number of chasing cars matched to the wanted stars. */
export function managePolice(game) {
  const stars = game.wanted.state.stars;
  let police = game.cars.filter((c) => c.kind === 'police');
  const want = stars <= 0 ? 0 : Math.min(WANTED.maxStars, stars + (stars >= 3 ? 1 : 0));
  while (police.length < want) {
    const p = spawnPolice(game);
    if (!p) break;
    police = game.cars.filter((c) => c.kind === 'police');
  }
  // Remove the extra (furthest) when the wanted level drops.
  if (stars <= 0) {
    for (const p of police) {
      if (p.state === 'chase') p.state = 'leave';
    }
  } else {
    while (police.length > want) {
      const target = game.player.driving ? game.cars[game.player.car] : game.player;
      let far = null;
      let farD = -1;
      for (const p of police) {
        const d = Math.hypot(p.x - target.x, p.y - target.y);
        if (d > farD) {
          farD = d;
          far = p;
        }
      }
      if (!far) break;
      far.state = 'leave';
      police = game.cars.filter((c) => c.kind === 'police');
    }
  }
}

export function updatePolice(game, dt) {
  const target = game.player.driving ? game.cars[game.player.car] : game.player;
  for (const car of game.cars) {
    if (car.kind !== 'police') continue;
    car.flash += dt;

    if (car.state === 'leave') {
      car.timer -= dt;
      const steer = steerToward(car, car.x - 800, car.y);
      stepCarPhysics(car, 1, steer, dt);
      if (car.timer <= -3) car.remove = true;
      continue;
    }

    const d = Math.hypot(target.x - car.x, target.y - car.y);
    const steer = steerToward(car, target.x, target.y);

    if (d > 1600) car.state = 'leave';

    // Speed the car wants: close the distance to the player, but never run into
    // the player or the car directly ahead, so the chase stays a spaced convoy.
    let desired = POLICE.maxSpeed;
    if (d < POLICE.followDistance) desired = Math.min(desired, Math.max(24, (d - 46) * 5));
    const ahead = carAhead(game, car);
    if (ahead < 220) desired = Math.min(desired, Math.max(0, (ahead - 46) * 4));

    let throttle = 0;
    if (car.speed > desired + 15) throttle = -1;
    else if (car.speed < desired - 25) throttle = 1;

    const px = car.x;
    const py = car.y;
    const ph = car.heading;
    stepCarPhysics(car, throttle, steer, dt);
    if (resolveCarCollision(car, game.city, px, py, ph)) {
      car.stuck = (car.stuck || 0) + 1;
      if (car.stuck > 3) {
        // Back up and turn away to clear the obstacle.
        car.heading += (game.random() < 0.5 ? -1 : 1) * 0.9;
        car.stuck = 0;
      }
    } else {
      car.stuck = 0;
    }
  }
}
