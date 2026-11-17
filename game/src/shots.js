// The four screenshot scenes behind ?shot=chase|drive|foot|mission. Each stages a
// different moment in a different part of the city, sets its own money, wanted
// level and objective from here (so they never look like the same frame four
// times), advances the simulation a moment and leaves the camera on the player.
import { PERIOD, ROAD_W, STEP, WALK_W } from './config.js';
import { stepGame } from './game.js';
import { ROLE_PLAYER, makeCar } from './vehicles.js';
import { laneX, laneY, placeOnLane, stageTrafficCar } from './traffic.js';
import { makePoliceCar } from './police.js';
import { makePedestrian, updatePedestrian } from './pedestrians.js';

const BLOCK_LEFT = ROAD_W + WALK_W;

function blockIndex(x) {
  return Math.floor((x - BLOCK_LEFT) / PERIOD);
}

function clearWorld(game) {
  game.cars.length = 0;
  game.pedestrians.length = 0;
  game.bullets.length = 0;
  game.wanted.level = 0;
  game.car = null;
  game.mode = 'foot';
}

function addPedestrian(game, i, j, d, person) {
  const ped = makePedestrian(game.city, i, j, d, 1, person, 52);
  updatePedestrian(game, ped, 0);
  game.pedestrians.push(ped);
  return ped;
}

function scatterPedestrians(game, i, j, count, seedOffset) {
  const ring = game.city.walkRing(i, j);
  const len = 2 * (ring.right - ring.left) + 2 * (ring.bottom - ring.top);
  for (let k = 0; k < count; k += 1) {
    const d = ((k * 37 + seedOffset) % 100) / 100 * len;
    addPedestrian(game, i, j, d, (k + seedOffset) % 4);
  }
}

function settle(game, steps) {
  for (let s = 0; s < steps; s += 1) {
    stepGame(game, { move: { x: 0, y: 0 }, actions: 0 }, STEP);
  }
}

function playerCarOnRoad(game, road, s, speed) {
  const city = game.city;
  const car = makeCar(game.assets.images, 'sedan', 0, 0, 0, ROLE_PLAYER);
  placeOnLane(car, city, 'h', road, 1, s);
  car.speed = speed;
  game.cars.push(car);
  game.car = car;
  game.mode = 'car';
  game.player.x = car.x;
  game.player.y = car.y;
  return car;
}

function stageChase(game) {
  const city = game.city;
  const r = 5;
  const car = playerCarOnRoad(game, r, 1700, 430);

  // Police spaced along the road behind the player.
  const pxs = [1700 - 210, 1700 - 420, 1700 - 630, 1700 - 840];
  for (let k = 0; k < 4; k += 1) {
    const p = makePoliceCar(game, 0, 0, 0);
    placeOnLane(p, city, 'h', r, 1, pxs[k]);
    p.speed = 405;
  }

  // Oncoming and leading traffic.
  stageTrafficCar(game, 'h', r, -1, 1150, 135);
  stageTrafficCar(game, 'h', r, -1, 2500, 135);
  stageTrafficCar(game, 'h', r, 1, 2950, 135);

  const j = blockIndex(car.x);
  scatterPedestrians(game, r, j, 4, 0);
  scatterPedestrians(game, r, j + 1, 4, 2);
  scatterPedestrians(game, r - 1, j, 3, 1);

  game.wanted.level = 4;
  game.money = 2450;
  game.mission.phase = 'active';
  game.mission.kind = 'delivery';
  game.mission.objective = 'Escape the police';
  game.mission.title = 'Getaway';
  game.mission.startX = car.x + 400;
  game.mission.startY = car.y;
  game.mission.targetX = car.x + 1200;
  game.mission.targetY = car.y;
  game.mission.time = 60;

  settle(game, 18);
  game.cam.snap(car.x - 90, car.y);
}

function stageDrive(game) {
  const city = game.city;
  // Find a park and drive along the road just above it.
  let park = city.parks[0];
  for (const p of city.parks) {
    if (blockIndex(p.x) > 2 && blockIndex(p.y) > 1) {
      park = p;
      break;
    }
  }
  const pi = Math.floor((park.y - BLOCK_LEFT) / PERIOD);
  const pj = Math.floor((park.x - BLOCK_LEFT) / PERIOD);
  const r = Math.max(1, pi); // road north of the park
  const car = playerCarOnRoad(game, r, 1600, 300);

  // Traffic waiting at the intersection ahead.
  const ix = city.roadX(pj + 1);
  const yEast = laneY(city.roadY, r, 1);
  const yWest = laneY(city.roadY, r, -1);
  const wait1 = stageTrafficCar(game, 'h', r, 1, ix - 150, 0);
  const wait2 = stageTrafficCar(game, 'h', r, -1, ix + 130, 0);
  const cross = stageTrafficCar(game, 'v', pj + 1, 1, city.roadY(r) + 60, 90);
  wait1.speed = 0;
  wait2.speed = 0;
  cross.speed = 90;

  stageTrafficCar(game, 'h', r, -1, 900, 130);
  stageTrafficCar(game, 'h', r, 1, 2800, 130);

  scatterPedestrians(game, r - 1, pj, 3, 3);
  scatterPedestrians(game, r, pj, 3, 4);

  game.wanted.level = 0;
  game.money = 980;
  game.mission.phase = 'active';
  game.mission.kind = 'delivery';
  game.mission.objective = `Deliver the package to ${city.vNames[pj + 1]}`;
  game.mission.title = 'Delivery';
  game.mission.startX = car.x;
  game.mission.startY = car.y;
  game.mission.targetX = ix;
  game.mission.targetY = yWest;
  game.mission.time = 60;

  settle(game, 30);
  game.cam.snap(car.x + 60, car.y);
  void yEast;
}

function stageFoot(game) {
  const city = game.city;
  const i = Math.floor(city.rows / 2);
  const j = Math.floor(city.cols / 2);
  const ring = city.walkRing(i, j);
  const px = (ring.left + ring.right) / 2;
  const py = ring.top;

  game.mode = 'foot';
  game.player.x = px;
  game.player.y = py;
  game.player.angle = Math.PI / 2; // facing down the sidewalk
  game.player.dir = 2;

  // Parked cars at the kerb on the road just above.
  const road = i;
  const kerbY = city.roadY(road) + (ROAD_W / 2 - 37);
  for (let k = 0; k < 3; k += 1) {
    const c = makeCar(game.assets.images, k === 1 ? 'police' : 'sedan', 0, 0, 0, 'parked');
    c.x = px - 220 + k * 220;
    c.y = kerbY;
    c.angle = 0;
    game.cars.push(c);
  }

  scatterPedestrians(game, i, j, 5, 5);
  scatterPedestrians(game, i, j + 1, 3, 6);
  scatterPedestrians(game, i - 1, j, 3, 7);

  game.wanted.level = 1;
  game.money = 600;
  game.mission.phase = 'active';
  game.mission.kind = 'payphone';
  game.mission.objective = 'Walk to the payphone on Calder Street';
  game.mission.title = 'Payphone';
  game.mission.startX = px;
  game.mission.startY = py;
  game.mission.targetX = ring.right - 40;
  game.mission.targetY = ring.bottom - 30;
  game.mission.time = 60;

  settle(game, 20);
  game.cam.snap(px, py);
}

function stageMission(game) {
  const city = game.city;
  const i = Math.floor(city.rows / 2) + 1;
  const j = Math.floor(city.cols / 2) - 1;
  const ring = city.walkRing(i, j);
  const mx = ring.left + 40;
  const my = ring.bottom - 20;

  game.mode = 'foot';
  game.player.x = mx + 90;
  game.player.y = my + 20;
  game.player.angle = Math.PI; // facing the marker (west)
  game.player.dir = 3;

  // A car waiting beside the marker.
  const c = makeCar(game.assets.images, 'sedan', 0, 0, 0, 'parked');
  c.x = mx + 30;
  c.y = my - 120;
  c.angle = Math.PI / 2;
  game.cars.push(c);

  scatterPedestrians(game, i, j, 3, 8);
  scatterPedestrians(game, i, j - 1, 2, 9);

  game.wanted.level = 0;
  game.money = 3200;
  game.mission.phase = 'idle';
  game.mission.kind = 'pickup';
  game.mission.objective = 'Go to the marker to start the pickup';
  game.mission.title = 'Pickup';
  game.mission.startX = mx;
  game.mission.startY = my;
  game.mission.targetX = mx;
  game.mission.targetY = my;
  game.mission.time = 75;

  settle(game, 20);
  game.cam.snap(mx, my);
}

export function stageShot(name, game) {
  clearWorld(game);
  switch (name) {
    case 'drive':
      stageDrive(game);
      break;
    case 'foot':
      stageFoot(game);
      break;
    case 'mission':
      stageMission(game);
      break;
    case 'chase':
    default:
      stageChase(game);
      break;
  }
}
