// The screenshot scenes behind ?shot=chase|drive|foot|mission (each with &seed).
// Each one stages a different moment in a different part of the city, then runs
// the real simulation forward a short way with a simple autopilot, so the frame
// is what the game really looks like and the same seed always gives the same
// frame.  Scene money, wanted level and objective are set from the staging code,
// and the camera is framed at the end so each scene reads clearly.

import { STEP, CAR, TRAFFIC, POLICE, FIELD } from './config.js';
import { roadCenterX, roadCenterY, blockRect, isSidewalk, groundAt, G_ROAD } from './city.js';
import { createCar } from './vehicles.js';
import { placeInLane, spawnTraffic } from './traffic.js';
import { createPedestrian } from './pedestrians.js';

function setObjectiveText(game, text, x, y) {
  game.missions.state.objective = text;
  game.missions.state.active = true;
  game.missions.state.timer = 999;
  game.missions.state.target = { x: x ?? -1000, y: y ?? -1000 };
}

function clearCars(game) {
  game.cars.length = 0;
  game.player.car = null;
  game.player.driving = false;
}

function addPlayerCar(game, x, y, heading, speed) {
  const car = createCar({ kind: 'player', sprite: 'car-sedan', x, y, heading, speed });
  game.cars.push(car);
  game.player.car = game.cars.length - 1;
  game.player.driving = true;
  return car;
}

function addPolice(game, x, y, heading, speed) {
  const car = createCar({
    kind: 'police', sprite: 'car-police', x, y, heading, speed,
    accel: POLICE.accel, maxSpeed: POLICE.maxSpeed, brake: POLICE.brake, turnRate: POLICE.turnRate,
    state: 'chase',
  });
  game.cars.push(car);
  return car;
}

function addTraffic(game, lane, long, speed) {
  const car = createCar({ kind: 'traffic', sprite: 'car-sedan' });
  placeInLane(car, game.city, lane, long);
  car.speed = speed === undefined ? TRAFFIC.cruise : speed;
  game.cars.push(car);
  return car;
}

function lane(axis, road, side, dir) {
  return { axis, road, side, dir };
}

/** Scatter pedestrians onto the pavements near (cx, cy). */
function scatterPeople(game, cx, cy, n, spread) {
  const dirs = ['left', 'right', 'up', 'down'];
  let placed = 0;
  let guard = 0;
  while (placed < n && guard < 800) {
    guard += 1;
    const x = cx - spread + game.random() * spread * 2;
    const y = cy - spread * 0.6 + game.random() * spread * 1.2;
    if (!isSidewalk(game.city, x, y)) continue;
    game.people.push(createPedestrian(x, y, dirs[Math.floor(game.random() * 4)], placed % 4));
    placed += 1;
  }
}

/** Frame the target at a specific screen position, clamped to the world. */
function snapTo(game, tx, ty, screenX, screenY) {
  const cam = game.camera.cam;
  cam.x = Math.max(0, Math.min(game.city.worldW - FIELD.width, tx - screenX));
  cam.y = Math.max(0, Math.min(game.city.worldH - FIELD.height, ty - screenY));
}

function snapCamera(game) {
  snapTo(game, game.player.x, game.player.y, FIELD.width / 2, FIELD.height / 2);
}

function run(game, steps, moveFn) {
  for (let i = 0; i < steps; i += 1) {
    game.step(STEP, moveFn ? moveFn(i) : { x: 0, y: 0 });
  }
}

function driveStraight() {
  return { x: 0, y: -1 };
}

/** Hold the player's car near `target` speed (for a believable pursuit). */
function cruiseAt(game, target) {
  let throttle = false;
  return () => {
    const car = game.cars[game.player.car];
    if (car.speed < target - 18) throttle = true;
    else if (car.speed > target) throttle = false;
    return { x: 0, y: throttle ? -1 : 0 };
  };
}

/** The nearest pavement point to (x, y), found deterministically. */
function nearestSidewalk(city, x, y) {
  for (let r = 6; r <= 280; r += 6) {
    const steps = Math.max(8, Math.floor((Math.PI * 2 * r) / 12));
    for (let i = 0; i < steps; i += 1) {
      const a = (i / steps) * Math.PI * 2;
      const sx = x + Math.cos(a) * r;
      const sy = y + Math.sin(a) * r;
      if (isSidewalk(city, sx, sy)) return { x: sx, y: sy };
    }
  }
  return { x, y };
}

/** Move any pedestrian still standing on the road back onto a pavement. */
function keepOnPavements(game) {
  const city = game.city;
  for (const p of game.people) {
    if (p.downed) continue;
    if (groundAt(city, p.x, p.y) !== G_ROAD) continue;
    const pt = nearestSidewalk(city, p.x, p.y);
    p.x = pt.x;
    p.y = pt.y;
    p.mode = 'walk';
  }
}

function stageChase(game) {
  clearCars(game);
  const city = game.city;
  const R = Math.floor(city.gridY / 2);
  const cy = roadCenterY(city, R);
  const laneY = cy + city.laneW / 2;
  const oncomingY = cy - city.laneW / 2;
  const startX = city.worldW * 0.28;

  addPlayerCar(game, startX, laneY, 0, 190);
  for (let i = 1; i <= 5; i += 1) {
    addPolice(game, startX - i * 175, laneY, 0, 195);
  }

  game.wanted.set(5);
  setObjectiveText(game, 'Lose the cops', city.worldW, laneY);
  game.player.money = 1240;

  snapCamera(game);
  const cruise = cruiseAt(game, 190);
  run(game, 130, cruise);

  // The player has advanced; scatter oncoming traffic and people in the frame.
  const px = game.cars[game.player.car].x;
  addTraffic(game, lane('h', R, -1, -1), px + 260, TRAFFIC.cruise);
  addTraffic(game, lane('h', R, -1, -1), px + 520, TRAFFIC.cruise);
  addTraffic(game, lane('h', R, -1, -1), px - 340, TRAFFIC.cruise);

  const northY = cy - city.roadW / 2 - city.sidewalkW / 2;
  const southY = cy + city.roadW / 2 + city.sidewalkW / 2;
  for (let i = 0; i < 5; i += 1) {
    const x = px - 520 + game.random() * 1040;
    game.people.push(createPedestrian(x, northY, i % 2 ? 'right' : 'left', i % 4));
  }
  for (let i = 0; i < 5; i += 1) {
    const x = px - 520 + game.random() * 1040;
    game.people.push(createPedestrian(x, southY, i % 2 ? 'left' : 'right', i % 4));
  }

  run(game, 20, cruise);
  keepOnPavements(game);
  snapTo(game, game.cars[game.player.car].x, game.cars[game.player.car].y, 700, 360);
  return { screen: 'play' };
}

function stageDrive(game) {
  clearCars(game);
  const city = game.city;
  const R = 3;
  const cy = roadCenterY(city, R);
  const laneY = cy - city.laneW / 2; // westbound lane
  const bx = Math.floor(city.gridX / 2);
  const interX = roadCenterX(city, bx);

  addPlayerCar(game, interX + 640, laneY, Math.PI, 260);
  spawnTraffic(game);
  // A queue stopped at the intersection, with a car crossing it.
  addTraffic(game, lane('h', R, -1, -1), interX - 60, 0);
  addTraffic(game, lane('h', R, -1, -1), interX - 220, 0);
  addTraffic(game, lane('v', bx, 1, -1), cy + 30, 40);
  addTraffic(game, lane('h', R, 1, 1), interX + 260, TRAFFIC.cruise);

  scatterPeople(game, interX - 60, cy, 6, 620);

  game.wanted.set(0);
  setObjectiveText(game, 'Deliver the package to Vane Avenue', interX - city.spacing, laneY);
  game.player.money = 780;

  snapCamera(game);
  run(game, 80, driveStraight);
  keepOnPavements(game);
  snapTo(game, interX + 60, cy, FIELD.width / 2, FIELD.height / 2);
  return { screen: 'play' };
}

function stageFoot(game) {
  clearCars(game);
  const city = game.city;
  const V = 2;
  const cx = roadCenterX(city, V);
  const sidewalkX = cx + city.roadW / 2 + city.sidewalkW * 0.5;
  const startY = city.worldH * 0.42;

  game.player.x = sidewalkX;
  game.player.y = startY;
  game.player.driving = false;
  game.player.facing = 'up';
  game.player.money = 430;

  for (let i = 0; i < 5; i += 1) {
    const px = cx - city.roadW / 2 + city.laneW / 2;
    const py = startY + 60 + i * 125;
    game.cars.push(createCar({ kind: 'parked', sprite: 'car-sedan', x: px, y: py, heading: Math.PI / 2 }));
  }

  const target = { x: sidewalkX, y: startY - 300 };
  setObjectiveText(game, 'Walk to the payphone on Calder Street', target.x, target.y);
  game.missions.state.markerKind = 'payphone';

  scatterPeople(game, target.x, target.y, 12, 380);

  snapCamera(game);
  run(game, 90, () => {
    const dx = target.x - game.player.x;
    const dy = target.y - game.player.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: Math.max(-1, Math.min(1, (dx / d) * 1.2)), y: Math.max(-1, Math.min(1, (dy / d) * 1.2)) };
  });
  game.wanted.set(1);
  keepOnPavements(game);
  snapTo(game, game.player.x, game.player.y, 450, 500);
  return { screen: 'play' };
}

function stageMission(game) {
  clearCars(game);
  const city = game.city;
  const R = city.gridY - 3;
  const cy = roadCenterY(city, R);
  const bx = Math.floor(city.gridX / 2);
  const rect = blockRect(bx, R);
  // Marker on the pavement in front of the block south of the road.
  const target = { x: rect.x + rect.w / 2, y: cy + city.roadW / 2 + city.sidewalkW / 2 };

  // The player drives west along the road toward the marker.
  addPlayerCar(game, target.x + 340, cy + city.laneW / 2, Math.PI, 260);
  // A car waiting by the marker.
  game.cars.push(createCar({ kind: 'parked', sprite: 'car-sedan', x: target.x - 70, y: target.y + 30, heading: Math.PI / 2 }));

  scatterPeople(game, target.x, cy, 5, 420);
  addTraffic(game, lane('h', R, 1, 1), target.x + 420, TRAFFIC.cruise);

  game.wanted.set(0);
  setObjectiveText(game, 'Reach the marker on Brenner Avenue', target.x, target.y);
  game.missions.state.markerKind = 'pickup';
  game.player.money = 310;

  snapCamera(game);
  run(game, 70, driveStraight);
  keepOnPavements(game);
  snapTo(game, target.x - 60, target.y, FIELD.width / 2, FIELD.height / 2);
  return { screen: 'play' };
}

export function stageShot(name, game) {
  game.noComplete = true;
  switch (name) {
    case 'chase': return stageChase(game);
    case 'drive': return stageDrive(game);
    case 'foot': return stageFoot(game);
    case 'mission': return stageMission(game);
    default: return stageChase(game);
  }
}
