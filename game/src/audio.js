// Audio: the calm city loop plays while wandering, the tense chase loop takes over when the police
// are after the player. Both are local files under game/music. Playback only starts after the first
// interaction, so the browser does not block it.

import { MUSIC_PATHS } from './assets.js';

export function createAudio() {
  let city = null;
  let chase = null;
  let started = false;
  let current = 'city';

  function ensure() {
    if (city) return;
    city = new Audio(MUSIC_PATHS.city);
    chase = new Audio(MUSIC_PATHS.chase);
    city.loop = true;
    chase.loop = true;
    city.volume = 0.5;
    chase.volume = 0.6;
  }

  /** Call on the first user interaction (a key or click). */
  function start() {
    ensure();
    if (started) return;
    started = true;
    city.play().catch(() => {});
  }

  /** Switch between 'city' and 'chase'; no-op until audio has started. */
  function setMode(mode) {
    if (!started || mode === current) return;
    current = mode;
    if (mode === 'chase') {
      city.pause();
      chase.currentTime = 0;
      chase.play().catch(() => {});
    } else {
      chase.pause();
      city.play().catch(() => {});
    }
  }

  return { start, setMode, ensure };
}
