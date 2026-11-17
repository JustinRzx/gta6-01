// The screenshot scenes behind ?shot=chase|drive|foot|mission (each with &seed=11). Each stage sets
// its own money, wanted level and objective directly (not inherited from a running game), places
// the player, cars, traffic and people deliberately (no overlapping vehicles), then hands back a
// number of steps for the loop to simulate before painting — so the same seed always gives the
// same, good-looking frame.

import { LANE_OFFSET, SIDEWALK_OFFSET } from './config.js';
import { DIR } from './sprites.js';
import { createVehicle } from './vehicles.js';
import { laneHeading } from './traffic.js';

function clearEntities(game) {
  game.vehicles.length = 0;
  game.peds.length = 0;
  game.player.car = null;
  game.player.mode = 'foot';
  game.player.health = 100;
}

function trafficCar(game, axis, dir, pos, road, s) {
  const x = axis === 'h' ? s : pos;
  const y = axis === 'h' ? pos : s;
  const v = createVehicle('civilian', x, y, laneHeading(axis, dir));
  v.driver = 'traffic';
  v.lane = { axis, dir, pos, road };
  return v;
}

function parkedCar(game, x, y, heading) {
  const v = createVehicle('civilian', x, y, heading);
  v.driver = 'parked';
  return v;
}

function policeCar(game, x, y, heading, speed) {
  const v = createVehicle('police', x, y, heading);
  v.driver = 'police';
  v.speed = speed;
  return v;
}

function ped(game, x, y, axis, dir, person) {
  game.peds.push({
    x, y, axis, dir,
    person,
    speed: 46,
    facing: axis === 'h' ? (dir > 0 ? DIR.RIGHT : DIR.LEFT) : (dir > 0 ? DIR.DOWN : DIR.UP),
    scatter: 0, fleeX: 0, fleeY: 0,
  });
}

function playerInCar(game, car) {
  game.player.car = car;
  game.player.mode = 'car';
  game.player.x = car.x;
  game.player.y = car.y;
  game.playerCar = car;
}

function setupChase(game) {
  const { city } = game;
  const h = Math.floor(city.ny / 2);
  const ry = city.hRoads[h];
  const eastY = ry + LANE_OFFSET;
  const westY = ry - LANE_OFFSET;
  const px = city.vRoads[2] + 120;

  const car = createVehicle('civilian', px, eastY, 0);
  car.speed = 250;
  playerInCar(game, car);
  game.vehicles.push(car);

  // A deliberate convoy behind the player, spaced along their lanes.
  game.vehicles.push(policeCar(game, px - 62, eastY, 0, 258));
  game.vehicles.push(policeCar(game, px - 92, westY, 0, 258));
  game.vehicles.push(policeCar(game, px - 124, eastY, 0, 260));

  game.vehicles.push(trafficCar(game, 'h', -1, westY, ry, px + 280));
  game.vehicles.push(trafficCar(game, 'h', 1, eastY, ry, px + 430));

  ped(game, px - 120, ry - SIDEWALK_OFFSET, 'h', 1, 0);
  ped(game, px - 60, ry - SIDEWALK_OFFSET, 'h', -1, 2);
  ped(game, px + 60, ry + SIDEWALK_OFFSET, 'h', 1, 1);
  ped(game, px + 140, ry + SIDEWALK_OFFSET, 'h', -1, 3);
  ped(game, px + 200, ry - SIDEWALK_OFFSET, 'h', 1, 2);

  game.wanted.stars = 3;
  game.money = 1250;
  game.mission.active = true;
  game.mission.objective = 'Shake the police and reach the safehouse';
  game.mission.timeLeft = 55;
  game.mission.marker = null;
  game.mission.target = { x: city.vRoads[6], y: city.hRoads[2] };
  game.shotControls = { x: 0, y: -1 };
  return 35;
}

function setupDrive(game) {
  const { city } = game;
  // A different district: a vertical road past a forced park and tall buildings.
  city.reconfigureBlock(3, 3, 'park');
  city.reconfigureBlock(3, 2, 'park');
  city.reconfigureBlock(4, 3, 'buildings');
  for (const b of city.blocks[3 * city.nx + 4].buildings) b.height = 4;

  const v = 3;
  const rx = city.vRoads[v];
  const intY = city.hRoads[3];
  const car = createVehicle('civilian', rx + LANE_OFFSET, intY - 130, Math.PI / 2);
  car.speed = 185;
  playerInCar(game, car);
  game.vehicles.push(car);

  // Traffic meeting at the next intersection.
  game.vehicles.push(trafficCar(game, 'v', 1, rx - LANE_OFFSET, rx, intY + 40));
  game.vehicles.push(trafficCar(game, 'h', -1, intY - LANE_OFFSET, intY, rx - 80));
  game.vehicles.push(trafficCar(game, 'h', 1, intY + LANE_OFFSET, intY, rx + 170));

  ped(game, rx - SIDEWALK_OFFSET, intY - 60, 'v', 1, 0);
  ped(game, rx + SIDEWALK_OFFSET, intY + 30, 'v', -1, 2);

  game.wanted.stars = 0;
  game.money = 880;
  game.mission.active = true;
  game.mission.objective = 'Deliver the package to the docks';
  game.mission.timeLeft = 70;
  game.mission.marker = null;
  game.mission.target = { x: city.vRoads[8], y: city.hRoads[8] };
  game.shotControls = { x: 0, y: -1 };
  return 16;
}

function setupFoot(game) {
  const { city } = game;
  const by = 5;
  const ry = city.hRoads[by];
  const northRail = ry - SIDEWALK_OFFSET;
  const southRail = ry + SIDEWALK_OFFSET;
  // A clean stretch of pavement between two vertical roads (not in the road itself).
  const x = 1490;

  game.player.mode = 'foot';
  game.player.x = x;
  game.player.y = northRail;
  game.player.dir = DIR.RIGHT;

  // Several pedestrians walking the same pavement as the player.
  ped(game, 1440, northRail, 'h', 1, 0);
  ped(game, 1528, northRail, 'h', -1, 1);
  ped(game, 1563, northRail, 'h', 1, 2);
  ped(game, 1600, northRail, 'h', -1, 3);
  ped(game, 1500, southRail, 'h', -1, 2);

  // Cars parked at the kerb, on the opposite pavement.
  game.vehicles.push(parkedCar(game, 1450, southRail, Math.PI));
  game.vehicles.push(parkedCar(game, 1540, southRail, 0));
  game.vehicles.push(parkedCar(game, 1600, southRail, 0));

  game.wanted.stars = 0;
  game.money = 620;
  game.mission.active = true;
  game.mission.objective = 'Walk to the payphone on Calder Street';
  game.mission.timeLeft = 60;
  game.mission.marker = null;
  game.mission.target = { x: 1630, y: northRail };
  game.shotControls = null;
  return 12;
}

function setupMission(game) {
  const { city } = game;
  const bx = 6;
  const by = 4;
  const block = city.blocks[by * city.nx + bx];
  const doorX = block.x + block.w * 0.25;
  const doorY = block.y + block.h + 10;

  game.player.mode = 'foot';
  game.player.x = doorX;
  game.player.y = doorY + 46;
  game.player.dir = DIR.UP;

  // A car waiting nearby at the kerb.
  game.vehicles.push(parkedCar(game, doorX - 74, doorY + 8, 0));

  ped(game, doorX + 40, doorY + 8, 'h', -1, 1);
  ped(game, doorX + 78, doorY + 8, 'h', 1, 3);

  game.wanted.stars = 1;
  game.money = 1500;
  game.mission.active = true;
  game.mission.objective = 'Pick up the package at the marker';
  game.mission.timeLeft = 80;
  game.mission.marker = { x: doorX, y: doorY };
  game.mission.target = { x: city.vRoads[1], y: city.hRoads[1] };
  game.shotControls = null;
  return 10;
}

const SCENES = { chase: setupChase, drive: setupDrive, foot: setupFoot, mission: setupMission };

/** Stage the named scene (any unknown name stages the chase) and return steps to simulate. */
export function stageShot(game, name) {
  clearEntities(game);
  game.wanted.stars = 0;
  game.wanted.coolTimer = 0;
  const setup = SCENES[name] || setupChase;
  return setup(game);
}
