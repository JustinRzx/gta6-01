// Audio: the calm city loop while wandering, the tense chase loop while the
// police are after the player.  Nothing plays until the first interaction, and
// the two loops crossfade so the switch never clicks.

const FADE = 3.0; // seconds to crossfade
const VOLUME = 0.55;

export function createAudioSystem(els) {
  let started = false;
  let current = null;
  const levels = { city: 0, chase: 0 };
  const targets = { city: 0, chase: 0 };

  for (const key of Object.keys(els)) {
    els[key].volume = 0;
  }

  function play() {
    if (started) return;
    started = true;
    for (const key of Object.keys(els)) {
      els[key].play().catch(() => {});
    }
  }

  function update(wanted, dt) {
    if (!started) return;
    const want = wanted > 0 ? 'chase' : 'city';
    if (want !== current) {
      current = want;
      for (const key of Object.keys(targets)) targets[key] = key === current ? VOLUME : 0;
    }
    for (const key of Object.keys(levels)) {
      const lvl = levels[key];
      const tgt = targets[key];
      const next = lvl < tgt ? Math.min(tgt, lvl + dt / FADE * VOLUME) : Math.max(tgt, lvl - dt / FADE * VOLUME);
      levels[key] = next;
      els[key].volume = next;
      if (next <= 0.001 && els[key].volume <= 0.001) els[key].pause();
      else if (next > 0.001 && els[key].paused) els[key].play().catch(() => {});
    }
  }

  return { play, update };
}
