// The HUD: money, a health bar, the wanted stars, the current objective and a speedometer while
// driving. Drawn in screen space (the 1280x720 logical view) so it reads whatever the camera does.

import { FIELD, PALETTE, FONT, WANTED, HEALTH, SPEED_KMH } from './config.js';

function pill(ctx, x, y, text, color) {
  ctx.font = `bold 20px ${FONT}`;
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x + 12, y + 24);
}

function drawMoney(ctx, game) {
  pill(ctx, 18, 18, `$${game.money.toLocaleString('en-US')}`, PALETTE.money);
}

function drawHealth(ctx, game) {
  const x = 18;
  const y = 60;
  const w = 150;
  const h = 12;
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('HEALTH', x, y - 4);
  ctx.fillStyle = 'rgba(8,11,16,0.85)';
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  const frac = Math.max(0, Math.min(1, game.player.health / HEALTH.max));
  const green = frac > 0.5 ? '#7ed47a' : frac > 0.25 ? '#ffd54a' : '#e5534b';
  if (frac > 0) {
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, (w - 4) * frac, h - 4, 2);
    ctx.fill();
  }
}

function starPath(ctx, cx, cy, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? R : r;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawWanted(ctx, game) {
  const stars = game.wanted.stars;
  for (let i = 0; i < WANTED.maxStars; i += 1) {
    const lit = i < stars;
    const x = FIELD.width - 34 - i * 34;
    const y = 30;
    starPath(ctx, x, y, 15, 6.2);
    if (lit) {
      ctx.fillStyle = PALETTE.star;
      ctx.strokeStyle = '#7a5b12';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = PALETTE.starOff;
      ctx.strokeStyle = '#232a34';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }
  }
  if (stars > 0) {
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillStyle = PALETTE.star;
    ctx.textAlign = 'right';
    ctx.fillText('WANTED', FIELD.width - 20, 56);
  }
}

function drawObjective(ctx, game) {
  const m = game.mission;
  let text;
  let color = PALETTE.objective;
  if (m.active) {
    const t = Math.max(0, Math.ceil(m.timeLeft));
    text = `${m.objective}  ·  ${t}s`;
  } else if (m.marker) {
    text = 'Drive to the gold marker to start a job';
    color = PALETTE.muted;
  } else {
    text = '';
  }
  if (!text) return;
  ctx.font = `bold 18px ${FONT}`;
  const w = ctx.measureText(text).width + 28;
  const x = (FIELD.width - w) / 2;
  const y = FIELD.height - 48;
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, FIELD.width / 2, y + 24);
}

function drawSpeedometer(ctx, game) {
  if (game.player.mode !== 'car' || !game.player.car) return;
  const v = game.player.car;
  const kmh = Math.round(Math.abs(v.speed) * SPEED_KMH);
  const cx = 74;
  const cy = FIELD.height - 64;
  const R = 40;
  ctx.fillStyle = 'rgba(8,11,16,0.85)';
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const maxSpeed = 300 * SPEED_KMH;
  const frac = Math.min(1, kmh / maxSpeed);
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  ctx.strokeStyle = '#2a3442';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a0, a1);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.objective;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a0, a0 + (a1 - a0) * frac);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(kmh), cx, cy + 6);
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('km/h', cx, cy + 22);
}

export function drawHud(ctx, game) {
  drawMoney(ctx, game);
  drawHealth(ctx, game);
  drawWanted(ctx, game);
  drawObjective(ctx, game);
  drawSpeedometer(ctx, game);
}
