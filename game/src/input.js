// Keyboard and mouse. Held keys give the movement direction; one-shot presses (interact, pause,
// punch) are queued and taken once by the loop so a press between two frames is never lost.

export const KEY_UP = new Set(['ArrowUp', 'KeyW']);
export const KEY_DOWN = new Set(['ArrowDown', 'KeyS']);
export const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
export const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);
export const KEY_INTERACT = new Set(['KeyE', 'KeyF', 'Enter']);
export const KEY_PAUSE = new Set(['KeyP', 'Escape']);
export const KEY_PUNCH = new Set(['Space', 'KeyJ', 'KeyZ']);

export function createInput(target) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, pressed: false };

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (!event.repeat) pressed.add(event.code);
    if (
      KEY_UP.has(event.code) || KEY_DOWN.has(event.code) || KEY_LEFT.has(event.code) ||
      KEY_RIGHT.has(event.code) || KEY_INTERACT.has(event.code) || KEY_PAUSE.has(event.code) ||
      KEY_PUNCH.has(event.code)
    ) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  target.addEventListener('pointerdown', (event) => {
    mouse.down = true;
    mouse.pressed = true;
    mouse.x = event.clientX - target.getBoundingClientRect().left;
    mouse.y = event.clientY - target.getBoundingClientRect().top;
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  /** -1, 0 or 1 on each axis, from the held movement keys. */
  function axis() {
    const x = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    const y = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    return { x, y };
  }

  function held(code) {
    return keys.has(code);
  }

  function anyHeld(set) {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  }

  /** The one-shot presses since the last call, then clears them. */
  function takePressed() {
    const taken = [...pressed];
    pressed.clear();
    return taken;
  }

  /** One-shot mouse press, taken once. */
  function takeMousePressed() {
    const was = mouse.pressed;
    mouse.pressed = false;
    return was;
  }

  return { axis, held, anyHeld, takePressed, takeMousePressed, mouse, keys };
}
