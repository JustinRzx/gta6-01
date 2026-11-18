// The HUD, drawn in screen space (the fixed 1280x720 field): money, a health
// bar, the wanted stars, the mission objective and its timer, and the
// speedometer while driving.  Text that holds a number is cached so a frame
// allocates nothing.

import { FIELD, FONT, PALETTE, PLAYER } from './config.js';

function cached(prefix, suffix) {
  let value = null;
  let text = '';
  return (v) => {
    if (v !== value) {
      value = v;
      text = prefix + v + (suffix || '');
    }
    return text;
  };
}

export function createHud() {
  const moneyLabel = cached('$');
  const speedLabel = cached('', ' km/h');
  const timerLabel = cached('');
  const fonts = new Map();

  function font(ctx, size) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    return fonts.get(size);
  }

  function text(ctx, str, x, y, size, color, align, baseline) {
    ctx.font = font(ctx, size);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function drawStars(ctx, stars) {
    const x = FIELD.width / 2;
    const y = 92;
    const r = 11;
    const gap = 30;
    const startX = x - ((5 - 1) * gap) / 2;
    for (let i = 0; i < 5; i += 1) {
      const cx = startX + i * gap;
      drawStar(ctx, cx, y, r, i < stars ? PALETTE.wanted : 'rgba(255,255,255,0.16)');
    }
    if (stars > 0) {
      text(ctx, 'WANTED', x, y - 30, 22, '#e5534b', 'center', 'middle');
    }
  }

  function drawStar(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const ang = -Math.PI / 2 + i * (Math.PI / 5);
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawBar(ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = PALETTE.hudHealthBg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, w * frac), h);
  }

  function drawHealth(ctx, health) {
    const frac = health / PLAYER.maxHealth;
    const color = frac > 0.35 ? PALETTE.health : PALETTE.healthLow;
    text(ctx, 'HEALTH', 24, 76, 13, PALETTE.muted, 'left', 'alphabetic');
    drawBar(ctx, 24, 82, 168, 14, frac, color);
  }

  function draw(ctx, game) {
    const p = game.player;
    text(ctx, moneyLabel(p.money), 24, 36, 30, PALETTE.money, 'left', 'alphabetic');
    drawHealth(ctx, p.health);

    // Objective, centred.
    const m = game.missions;
    if (m.state.active && m.state.objective) {
      text(ctx, m.state.objective, FIELD.width / 2, 30, 20, PALETTE.objective, 'center', 'alphabetic');
      const secs = Math.max(0, Math.ceil(m.state.timer));
      text(ctx, timerLabel(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`), FIELD.width / 2, 56, 16, PALETTE.objectiveDim, 'center', 'alphabetic');
    }

    drawStars(ctx, game.wanted.state.stars);

    // Speedometer while driving.
    if (p.driving) {
      const car = game.cars[p.car];
      const kmh = Math.round(Math.abs(car.speed) * 0.6);
      const x = FIELD.width - 40;
      const y = FIELD.height - 40;
      ctx.fillStyle = PALETTE.panel;
      ctx.beginPath();
      ctx.arc(x, y, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 3;
      ctx.stroke();
      text(ctx, speedLabel(kmh), x, y - 4, 26, PALETTE.text, 'center', 'middle');
      text(ctx, 'km/h', x, y + 18, 11, PALETTE.muted, 'center', 'middle');
    }
  }

  return { draw };
}
