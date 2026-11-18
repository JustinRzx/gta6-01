// Which sprite to draw for a person facing each of the four compass directions.
// Kept as a small lookup table in its own module so a better pedestrian sheet
// (more people, more poses) can drop in later without touching anything else.

export const DIRECTIONS = ['up', 'right', 'down', 'left'];

/** The four people the pedestrian sheet provides (one per row). */
export const PERSON_COUNT = 4;

/** Column order of the source sheet: up, right, down, left. */
export function personSprite(personIndex, direction) {
  return `person-${personIndex}-${direction}`;
}

/** The car sprites.  Both face left in the source sheet. */
export const CAR_SPRITE = {
  sedan: 'car-sedan',
  police: 'car-police',
};

/**
 * Snap a heading angle (radians, 0 = right / east, growing clockwise because
 * the canvas y axis points down) to the nearest pedestrian orientation.
 */
export function facingToDirection(angle) {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  const idx = Math.round(a / (Math.PI / 2)) % 4;
  // 0 -> right, 1 -> down, 2 -> left, 3 -> up (y grows downward).
  return ['right', 'down', 'left', 'up'][idx];
}

/** Unit vector (x, y) for a compass direction, in screen space (y down). */
export function directionVector(dir) {
  switch (dir) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    default: return { x: 1, y: 0 };
  }
}

/** The heading angle (radians) for a compass direction. */
export function directionAngle(dir) {
  switch (dir) {
    case 'up': return -Math.PI / 2;
    case 'down': return Math.PI / 2;
    case 'left': return Math.PI;
    default: return 0;
  }
}
