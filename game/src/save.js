// Progress saved to localStorage and restored on the next load, behind the
// start screen.  Money, health, wanted level and the mission number persist;
// the city and traffic are regenerated from the fixed seed each visit.

import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  try {
    const data = {
      money: game.player.money,
      health: game.player.health,
      stars: game.wanted.state.stars,
      mission: game.missions.state.index,
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be off (private windows): progress lasts this visit only.
  }
}

export function loadGame(game) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (typeof data.money === 'number') game.player.money = Math.max(0, Math.floor(data.money));
    if (typeof data.health === 'number') game.player.health = Math.max(1, Math.floor(data.health));
    if (typeof data.stars === 'number') game.wanted.set(Math.max(0, Math.floor(data.stars)));
    if (typeof data.mission === 'number') game.missions.state.index = Math.max(0, Math.floor(data.mission));
    if (typeof data.x === 'number' && typeof data.y === 'number') {
      const x = data.x;
      const y = data.y;
      if (x > 0 && y > 0 && x < game.city.worldW && y < game.city.worldH) {
        game.player.x = x;
        game.player.y = y;
        game.player.respawn = { x, y };
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}
