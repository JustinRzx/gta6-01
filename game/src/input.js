// Keyboard and mouse input. Held keys become a movement vector; one-shot presses
// (enter/exit, pause, punch, shoot, confirm) are queued as bit flags and taken
// once per frame, so a press between two frames is never lost or counted twice.
// A key released while the tab is hidden never sends keyup, so everything is let
// go on blur.

export const ACTION_CONFIRM = 1;
export const ACTION_ENTER = 2; // E: get in / out of a car
export const ACTION_PAUSE = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const ENTER = new Set(['KeyE']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const PUNCH = new Set(['Space', 'KeyJ']);
const SHOOT = new Set(['KeyK']);

export function createInput(target) {
  const held = { left: false, right: false, up: false, down: false };
  let actions = 0;
  let interacted = false;
  const mouse = { x: 0, y: 0, down: false };

  function queue(flag) {
    actions |= flag;
    interacted = true;
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) held.left = true;
    else if (RIGHT.has(event.code)) held.right = true;
    else if (UP.has(event.code)) held.up = true;
    else if (DOWN.has(event.code)) held.down = true;
    else if (ENTER.has(event.code)) {
      if (!event.repeat) queue(ACTION_ENTER);
    } else if (PUNCH.has(event.code)) {
      if (!event.repeat) queue(ACTION_PUNCH);
    } else if (SHOOT.has(event.code)) {
      if (!event.repeat) queue(ACTION_SHOOT);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) queue(ACTION_CONFIRM);
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) queue(ACTION_PAUSE);
    } else return;
    interacted = true;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) held.left = false;
    else if (RIGHT.has(event.code)) held.right = false;
    else if (UP.has(event.code)) held.up = false;
    else if (DOWN.has(event.code)) held.down = false;
  });

  window.addEventListener('blur', () => {
    held.left = held.right = held.up = held.down = false;
  });

  target.addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      mouse.down = true;
      queue(ACTION_SHOOT);
    } else queue(ACTION_CONFIRM);
    interacted = true;
  });
  target.addEventListener('pointerup', () => {
    mouse.down = false;
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });

  return {
    /** Movement as -1, 0, 1 on each axis (world-independent). */
    move() {
      return {
        x: (held.right ? 1 : 0) - (held.left ? 1 : 0),
        y: (held.down ? 1 : 0) - (held.up ? 1 : 0),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    mouse() {
      return mouse;
    },
    /** Whether the player has interacted at all (used to start audio). */
    hasInteracted() {
      return interacted;
    },
  };
}
