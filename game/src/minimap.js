// The minimap: the street network around the player drawn as pale lines on a
// dark panel, the player as a bright arrow that points the way it faces, police
// as red dots, the mission marker as a gold diamond, a thin border and a small
// "N". It is drawn small on purpose and stays readable when shrunk.
import { FIELD, PALETTE, PERIOD, ROADS_X, ROADS_Y, WANTED_MAX } from './config.js';

const SIZE = 172;
const MARGIN = 14;
const REGION = 3.6 * PERIOD; // world width shown across the panel

export function drawMinimap(ctx, game, font) {
  const body = game.mode === 'car' ? game.car : game.player;
  const px = body.x;
  const py = body.y;

  const x0 = FIELD.width - SIZE - MARGIN;
  const y0 = FIELD.height - SIZE - MARGIN;
  const scale = SIZE / REGION;
  const wl = px - REGION / 2;
  const wt = py - REGION / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, SIZE, SIZE);
  ctx.clip();

  ctx.fillStyle = 'rgba(8, 12, 18, 0.9)';
  ctx.fillRect(x0, y0, SIZE, SIZE);

  const toX = (wx) => x0 + (wx - wl) * scale;
  const toY = (wy) => y0 + (wy - wt) * scale;

  ctx.strokeStyle = 'rgba(160, 175, 195, 0.32)';
  ctx.lineWidth = 2;
  const city = game.city;
  for (let j = 0; j < ROADS_X; j += 1) {
    const wx = city.roadX(j);
    if (wx < wl - 40 || wx > wl + REGION + 40) continue;
    const sx = toX(wx);
    ctx.beginPath();
    ctx.moveTo(sx, y0);
    ctx.lineTo(sx, y0 + SIZE);
    ctx.stroke();
  }
  for (let i = 0; i < ROADS_Y; i += 1) {
    const wy = city.roadY(i);
    if (wy < wt - 40 || wy > wt + REGION + 40) continue;
    const sy = toY(wy);
    ctx.beginPath();
    ctx.moveTo(x0, sy);
    ctx.lineTo(x0 + SIZE, sy);
    ctx.stroke();
  }

  // Mission marker (pickup) as a gold diamond.
  const m = game.mission;
  drawDiamond(ctx, toX(m.startX), toY(m.startY), 5, PALETTE.gold);
  if (m.phase === 'active') drawDiamond(ctx, toX(m.targetX), toY(m.targetY), 5, PALETTE.gold);

  // Police as red dots.
  ctx.fillStyle = '#ff3b3b';
  for (const car of game.cars) {
    if (car.role !== 'police') continue;
    ctx.beginPath();
    ctx.arc(toX(car.x), toY(car.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player: a bright arrow pointing the way it faces.
  ctx.save();
  ctx.translate(toX(px), toY(py));
  ctx.rotate(body.angle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, 4.5);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-5, -4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // Border and compass on top of the clipped panel.
  ctx.strokeStyle = 'rgba(200, 210, 224, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, SIZE - 1, SIZE - 1);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = font(11);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('N', x0 + SIZE / 2, y0 + 3);
}

function drawDiamond(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}
