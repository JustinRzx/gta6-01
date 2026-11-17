// Boot and the one loop. The game is loaded from static files, the world is
// stepped in fixed 1/60 s slices (several in a slow frame, none in a fast one),
// and the renderer paints whatever is there. Three screens: title, play, paused.
//
// ?seed=N fixes the city; ?shot=chase|drive|foot|mission (with &seed=N) stages a
// scene, paints it and sets window.__shotReady instead of running the game.
import { STEP } from './config.js';
import { createGame, stepGame } from './game.js';
import { loadAssets } from './assets.js';
import { createRenderer, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';
import { placeMission } from './missions.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

loadAssets().then((assets) => {
  if (shot) runShot(shot, seed, assets);
  else runGame(seed, assets);
});

function runShot(name, seed, assets) {
  const game = createGame(seed, assets);
  const renderer = createRenderer(canvas, assets);
  stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, SCREEN_PLAY);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame(seed, assets) {
  const game = createGame(seed, assets);
  const input = createInput(canvas);
  const renderer = createRenderer(canvas, assets);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;

  const saved = loadSave();
  if (saved) {
    if (typeof saved.money === 'number') game.money = saved.money;
    if (typeof saved.jobs === 'number') {
      game.stats.jobs = saved.jobs;
      placeMission(game, saved.jobs);
    }
  }

  function announce(message) {
    status.textContent = message;
  }

  function start() {
    game.audio.start();
    screen = SCREEN_PLAY;
    announce('Playing. WASD to move, E to enter a car.');
  }

  function pause() {
    screen = SCREEN_PAUSED;
    game.audio.stop();
    announce('Paused.');
  }

  function resume() {
    screen = SCREEN_PLAY;
    game.audio.start();
    announce('Playing.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const actions = input.takeActions();

    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) start();
      while (accumulator >= STEP) {
        stepGame(game, { move: { x: 0, y: 0 }, actions: 0 }, STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) pause();
      const gameActions = actions & ~(ACTION_PAUSE | ACTION_CONFIRM);
      let applied = false;
      while (accumulator >= STEP) {
        stepGame(game, { move: input.move(), actions: applied ? 0 : gameActions }, STEP);
        applied = true;
        accumulator -= STEP;
      }
      saveTimer += 1 / 60;
      if (saveTimer > 4) {
        saveTimer = 0;
        writeSave({ money: game.money, jobs: game.stats.jobs });
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE) resume();
      accumulator = 0;
    }

    renderer.draw(game, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) pause();
  });

  announce('CITYWIDE. Press Space or click to start.');
  requestAnimationFrame(frame);
}
