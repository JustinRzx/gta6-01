// Boot and the one loop: images load, the game is built from a fixed seed, then
// the loop reads input every frame, advances the world in fixed 1/60 s steps and
// paints it.  A ?shot=... parameter stages a screenshot scene instead of playing.
//
// The game moves between four screens: title, play, paused and wasted.

import { STEP } from './config.js';
import { loadImages, createAudio } from './assets.js';
import { createGame } from './game.js';
import { createInput, ACTION_ENTER, ACTION_ATTACK, ACTION_PAUSE, ACTION_CONFIRM } from './input.js';
import { createRenderer } from './render.js';
import { saveGame, loadGame } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);

const SCREEN_TITLE = 'title';
const SCREEN_PLAY = 'play';
const SCREEN_PAUSED = 'paused';
const SCREEN_OVER = 'over';

function announce(message) {
  if (status) status.textContent = message;
}

loadImages().then((images) => {
  const audioEls = createAudio();
  const game = createGame(seed, images, audioEls);

  if (shot) {
    runShot(game);
  } else {
    runGame(game);
  }
}).catch((err) => {
  announce(`Failed to load assets: ${err.message}`);
  console.error(err);
});

function runShot(game) {
  const scene = stageShot(shot, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame(game) {
  const input = createInput();
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  const hadSave = loadGame(game);

  function startGame() {
    game.camera.snap(game.player.x, game.player.y, game.city.worldW, game.city.worldH);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. WASD to move, E to enter a car.');
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    game.step(STEP, input.move());
    game.audio.update(game.wanted.state.stars, STEP);

    const actions = input.takeActions();
    if (actions & ACTION_ENTER) {
      game.enterExit();
      game.audio.play();
    }
    if (actions & ACTION_ATTACK) {
      game.attack();
      game.audio.play();
    }

    saveTimer += STEP;
    if (saveTimer > 2) {
      saveTimer = 0;
      saveGame(game);
    }
  }

  function handleScreenActions() {
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        saveGame(game);
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startGame();
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
      }
    }
    // Any key counts as the first interaction for audio.
    if (input.anyHeld()) game.audio.play();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleScreenActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      game.audio.update(game.wanted.state.stars, 0);
    }
    renderer.draw(game, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame(game);
      announce('Paused.');
    }
  });

  announce(hadSave ? 'Continue from your last visit. Press Enter to play.' : 'Sunset City. Press Enter to play.');
  requestAnimationFrame(frame);
}
