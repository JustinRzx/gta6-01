// Police cars: spawned when the wanted level rises, they chase along the road
// grid, turning at intersections toward the player, slowing for the car ahead,
// and flashing their red/blue light bar. They are lane-locked like traffic, so
// they stay on the roads.
import { PERIOD, POLICE_CRUISE, ROAD_HALF, TRAFFIC_FOLLOW, TRAFFIC_STOP_GAP, WORLD_H, WORLD_W } from './config.js';
import { ROLE_POLICE, makeCar } from './vehicles.js';
import { laneX, laneY, placeOnLane } from './traffic.js';

export function playerTarget(game) {
  return game.mode === 'car' ? game.car : game.player;
}

export function makePoliceCar(game, x, y, angle) {
  const car = makeCar(game.assets.images, 'police', x, y, angle, ROLE_POLICE);
  car.cruise = POLICE_CRUISE;
  car.speed = POLICE_CRUISE * 0.5;
  game.cars.push(car);
  return car;
}

/** Spawn one police car on a road a couple of blocks from the player. */
export function spawnPolice(game) {
  const target = playerTarget(game);
  const city = game.city;
  const axis = game.random() < 0.5 ? 'h' : 'v';
  const roads = axis === 'h' ? city.rows + 1 : city.cols + 1;
  const road = Math.floor(game.random() * roads);
  const dir = game.random() < 0.5 ? 1 : -1;
  const length = axis === 'h' ? WORLD_W : WORLD_H;
  // Start 2-3 blocks away along the lane so they do not appear on top of the player.
  const base = axis === 'h' ? target.x : target.y;
  let s = base + (game.random() < 0.5 ? -1 : 1) * (2 + game.random()) * PERIOD;
  s = ((s % length) + length) % length;
  const car = makeCar(game.assets.images, 'police', 0, 0, 0, ROLE_POLICE);
  placeOnLane(car, city, axis, road, dir, s);
  car.cruise = POLICE_CRUISE;
  car.speed = POLICE_CRUISE * 0.6;
  game.cars.push(car);
  return car;
}

export function updatePolice(game, dt) {
  const wanted = game.wanted.level;
  let policeCount = 0;
  for (const car of game.cars) if (car.role === ROLE_POLICE) policeCount += 1;

  // Keep a number of police cars matching the wanted level (max 4 chasing).
  const target = Math.min(4, wanted);
  if (policeCount < target) spawnPolice(game);
  else if (wanted === 0) {
    for (const car of game.cars) if (car.role === ROLE_POLICE) car.role = 'despawn';
  }
}

export function updatePoliceCar(game, car, dt) {
  if (!car.lane) return;
  const target = playerTarget(game);
  const city = game.city;

  maybeTurn(game, car, target);

  let desired = car.cruise;
  const ahead = findPoliceAhead(game, car);
  if (ahead) {
    if (ahead.dist < TRAFFIC_STOP_GAP) desired = 0;
    else if (ahead.dist < TRAFFIC_FOLLOW) desired = Math.min(desired, Math.max(0, ahead.car.speed));
  }
  const rate = desired < car.speed ? 7 : 3;
  car.speed += (desired - car.speed) * Math.min(1, dt * rate);
  if (car.speed < 0) car.speed = 0;

  const step = car.speed * dt;
  if (car.lane.axis === 'h') {
    car.x += car.lane.dir * step;
    car.y = laneY(city.roadY, car.lane.road, car.lane.dir);
    if (car.x > WORLD_W + 90) car.x = -90;
    else if (car.x < -90) car.x = WORLD_W + 90;
  } else {
    car.y += car.lane.dir * step;
    car.x = laneX(city.roadX, car.lane.road, car.lane.dir);
    if (car.y > WORLD_H + 90) car.y = -90;
    else if (car.y < -90) car.y = WORLD_H + 90;
  }

  car.flash += dt * 9;
  if (car.turnCooldown > 0) car.turnCooldown -= dt;
}

function findPoliceAhead(game, car) {
  let best = null;
  let bestGap = Infinity;
  for (const other of game.cars) {
    if (other === car || !other.lane) continue;
    if (other.role !== ROLE_POLICE && other.role !== 'traffic' && other.role !== 'player') continue;
    if (other.lane.axis !== car.lane.axis || other.lane.road !== car.lane.road || other.lane.dir !== car.lane.dir) continue;
    const s = car.lane.axis === 'h' ? car.x : car.y;
    const os = other.lane.axis === 'h' ? other.x : other.y;
    const gap = (os - s) * car.lane.dir;
    if (gap > 0 && gap < bestGap) {
      bestGap = gap;
      best = other;
    }
  }
  return best ? { car: best, dist: bestGap } : null;
}

function maybeTurn(game, car, target) {
  if (car.turnCooldown > 0) return;
  let ix;
  let iy;
  let dist;
  if (car.lane.axis === 'h') {
    const i = car.lane.road;
    const j = Math.round((car.x - ROAD_HALF) / PERIOD);
    ix = ROAD_HALF + j * PERIOD;
    iy = game.city.roadY(i);
    dist = Math.abs(car.x - ix);
  } else {
    const j = car.lane.road;
    const i = Math.round((car.y - ROAD_HALF) / PERIOD);
    ix = game.city.roadX(j);
    iy = ROAD_HALF + i * PERIOD;
    dist = Math.abs(car.y - iy);
  }
  if (dist > 34) return;

  const dx = target.x - ix;
  const dy = target.y - iy;
  const hx = Math.cos(car.angle);
  const hy = Math.sin(car.angle);
  const leftX = hy;
  const leftY = -hx;
  const rightX = -hy;
  const rightY = hx;
  const straightScore = dx * hx + dy * hy;
  const leftScore = dx * leftX + dy * leftY;
  const rightScore = dx * rightX + dy * rightY;

  let choice = 'straight';
  if (leftScore > straightScore && leftScore >= rightScore) choice = 'left';
  else if (rightScore > straightScore) choice = 'right';

  if (choice === 'straight') return;

  const j = Math.round((ix - ROAD_HALF) / PERIOD);
  const i = Math.round((iy - ROAD_HALF) / PERIOD);
  if (car.lane.axis === 'h') {
    const newDir = (choice === 'left' ? leftY : rightY) > 0 ? 1 : -1;
    placeOnLane(car, game.city, 'v', j, newDir, car.y);
  } else {
    const newDir = (choice === 'left' ? leftX : rightX) > 0 ? 1 : -1;
    placeOnLane(car, game.city, 'h', i, newDir, car.x);
  }
  car.turnCooldown = 0.8;
}
