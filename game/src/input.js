// Keyboard input.  Held directional keys (WASD and the arrows) give a movement
// vector; one-shot presses (enter/exit, attack, pause, confirm) are queued as
// bit flags and taken once by the loop, so a press between frames is never
// lost and never counted twice.

export const ACTION_ENTER = 1;
export const ACTION_ATTACK = 2;
export const ACTION_PAUSE = 4;
export const ACTION_CONFIRM = 8;

const KEYS = {
  up: new Set(['KeyW', 'ArrowUp']),
  down: new Set(['KeyS', 'ArrowDown']),
  left: new Set(['KeyA', 'ArrowLeft']),
  right: new Set(['KeyD', 'ArrowRight']),
  enter: new Set(['KeyE']),
  attack: new Set(['Space', 'KeyJ', 'KeyF']),
  pause: new Set(['KeyP', 'Escape']),
  confirm: new Set(['Enter', 'Space']),
};

export function createInput() {
  const held = new Set();
  let actions = 0;
  let pointerConfirm = false;

  window.addEventListener('keydown', (event) => {
    const code = event.code;
    let used = true;
    if (KEYS.enter.has(code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (KEYS.attack.has(code)) {
      if (!event.repeat) actions |= ACTION_ATTACK;
    } else if (KEYS.pause.has(code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (KEYS.confirm.has(code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (!event.repeat && (KEYS.up.has(code) || KEYS.down.has(code) || KEYS.left.has(code) || KEYS.right.has(code))) {
      held.add(code);
    } else {
      used = false;
    }
    if (used) event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });

  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    held.clear();
  });

  window.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
    pointerConfirm = true;
  });
  window.addEventListener('pointerup', () => {
    pointerConfirm = false;
  });

  function heldAny(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    /** Movement vector, each axis -1, 0 or 1. */
    move() {
      let x = 0;
      let y = 0;
      if (heldAny(KEYS.left)) x -= 1;
      if (heldAny(KEYS.right)) x += 1;
      if (heldAny(KEYS.up)) y -= 1;
      if (heldAny(KEYS.down)) y += 1;
      return { x, y };
    },
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Any key currently held (used to gate audio on first interaction). */
    anyHeld() {
      return held.size > 0 || pointerConfirm;
    },
  };
}
