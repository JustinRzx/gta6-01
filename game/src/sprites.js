// Sprite lookup: which pedestrian image is which way, and the on-disk names for
// the cars. This is a small lookup table in its own module so a better sheet can
// drop in later without touching the rest of the game.

export const DIR_UP = 0;
export const DIR_RIGHT = 1;
export const DIR_DOWN = 2;
export const DIR_LEFT = 3;

const DIR_NAME = ['up', 'right', 'down', 'left'];

/** The pedestrian image for one of the four people (0-3) facing one of the four ways. */
export function pedestrianImage(images, person, dir) {
  return images[`ped-${person}-${DIR_NAME[dir]}`];
}

export function carSedanImage(images) {
  return images['car-sedan'];
}

export function carPoliceImage(images) {
  return images['car-police'];
}

/**
 * The facing angle (radians) for a compass direction, 0 = +x (east), measured
 * clockwise in screen space (y down). Up is -PI/2, right 0, down +PI/2, left PI.
 */
export function dirAngle(dir) {
  return [-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir];
}

/** Snap a movement angle to the nearest of the four compass directions. */
export function angleToDir(angle) {
  let a = angle;
  if (a < -Math.PI / 4) a += Math.PI * 2;
  const idx = Math.round(a / (Math.PI / 2));
  return ((idx % 4) + 4) % 4;
}
