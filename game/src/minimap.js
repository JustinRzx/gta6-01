// The minimap: a dark corner panel with a border and corner radius, drawing the city's street grid
// as pale grey lines (the blocks stay dark), the player as a large bright triangle pointing the way
// they face, police as red dots, the mission marker as a gold diamond and other traffic as faint
// dots. The streets are the whole network, so an intersection reads as an intersection.

import { FIELD, PALETTE } from './config.js';
import { DIR_ANGLE } from './sprites.js';

const SIZE = 236;

export function drawMinimap(ctx, game) {
  const { city } = game;
  const x0 = FIELD.width - SIZE - 16;
  const y0 = FIELD.height - SIZE - 16;
  const pad = 12;
  const inner = SIZE - pad * 2;
  const ox = x0 + pad;
  const oy = y0 + pad;
  const sx = inner / city.worldWidth;
  const sy = inner / city.worldHeight;
  const mx = (wx) => ox + wx * sx;
  const my = (wy) => oy + wy * sy;

  ctx.fillStyle = 'rgba(8,11,16,0.95)';
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x0, y0, SIZE, SIZE, 14);
  ctx.fill();
  ctx.stroke();

  // Streets as pale grey bands; blocks are left dark.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, y0, SIZE, SIZE, 14);
  ctx.clip();
  ctx.fillStyle = 'rgba(158,172,192,0.55)';
  const roadW = Math.max(2, city.roadWidth * sx);
  for (const ry of city.hRoads) {
    ctx.fillRect(ox, my(ry - city.roadWidth / 2), inner, roadW);
  }
  for (const rx of city.vRoads) {
    ctx.fillRect(mx(rx - city.roadWidth / 2), oy, roadW, inner);
  }

  // Mission marker: a gold diamond (the start marker, or the target while a job is active).
  const m = game.mission;
  const goal = m.active && m.target ? m.target : m.marker;
  if (goal) {
    const gx = mx(goal.x);
    const gy = my(goal.y);
    ctx.fillStyle = PALETTE.objective;
    ctx.strokeStyle = '#6b4d0a';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3.6, -3.6, 7.2, 7.2);
    ctx.strokeRect(-3.6, -3.6, 7.2, 7.2);
    ctx.restore();
  }

  // Other traffic as faint dots, police as red dots.
  for (const v of game.vehicles) {
    const px = mx(v.x);
    const py = my(v.y);
    if (v.driver === 'police') {
      ctx.fillStyle = '#ff5a4e';
      ctx.strokeStyle = '#5a120d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (v.driver === 'traffic') {
      ctx.fillStyle = 'rgba(150,160,175,0.5)';
      ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
    }
  }
  ctx.restore();

  // The player: a large bright triangle, in a colour nothing else on the panel uses.
  const p = game.player.car || game.player;
  const angle = game.player.car ? game.player.car.heading : DIR_ANGLE[game.player.dir];
  const px = mx(p.x);
  const py = my(p.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#4ade80';
  ctx.strokeStyle = '#0b0f14';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(7, 7);
  ctx.lineTo(0, 3);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // A north marker.
  ctx.fillStyle = 'rgba(203,212,224,0.8)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('N', x0 + SIZE - 14, y0 + 17);
}
