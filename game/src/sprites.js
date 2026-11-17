// Sprite lookup: which image to draw for a person facing each way, and for each car. This is the
// one place the sheet is described, so a better player sheet can be dropped in later by editing
// only this module (and assets.js's list).

export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };

/** Unit vector for each direction, in world space (y grows downward). */
export const DIR_VEC = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** Heading angle (0 = +x, clockwise positive) that each direction faces. */
export const DIR_ANGLE = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

/** The person from the sheet the player wears; 0..3, each with its own shirt colours. */
export const PLAYER_PERSON = 0;

const DIR_NAMES = ['up', 'right', 'down', 'left'];

/** The image key for a pedestrian sprite: person index (0..3) and facing DIR. */
export function pedKey(person, dir) {
  return `ped-${person}-${DIR_NAMES[dir]}`;
}

/** The image key for the player's on-foot sprite, facing dir. */
export function playerKey(dir) {
  return pedKey(PLAYER_PERSON, dir);
}

export const CAR_SEDAN = 'car-sedan';
export const CAR_POLICE = 'car-police';

/** The car sprites were drawn facing left (-x), so a heading of PI needs no rotation. */
export const CAR_FACING = Math.PI;

/** Nearest of the four directions to a heading angle, in [0, 3]. */
export function directionFromAngle(angle) {
  let a = (angle + Math.PI / 4) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return Math.floor((a / (Math.PI * 2)) * 4) % 4;
}

/** Draw `image` centred on (x, y), scaled to `height` tall, optionally rotated by `rotation`. */
export function drawCentered(ctx, image, x, y, height, rotation = 0) {
  if (!image) return;
  const scale = height / image.height;
  const width = image.width * scale;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/** Draw `image` centred on (x, y) at an explicit width x height (world units), rotated. */
export function drawRotated(ctx, image, x, y, width, height, rotation = 0) {
  if (!image) return;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}
