// The game object and its one fixed step: it wires the city, player, cars,
// traffic, pedestrians, police, wanted level, missions and combat together and
// advances them every 1/60 s.  No drawing happens here.

import { PEDESTRIAN, CAR } from './config.js';
import { createRandom } from './random.js';
import { createCity, isSidewalk } from './city.js';
import { createPlayer, stepPlayerFoot, damagePlayer } from './player.js';
import { createWanted } from './wanted.js';
import { createMissions, startMission, updateMissions, checkReach } from './missions.js';
import { createCombat, updateCombat, attack, updateBullets } from './combat.js';
import { createCamera } from './camera.js';
import { createCar, carCircles } from './vehicles.js';
import { enterCar, exitCar, stepPlayerCar, nearestCar } from './driving.js';
import { spawnTraffic, updateTraffic } from './traffic.js';
import { createPedestrian, updatePedestrians, spawnPoint } from './pedestrians.js';
import { managePolice, updatePolice } from './police.js';
import { createAudioSystem } from './audio.js';

/** Find a pavement point near (cx, cy). */
function findSidewalkNear(game, cx, cy) {
  const city = game.city;
  for (let r = 0; r < 600; r += 16) {
    for (let i = 0; i < 24; i += 1) {
      const ang = game.random() * Math.PI * 2;
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (isSidewalk(city, x, y)) return { x, y };
    }
  }
  return { x: city.worldW / 2, y: city.worldH / 2 };
}

export function createGame(seed, images, audioEls) {
  const random = createRandom(seed);
  const city = createCity(random);
  const start = findSidewalkNear({ city, random }, city.worldW / 2, city.worldH / 2);
  const player = createPlayer(start.x, start.y);
  player.respawn = { x: start.x, y: start.y };

  const wanted = createWanted();
  const missions = createMissions();
  const combat = createCombat();
  const camera = createCamera();
  const audio = createAudioSystem(audioEls);

  const game = {
    seed,
    random,
    city,
    images,
    player,
    wanted,
    missions,
    combat,
    camera,
    audio,
    cars: [],
    people: [],
    bullets: [],
    effects: [],
    time: 0,
    ramCooldown: 0,
  };

  // Parked cars from the parking lots.
  for (const p of city.parkedCars) {
    game.cars.push(createCar({ kind: 'parked', sprite: 'car-sedan', x: p.x, y: p.y, heading: p.heading }));
  }

  spawnTraffic(game);

  for (let i = 0; i < PEDESTRIAN.count; i += 1) {
    const pt = spawnPoint(game);
    const dirs = ['up', 'right', 'down', 'left'];
    game.people.push(createPedestrian(pt.x, pt.y, dirs[Math.floor(random() * 4)], Math.floor(random() * 4)));
  }

  startMission(game);

  function step(dt, move) {
    game.time += dt;

    if (game.ramCooldown > 0) game.ramCooldown -= dt;

    if (player.driving) {
      stepPlayerCar(game, move, dt);
    } else {
      stepPlayerFoot(game, move, dt);
    }

    updateTraffic(game, dt);
    updatePedestrians(game, dt);
    managePolice(game);
    updatePolice(game, dt);
    game.wanted.cool(dt);
    updateCombat(game, dt);
    updateBullets(game, dt);
    updateMissions(game, dt);
    if (!game.noComplete) checkReach(game);

    carHitPeople(game);
    carHitCar(game, dt);

    // Cull leaving police cars and expire effects.
    for (let i = game.cars.length - 1; i >= 0; i -= 1) {
      if (game.cars[i].remove) game.cars.splice(i, 1);
    }
    for (const e of game.effects) e.t += dt;
    game.effects = game.effects.filter((e) => e.t < 0.4);

    // Camera follows the player or their car, with look-ahead.
    const target = player.driving ? game.cars[player.car] : player;
    const tvx = player.driving ? Math.cos(game.cars[player.car].heading) * game.cars[player.car].speed : 0;
    const tvy = player.driving ? Math.sin(game.cars[player.car].heading) * game.cars[player.car].speed : 0;
    camera.update(target.x, target.y, tvx, tvy, city.worldW, city.worldH);
  }

  function enterExit() {
    if (player.driving) {
      exitCar(game);
    } else {
      const idx = nearestCar(game, player.x, player.y, CAR.enterDistance);
      if (idx !== null) enterCar(game, idx);
    }
  }

  game.step = step;
  game.enterExit = enterExit;
  game.attack = () => attack(game);

  return game;
}

/** A car that runs into a standing pedestrian knocks them down (a crime when it is the player). */
function carHitPeople(game) {
  for (const car of game.cars) {
    if (car.kind === 'parked') continue;
    const circles = carCircles(car);
    for (const p of game.people) {
      if (p.downed) continue;
      for (const c of circles) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < c.r + 9 && car.speed > 40) {
          p.downed = true;
          p.downedTimer = 6;
          if (car.kind === 'player') game.wanted.hitPedestrian();
          break;
        }
      }
    }
  }
}

/** Player's car colliding with police (wanted + damage) or traffic (a jolt). */
function carHitCar(game, dt) {
  const player = game.player;
  if (!player.driving) return;
  const pc = game.cars[player.car];
  for (const other of game.cars) {
    if (other === pc || other.kind === 'parked') continue;
    const a = carCircles(pc);
    const b = carCircles(other);
    let hit = false;
    for (const ca of a) {
      for (const cb of b) {
        if (Math.hypot(ca.x - cb.x, ca.y - cb.y) < ca.r + cb.r - 6) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    if (!hit) continue;
    if (other.kind === 'police') {
      if (game.ramCooldown <= 0) {
        game.ramCooldown = 1.2;
        game.wanted.hitPoliceCar();
        damagePlayer(game, 8);
      }
    } else if (other.kind === 'traffic' && pc.speed > 80) {
      other.speed = Math.min(other.speed, pc.speed * 0.4);
      pc.speed *= 0.5;
    }
  }
}
