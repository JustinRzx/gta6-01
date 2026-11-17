// Police: when the player is wanted, cruisers spawn and chase, their light bars flashing red and
// blue. A police car is a normal vehicle driven by the 'police' driver, which pursues the player's
// car (or the player on foot) and stops them by ramming.

import { WANTED } from './config.js';
import { createVehicle, stepVehicle } from './vehicles.js';
import { laneHeading } from './traffic.js';
import { randInt, randRange, pick } from './random.js';

function steerToward(v, angle) {
  let diff = angle - v.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.max(-1, Math.min(1, diff * 2.6));
}

function spawnPolice(game) {
  const { city, random } = game;
  const target = game.player.car || game.player;
  const lanes = [];
  for (const lane of city.horizontalLanes) lanes.push({ axis: 'h', ...lane });
  for (const lane of city.verticalLanes) lanes.push({ axis: 'v', ...lane });

  let lane = pick(random, lanes);
  for (let t = 0; t < 6; t += 1) {
    const cand = pick(random, lanes);
    const pos = cand.axis === 'h' ? target.x : cand.pos;
    const off = cand.axis === 'h' ? cand.pos : target.y;
    if (Math.hypot(pos - target.x, off - target.y) < WANTED.spawnDistance * 1.2) {
      lane = cand;
      break;
    }
  }

  const s = lane.axis === 'h'
    ? target.x + (random() < 0.5 ? -1 : 1) * randRange(random, WANTED.spawnDistance * 0.5, WANTED.spawnDistance)
    : target.y + (random() < 0.5 ? -1 : 1) * randRange(random, WANTED.spawnDistance * 0.5, WANTED.spawnDistance);
  const x = lane.axis === 'h' ? s : lane.pos;
  const y = lane.axis === 'h' ? lane.pos : s;
  const v = createVehicle('police', x, y, Math.atan2(target.y - y, target.x - x));
  v.driver = 'police';
  v.lane = null;
  return v;
}

function chase(game, v, dt) {
  const target = game.player.car || game.player;
  const dx = target.x - v.x;
  const dy = target.y - v.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  let steer = steerToward(v, angle);
  let throttle = 1;
  if (dist < 46) throttle = 0;
  else if (dist < 100) throttle = 0.55;

  if (v.speed < 12 && throttle > 0.5) {
    v.stuck += dt;
    if (v.stuck > 1.1) {
      throttle = -1;
      steer = -steer;
      v.stuck = 0;
    }
  } else {
    v.stuck = 0;
  }
  stepVehicle(v, throttle, steer, dt, game.city);
}

export function stepPolice(game, dt) {
  const wanted = game.wanted.stars;
  let active = 0;
  for (const v of game.vehicles) if (v.driver === 'police') active += 1;
  const desired = Math.min(WANTED.policeCount, wanted);
  if (active < desired && game.random() < 0.05) {
    game.vehicles.push(spawnPolice(game));
    active += 1;
  }
  for (const v of game.vehicles) {
    if (v.driver === 'police') chase(game, v, dt);
  }
}
