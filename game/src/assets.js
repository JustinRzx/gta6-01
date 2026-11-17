// The files the game loads: every image and sound under game/assets and game/music, referenced
// by path. loadAssets() resolves once every image has decoded, so the first frame has sprites.

const IMAGE_PATHS = {
  road: 'assets/road.png',
  pavement: 'assets/pavement.png',
  'car-sedan': 'assets/sprites/car-sedan.png',
  'car-police': 'assets/sprites/car-police.png',
};

const PED_DIRS = ['up', 'right', 'down', 'left'];
for (let person = 0; person < 4; person += 1) {
  for (const dir of PED_DIRS) {
    IMAGE_PATHS[`ped-${person}-${dir}`] = `assets/sprites/ped-${person}-${dir}.png`;
  }
}

export const MUSIC_PATHS = {
  city: 'music/city-sunny-loop.mp3',
  chase: 'music/chase-pursuit-protocol.mp3',
};

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ src, image });
    image.onerror = () => resolve({ src, image: null });
    image.src = src;
  });
}

export function loadAssets() {
  const images = {};
  const audio = {};
  const jobs = Object.entries(IMAGE_PATHS).map(([key, src]) =>
    loadImage(src).then(({ image }) => {
      images[key] = image;
    }),
  );
  return Promise.all(jobs).then(() => ({ images, audio }));
}

export { IMAGE_PATHS };
