// Combat: a simple punch at close range. It knocks a pedestrian over (which is a crime) and is the
// only fight the game has — enough to make the streets feel alive and dangerous.

import { KEY_PUNCH } from './input.js';
import { playerFacingVector } from './player.js';

const PUNCH_RANGE = 42;

export function stepCombat(game, dt) {
  const p = game.player;
  if (p.mode !== 'foot') return;
  if (p.punchCooldown > 0) return;

  const pressed = game.input.takeMousePressed() || game.input.anyHeld(KEY_PUNCH);
  if (!pressed) return;

  p.punchTimer = 0.18;
  p.punchCooldown = 0.42;
  const fv = playerFacingVector(p);
  for (const ped of game.peds) {
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > PUNCH_RANGE || d < 0.001) continue;
    const dot = (dx * fv.x + dy * fv.y) / d;
    if (dot > 0.35) {
      ped.scatter = 1.1;
      ped.fleeX = dx / d;
      ped.fleeY = dy / d;
      game.reportCrime(1);
    }
  }
}
