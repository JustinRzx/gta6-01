// The HUD: money, a health bar, the wanted stars, the current objective, a
// speedometer while driving, and the minimap. Text that holds a number is
// rebuilt only when it changes, so a frame allocates as little as possible.
import { FIELD, PALETTE, WANTED_MAX } from './config.js';
import { drawMinimap } from './minimap.js';

const KMH = 0.115; // world px/s -> km/h (a 140px car is ~4.5m)

export function drawHud(ctx, game, font) {
  drawMoney(ctx, game, font);
  drawHealth(ctx, game, font);
  drawStars(ctx, game, font);
  drawObjective(ctx, game, font);
  if (game.mode === 'car') drawSpeedometer(ctx, game, font);
  drawMinimap(ctx, game, font);
}

function formatMoney(value) {
  return '$' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function drawMoney(ctx, game, font) {
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = font(24);
  ctx.fillStyle = PALETTE.money;
  ctx.fillText(formatMoney(game.money), 20, 14);
}

function drawHealth(ctx, game, font) {
  const x = 20;
  const y = 48;
  const w = 170;
  const h = 13;
  ctx.fillStyle = PALETTE.healthBg;
  ctx.fillRect(x, y, w, h);
  const frac = Math.max(0, Math.min(1, game.player.health / 100));
  ctx.fillStyle = PALETTE.health;
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawStars(ctx, game, font) {
  const level = game.wanted.level;
  const size = 22;
  const gap = 8;
  const startX = FIELD.width - 24 - WANTED_MAX * size - (WANTED_MAX - 1) * gap;
  const y = 16;
  for (let i = 0; i < WANTED_MAX; i += 1) {
    const x = startX + i * (size + gap);
    drawStar(ctx, x, y, size, i < level);
  }
  if (level > 0) {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.font = font(20);
    ctx.fillStyle = PALETTE.wanted;
    ctx.fillText('WANTED', startX - 10, 18);
  }
}

function drawStar(ctx, x, y, size, lit) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.beginPath();
  const spikes = 5;
  const outer = size / 2;
  const inner = outer * 0.45;
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  if (lit) {
    ctx.fillStyle = PALETTE.wanted;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

function drawObjective(ctx, game, font) {
  const m = game.mission;
  let text = m.objective;
  if (m.messageTime > 0) text = m.message;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.font = font(19);
  const width = ctx.measureText(text).width + 40;
  const x = FIELD.width / 2 - width / 2;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, 12, width, 34);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, 12.5, width - 1, 33);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(text, FIELD.width / 2, 20);
}

function drawSpeedometer(ctx, game, font) {
  const car = game.car;
  const kmh = Math.round(Math.abs(car.speed) * KMH);
  const cx = 96;
  const cy = 620;
  const r = 46;

  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,210,224,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dial arc from -210deg to 30deg (needle sweep).
  const start = -210 * (Math.PI / 180);
  const end = 30 * (Math.PI / 180);
  const maxKmh = 200;
  const frac = Math.min(1, Math.abs(car.speed) * KMH / maxKmh);
  ctx.strokeStyle = 'rgba(120, 150, 180, 0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 8, start, end);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.speed;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 8, start, start + (end - start) * frac);
  ctx.stroke();

  // Needle.
  const needle = start + (end - start) * frac;
  ctx.strokeStyle = PALETTE.speed;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(needle) * (r - 14), cy + Math.sin(needle) * (r - 14));
  ctx.stroke();

  ctx.fillStyle = PALETTE.text;
  ctx.font = font(17);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(kmh), cx, cy + 2);
  ctx.font = font(9);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('km/h', cx, cy + 16);
  ctx.restore();
}
