// The whole game wired together: builds the city, spawns the player, traffic,
// parked cars, pedestrians and the first mission, then steps the simulation one
// fixed step at a time. It is the single object the renderer draws and the loop
// advances; each named sub-system (traffic, police, wanted, missions, combat,
// driving, pedestrians) lives in its own module and is driven from here.
import { FOOT_SPEED, PLAYER_HEALTH, ROAD_HALF, ROAD_W } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createCamera } from './camera.js';
import { spawnPlayer, updateFoot } from './player.js';
import { updateCar } from './driving.js';
import { enterCar, exitCar, findNearbyCar, makeCar, ROLE_PARKED, ROLE_POLICE, ROLE_TRAFFIC } from './vehicles.js';
import { placeOnLane, spawnTraffic, updateTrafficCar } from './traffic.js';
import { makePedestrian, spawnPedestrians, updatePedestrian } from './pedestrians.js';
import { addWanted, updateWanted } from './wanted.js';
import { updatePolice, updatePoliceCar } from './police.js';
import { createMissionState, placeMission, updateMission } from './missions.js';
import { handleCombat, updateBullets } from './combat.js';
import { createAudio } from './audio.js';
import { ACTION_ENTER } from './input.js';

export function createGame(seed, assets) {
  const random = createRandom(seed);
  const city = createCity(seed);
  const cam = createCamera();

  const game = {
    seed,
    assets,
    random,
    city,
    cam,
    camera: cam.camera,
    time: 0,
    mode: 'foot',
    player: null,
    car: null,
    cars: [],
    pedestrians: [],
    bullets: [],
    wanted: { level: 0, cool: 0, flash: 0 },
    money: 0,
    mission: createMissionState(),
    stats: { jobs: 0 },
    audio: createAudio(assets.audio),
    crimeCooldown: 0,
  };

  const spawn = spawnPoint(city);
  game.player = spawnPlayer(spawn.x, spawn.y, 0);
  game.spawn = { x: spawn.x, y: spawn.y };

  spawnParkedCars(game, spawn);
  spawnTraffic(game, 26);
  spawnPedestrians(game, 46);
  placeMission(game, 0);

  cam.snap(game.player.x, game.player.y);

  return game;
}

function spawnPoint(city) {
  const i = Math.floor(city.rows / 2);
  const j = Math.floor(city.cols / 2);
  const ring = city.walkRing(i, j);
  return { x: (ring.left + ring.right) / 2, y: ring.top };
}

function kerbSlot(city, axis, road, side, s, width, random) {
  const inset = ROAD_HALF - width / 2 - 4;
  if (axis === 'h') {
    return { x: s, y: city.roadY(road) + side * inset, angle: random() < 0.5 ? 0 : Math.PI };
  }
  return { x: city.roadX(road) + side * inset, y: s, angle: random() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
}

function spawnParkedCars(game, near) {
  const city = game.city;
  const width = 66;

  // A car waiting near the spawn so the player can get in right away.
  const road = Math.floor(city.rows / 2);
  const car0 = makeCar(game.assets.images, 'sedan', 0, 0, 0, ROLE_PARKED);
  const s0 = near.x + 80;
  const slot0 = kerbSlot(city, 'h', road, -1, s0, width, game.random);
  car0.x = slot0.x;
  car0.y = slot0.y;
  car0.angle = slot0.angle;
  game.cars.push(car0);

  const count = 13;
  for (let k = 0; k < count; k += 1) {
    const axis = game.random() < 0.5 ? 'h' : 'v';
    const roads = axis === 'h' ? city.rows + 1 : city.cols + 1;
    const r = Math.floor(game.random() * roads);
    const side = game.random() < 0.5 ? -1 : 1;
    const length = axis === 'h' ? city.cols : city.rows;
    const s = (game.random() * (length * 552)) + 120;
    const car = makeCar(game.assets.images, game.random() < 0.3 ? 'police' : 'sedan', 0, 0, 0, ROLE_PARKED);
    const slot = kerbSlot(city, axis, r, side, s, width, game.random);
    car.x = slot.x;
    car.y = slot.y;
    car.angle = slot.angle;
    if (city.blocksCar(car.x, car.y)) continue;
    game.cars.push(car);
  }
}

function body(game) {
  return game.mode === 'car' ? game.car : game.player;
}

function commitCrime(game, amount) {
  if (game.crimeCooldown > 0) return;
  addWanted(game, amount);
  game.crimeCooldown = 1;
}

export function stepGame(game, controls, dt) {
  game.time += dt;
  if (game.crimeCooldown > 0) game.crimeCooldown -= dt;

  const actions = controls.actions;

  handleCombat(game, actions);
  updateBullets(game, dt);

  if (game.mode === 'foot') {
    if (actions & ACTION_ENTER) {
      const car = findNearbyCar(game, game.player.x, game.player.y, 72);
      if (car) {
        enterCar(game, car);
        commitCrime(game, 1); // stealing a car
      }
    }
    updateFoot(game, controls.move, dt);
  } else {
    if (actions & ACTION_ENTER) exitCar(game);
    updateCar(game, controls.move, dt);
    checkCarHitPedestrian(game);
    carCollisions(game);
  }

  for (const car of game.cars) {
    if (car.role === ROLE_TRAFFIC) updateTrafficCar(game, car, dt);
  }

  updatePolice(game, dt);
  for (const car of game.cars) {
    if (car.role === ROLE_POLICE) updatePoliceCar(game, car, dt);
  }

  let despawned = false;
  for (const car of game.cars) if (car.role === 'despawn') despawned = true;
  if (despawned) game.cars = game.cars.filter((car) => car.role !== 'despawn');

  for (const ped of game.pedestrians) updatePedestrian(game, ped, dt);

  // Health: slow regen, damage taken while being rammed by police is applied in carCollisions.
  game.player.health = Math.min(PLAYER_HEALTH, game.player.health + dt * 0.5);
  if (game.player.health <= 0) bust(game);

  updateWanted(game, dt);
  updateMission(game, dt);

  const b = body(game);
  let vx = 0;
  let vy = 0;
  if (game.mode === 'car') {
    vx = Math.cos(game.car.angle) * game.car.speed;
    vy = Math.sin(game.car.angle) * game.car.speed;
  } else if (game.player.moving) {
    vx = Math.cos(game.player.angle) * FOOT_SPEED;
    vy = Math.sin(game.player.angle) * FOOT_SPEED;
  }
  game.cam.follow(b.x, b.y, vx, vy, dt);

  game.audio.update(game.wanted.level > 0);
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function bust(game) {
  game.player.health = PLAYER_HEALTH;
  game.wanted.level = 0;
  game.money = Math.max(0, game.money - 200);
  if (game.mode === 'car') exitCar(game);
  game.player.x = game.spawn.x;
  game.player.y = game.spawn.y;
  game.cam.snap(game.player.x, game.player.y);
  game.mission.message = 'Busted - lost $200';
  game.mission.messageTime = 2.5;
}

function checkCarHitPedestrian(game) {
  const car = game.car;
  for (const ped of game.pedestrians) {
    if (ped.downed > 0) continue;
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    if (Math.abs(dx) < car.length / 2 && Math.abs(dy) < car.width / 2 + 14) {
      ped.downed = 2.5;
      commitCrime(game, 1);
    }
  }
}

function carCollisions(game) {
  const car = game.car;
  for (const other of game.cars) {
    if (other === car || other.role === 'despawn') continue;
    const minDist = (car.length / 2 + other.length / 2) * 0.82;
    const dx = car.x - other.x;
    const dy = car.y - other.y;
    const d = Math.hypot(dx, dy);
    if (d < minDist && d > 0.001) {
      const push = (minDist - d) / d;
      car.x += dx * push;
      car.y += dy * push;
      car.speed *= 0.4;
      if (other.role === ROLE_POLICE) {
        game.player.health -= dt * 20;
        commitCrime(game, 2);
      }
    }
  }
}
