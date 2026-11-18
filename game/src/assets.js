// Loads every image and sound the game needs, from files under game/ (the
// static server) with no network request.  Images are decoded into a flat
// {name: HTMLImageElement} store and audio into Audio elements that stay muted
// until the first interaction (see audio.js).

export const IMAGE_PATHS = {
  road: 'assets/road.png',
  pavement: 'assets/pavement.png',
  'car-sedan': 'assets/sprites/car-sedan.png',
  'car-police': 'assets/sprites/car-police.png',
};

const DIRS = ['up', 'right', 'down', 'left'];
for (let p = 0; p < 4; p += 1) {
  for (const d of DIRS) IMAGE_PATHS[`person-${p}-${d}`] = `assets/sprites/person-${p}-${d}.png`;
}

export const AUDIO_PATHS = {
  city: 'music/city-sunny-loop.mp3',
  chase: 'music/chase-pursuit-protocol.mp3',
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

/** Resolves once every image is decoded, with the {name: image} store. */
export function loadImages() {
  const names = Object.keys(IMAGE_PATHS);
  return Promise.all(names.map((n) => loadImage(IMAGE_PATHS[n]))).then((imgs) => {
    const store = {};
    names.forEach((n, i) => {
      store[n] = imgs[i];
    });
    return store;
  });
}

/** Creates the Audio elements (not started): {city, chase}. */
export function createAudio() {
  const out = {};
  for (const key of Object.keys(AUDIO_PATHS)) {
    const el = new Audio(AUDIO_PATHS[key]);
    el.loop = true;
    el.preload = 'auto';
    out[key] = el;
  }
  return out;
}
