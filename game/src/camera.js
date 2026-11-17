// The camera: follows the player or the car, looks a little ahead in the direction of travel, and
// is clamped so the view never leaves the world. Zoom keeps only a few blocks on screen.

import { FIELD } from './config.js';

export function createCamera() {
  const cam = { x: 0, y: 0, zoom: 1.15, targetZoom: 1.15 };

  /** Ask for a different zoom (the renderer eases toward it). */
  function setZoom(z) {
    cam.targetZoom = z;
  }

  /** The world-space width and height currently visible. */
  function viewSize() {
    return { w: FIELD.width / cam.zoom, h: FIELD.height / cam.zoom };
  }

  function snapTo(target, worldW, worldH) {
    cam.x = target.x;
    cam.y = target.y;
    cam.zoom = cam.targetZoom;
    const { w, h } = viewSize();
    clamp(w, h, worldW, worldH);
  }

  function clamp(w, h, worldW, worldH) {
    if (worldW <= w) cam.x = worldW / 2;
    else cam.x = Math.min(worldW - w / 2, Math.max(w / 2, cam.x));
    if (worldH <= h) cam.y = worldH / 2;
    else cam.y = Math.min(worldH - h / 2, Math.max(h / 2, cam.y));
  }

  function update(target, lookVec, dt, worldW, worldH) {
    cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 5);
    const { w, h } = viewSize();
    const look = 0.12;
    const tx = target.x + lookVec.x * w * look;
    const ty = target.y + lookVec.y * h * look;
    const k = Math.min(1, dt * 6);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    clamp(w, h, worldW, worldH);
  }

  return { cam, setZoom, update, viewSize, snapTo };
}
