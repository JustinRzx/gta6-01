// Progress saved to localStorage and restored on the next load: money, wanted stars, mission and
// where the player stands. Storage can be off (private windows); the game then just starts fresh.

import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  try {
    const data = {
      money: game.money,
      wanted: game.wanted.stars,
      missionIndex: game.mission.index,
      x: Math.round(game.player.x),
      y: Math.round(game.player.y),
      dir: game.player.dir,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // no storage: progress lasts this visit only
  }
}

export function loadGame(game) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    game.money = typeof data.money === 'number' ? data.money : game.money;
    game.wanted.stars = typeof data.wanted === 'number' ? data.wanted : 0;
    game.mission.index = typeof data.missionIndex === 'number' ? data.missionIndex : 0;
    if (typeof data.x === 'number' && typeof data.y === 'number') {
      game.player.x = data.x;
      game.player.y = data.y;
    }
    if (typeof data.dir === 'number') game.player.dir = data.dir;
    return true;
  } catch {
    return false;
  }
}
