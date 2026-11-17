// Loading the game's own files: images (tiles and sprites) and the two music
// loops. Everything is a static file under game/, loaded with plain <img> and
// <audio>, so the game makes no network request. loadAssets() resolves once all
// images have decoded, with a map keyed by path-less name.

const IMAGE_FILES = [
  'road',
  'pavement',
  'car-sedan',
  'car-police',
  'ped-0-up', 'ped-0-right', 'ped-0-down', 'ped-0-left',
  'ped-1-up', 'ped-1-right', 'ped-1-down', 'ped-1-left',
  'ped-2-up', 'ped-2-right', 'ped-2-down', 'ped-2-left',
  'ped-3-up', 'ped-3-right', 'ped-3-down', 'ped-3-left',
];

export function loadAssets() {
  const images = {};
  const pending = IMAGE_FILES.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[name] = img;
      resolve();
    };
    img.onerror = () => resolve(); // never block boot on a missing image
    img.src = name === 'road' || name === 'pavement'
      ? `./assets/${name}.png`
      : `./assets/sprites/${name}.png`;
  }));

  const audio = {
    city: new Audio('./music/city-sunny-loop.mp3'),
    chase: new Audio('./music/chase-pursuit-protocol.mp3'),
  };
  for (const key of Object.keys(audio)) {
    audio[key].loop = true;
    audio[key].preload = 'auto';
  }

  return Promise.all(pending).then(() => ({ images, audio }));
}
