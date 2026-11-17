// Music: the calm city loop while wandering, the tense chase loop once the
// police are after the player. Audio only starts after the first interaction,
// so the browser's autoplay policy is satisfied.
export function createAudio(audio) {
  let started = false;
  let current = null;
  const volumes = { city: 0.5, chase: 0.6 };

  return {
    start() {
      started = true;
    },
    /** `chasing` is true when police are after the player. */
    update(chasing) {
      if (!started) return;
      const wanted = chasing ? 'chase' : 'city';
      if (wanted === current) return;
      if (current) {
        audio[current].pause();
        audio[current].currentTime = 0;
      }
      current = wanted;
      const el = audio[current];
      el.volume = volumes[current];
      el.play().catch(() => {});
    },
    stop() {
      if (current) audio[current].pause();
      current = null;
    },
  };
}
