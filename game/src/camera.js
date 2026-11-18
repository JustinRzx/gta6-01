// The camera follows the player (on foot or in a car) and looks a little ahead
// in the direction of travel, clamped to the world so the view never shows
// past the edge of the city.

import { FIELD } from './config.js';

const LOOKAHEAD = 0.28; // fraction of the screen the view leads the target by
const SMOOTH = 0.16; // exponential smoothing, 0..1

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createCamera() {
  const cam = { x: 0, y: 0 };

  function update(targetX, targetY, velX, velY, worldW, worldH) {
    const speed = Math.hypot(velX, velY);
    const look = Math.min(1, speed / 220) * FIELD.width * LOOKAHEAD;
    let lx = 0;
    let ly = 0;
    if (speed > 1) {
      lx = (velX / speed) * look;
      ly = (velY / speed) * look;
    }
    const cx = clamp(targetX + lx - FIELD.width / 2, 0, Math.max(0, worldW - FIELD.width));
    const cy = clamp(targetY + ly - FIELD.height / 2, 0, Math.max(0, worldH - FIELD.height));
    cam.x += (cx - cam.x) * SMOOTH;
    cam.y += (cy - cam.y) * SMOOTH;
  }

  function snap(x, y, worldW, worldH) {
    cam.x = clamp(x - FIELD.width / 2, 0, Math.max(0, worldW - FIELD.width));
    cam.y = clamp(y - FIELD.height / 2, 0, Math.max(0, worldH - FIELD.height));
  }

  return { cam, update, snap };
}
