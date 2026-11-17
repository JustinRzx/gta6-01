// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. Screens: title, play and paused. ?shot=chase|drive|foot|mission
// (with &seed=N) stages that scene instead, runs it forward, paints it and sets window.__shotReady.

import { STEP, MONEY_START, ZOOM, HEALTH } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { loadAssets } from './assets.js';
import { createCity } from './city.js';
import { createCamera } from './camera.js';
import { createPlayer, stepPlayerFoot, playerFacingVector } from './player.js';
import { stepDriving, enterCar, exitCar, findNearbyCar } from './driving.js';
import { spawnTraffic, stepTraffic } from './traffic.js';
import { spawnPedestrians, stepPedestrians } from './pedestrians.js';
import { stepPolice } from './police.js';
import { createWanted, reportCrime, stepWanted } from './wanted.js';
import { createMission, placeMissionMarker, stepMissions } from './missions.js';
import { stepCombat } from './combat.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame } from './save.js';
import { stageShot } from './shots.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED } from './render.js';
import { KEY_INTERACT, KEY_PAUSE } from './input.js';
import { createVehicle } from './vehicles.js';
import { DIR } from './sprites.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

function createGame(random, input) {
  const city = createCity(random);
  const camera = createCamera();
  const player = createPlayer(city.vRoads[5] + 40, city.hRails[5], DIR.RIGHT);
  const game = {
    random, city, camera, input, player,
    vehicles: [],
    peds: [],
    wanted: createWanted(),
    money: MONEY_START,
    mission: createMission(random),
    audio: createAudio(),
    time: 0,
    playerCar: null,
    shotControls: null,
    loaded: false,
    crimeCooldown: 0,
  };
  game.reportCrime = (stars) => reportCrime(game, stars);

  // The player's own car, parked at the kerb beside them.
  const car = createVehicle('civilian', city.vRoads[5] - 40, city.hRails[5], 0);
  game.vehicles.push(car);
  game.playerCar = car;

  game.vehicles.push(...spawnTraffic(game));
  game.peds.push(...spawnPedestrians(game));
  for (const s of city.parkedSpots) game.vehicles.push(createVehicle('civilian', s.x, s.y, s.heading));
  for (const s of city.curbSpots) game.vehicles.push(createVehicle('civilian', s.x, s.y, s.heading));

  placeMissionMarker(game);
  return game;
}

function cameraTarget(game) {
  const p = game.player;
  if (p.mode === 'car' && p.car) {
    return { pos: p.car, look: { x: Math.cos(p.car.heading), y: Math.sin(p.car.heading) }, zoom: ZOOM.car };
  }
  return { pos: p, look: playerFacingVector(p), zoom: ZOOM.foot };
}

function step(game, dt) {
  game.time += dt;
  if (game.crimeCooldown > 0) game.crimeCooldown -= dt;

  const p = game.player;
  const speedBefore = p.car ? p.car.speed : 0;
  if (p.mode === 'car' && p.car) stepDriving(game, dt, game.shotControls);
  else stepPlayerFoot(p, game.input.axis(), dt, game.city);

  stepTraffic(game, dt);
  stepPedestrians(game, dt);
  stepPolice(game, dt);
  stepWanted(game, dt);
  stepMissions(game, dt);
  if (p.mode === 'foot') stepCombat(game, dt);

  // Driving over a pedestrian is a crime, and ramming a police car keeps the heat up and hurts.
  if (p.mode === 'car' && p.car) {
    const car = p.car;
    if (speedBefore > 80 && Math.abs(car.speed) < 5) {
      p.health = Math.max(0, p.health - HEALTH.hitBuilding);
    }
    for (const ped of game.peds) {
      if (ped.scatter > 0) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < car.length / 2 + 8) {
        const d = Math.hypot(ped.x - car.x, ped.y - car.y) || 1;
        ped.scatter = 1.2;
        ped.fleeX = (ped.x - car.x) / d;
        ped.fleeY = (ped.y - car.y) / d;
        game.reportCrime(1);
      }
    }
    for (const v of game.vehicles) {
      if (v.driver !== 'police') continue;
      if (game.crimeCooldown <= 0 && Math.hypot(v.x - car.x, v.y - car.y) < car.length) {
        game.reportCrime(1);
        game.crimeCooldown = 2;
        p.health = Math.max(0, p.health - HEALTH.rammed);
      }
    }
  }
  p.health = Math.min(HEALTH.max, p.health + HEALTH.regen * dt);

  const cam = cameraTarget(game);
  game.camera.setZoom(cam.zoom);
  game.camera.update(cam.pos, cam.look, dt, game.city.worldWidth, game.city.worldHeight);
}

function announce(message) {
  status.textContent = message;
}

function runShot(renderer, game, name) {
  const steps = stageShot(game, name);
  const cam = cameraTarget(game);
  game.camera.setZoom(cam.zoom);
  game.camera.snapTo(cam.pos, game.city.worldWidth, game.city.worldHeight);
  for (let i = 0; i < steps; i += 1) step(game, STEP);
  let painted = 0;
  function paint() {
    renderer.draw(game, SCREEN_PLAY);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame(renderer, game, input) {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;

  game.loaded = loadGame(game);
  if (game.loaded) announce('Saved game loaded.');

  function startGame() {
    game.audio.start();
    screen = SCREEN_PLAY;
    announce('Playing. WASD to move, E to enter a car.');
  }

  function handleInput() {
    const pressed = input.takePressed();
    if (screen === SCREEN_TITLE) {
      if (pressed.length > 0 || input.takeMousePressed()) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (pressed.some((c) => KEY_PAUSE.has(c) || KEY_INTERACT.has(c))) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    for (const code of pressed) {
      if (KEY_PAUSE.has(code)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
        break;
      } else if (KEY_INTERACT.has(code)) {
        if (game.player.mode === 'car') exitCar(game);
        else {
          const car = findNearbyCar(game);
          if (car) {
            enterCar(game, car);
            game.audio.start();
            announce(car.kind === 'police' ? 'Stole a police car!' : 'Got in the car.');
          }
        }
        break;
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleInput();
    if (screen !== SCREEN_PAUSED) {
      accumulator += dt;
      while (accumulator >= STEP) {
        step(game, STEP);
        accumulator -= STEP;
      }
      if (screen === SCREEN_PLAY) {
        saveTimer += dt;
        if (saveTimer >= 4) {
          saveTimer = 0;
          saveGame(game);
        }
      }
    } else {
      accumulator = 0;
    }
    game.audio.setMode(game.wanted.stars > 0 ? 'chase' : 'city');
    renderer.draw(game, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sunset City. Press any key or click to start.');
  requestAnimationFrame(frame);
}

loadAssets().then(({ images }) => {
  const random = createRandom(seed);
  const input = createInput(canvas);
  const game = createGame(random, input);
  const renderer = createRenderer(canvas, images);
  if (shot) runShot(renderer, game, shot);
  else runGame(renderer, game, input);
});
