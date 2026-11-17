// The camera: follows the player (or their car) with a small look-ahead in the
// direction of travel, and clamps to the world so the view never leaves the map.
import { FIELD, WORLD_H, WORLD_W } from './config.js';

const LOOKAHEAD = 120;

export function createCamera() {
  const camera = { x: 0, y: 0 };

  function snap(fx, fy) {
    camera.x = clamp(fx - FIELD.width / 2, 0, WORLD_W - FIELD.width);
    camera.y = clamp(fy - FIELD.height / 2, 0, WORLD_H - FIELD.height);
  }

  function follow(targetX, targetY, vx, vy, dt) {
    const fx = targetX + vx * LOOKAHEAD;
    const fy = targetY + vy * LOOKAHEAD;
    const tx = clamp(fx - FIELD.width / 2, 0, Math.max(0, WORLD_W - FIELD.width));
    const ty = clamp(fy - FIELD.height / 2, 0, Math.max(0, WORLD_H - FIELD.height));
    // Smooth toward the target so the motion does not judder.
    const k = 1 - Math.exp(-dt * 8);
    camera.x += (tx - camera.x) * k;
    camera.y += (ty - camera.y) * k;
  }

  return { camera, follow, snap };
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
