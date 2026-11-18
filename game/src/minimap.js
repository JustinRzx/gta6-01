// The minimap: a dark panel in the top-right that draws the street network
// around the player as pale lines, the player as a bright arrow that points the
// way it faces, the police as red dots, the mission marker as a gold diamond,
// and a small "N".  It stays north-up so it reads clearly even shrunk small.

import { FIELD, PALETTE } from './config.js';
import { roadCenterX, roadCenterY, blockRect } from './city.js';
import { directionAngle } from './sprites.js';

const PANEL = 192;
const SPAN = 1500; // world units across the minimap

export function createMinimap() {
  const px = FIELD.width - PANEL - 16;
  const py = 16;
  const scale = PANEL / SPAN;

  function draw(ctx, game) {
    const city = game.city;
    const player = game.player;
    const target = player.driving ? game.cars[player.car] : player;
    const cx = target.x;
    const cy = target.y;

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, PANEL, PANEL);
    ctx.clip();

    ctx.fillStyle = PALETTE.minimapBg;
    ctx.fillRect(px, py, PANEL, PANEL);

    const mapX = (wx) => px + (wx - cx) * scale + PANEL / 2;
    const mapY = (wy) => py + (wy - cy) * scale + PANEL / 2;

    // Block interiors, a touch lighter than the panel, so the grid reads as
    // streets between blocks rather than lines on a void.
    ctx.fillStyle = PALETTE.minimapBlock;
    for (let by = 0; by < city.gridY; by += 1) {
      for (let bx = 0; bx < city.gridX; bx += 1) {
        const r = blockRect(bx, by);
        const x0 = mapX(r.x);
        const y0 = mapY(r.y);
        const x1 = mapX(r.x + r.w);
        const y1 = mapY(r.y + r.h);
        if (x1 < px || x0 > px + PANEL || y1 < py || y0 > py + PANEL) continue;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }

    // Street network: bright light-grey lines, thick enough to read shrunk.
    ctx.strokeStyle = PALETTE.minimapRoad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= city.gridX; i += 1) {
      const x = roadCenterX(city, i);
      if (x < cx - SPAN / 2 - 40 || x > cx + SPAN / 2 + 40) continue;
      const mx = mapX(x);
      ctx.moveTo(mx, py);
      ctx.lineTo(mx, py + PANEL);
    }
    for (let i = 0; i <= city.gridY; i += 1) {
      const y = roadCenterY(city, i);
      if (y < cy - SPAN / 2 - 40 || y > cy + SPAN / 2 + 40) continue;
      const my = mapY(y);
      ctx.moveTo(px, my);
      ctx.lineTo(px + PANEL, my);
    }
    ctx.stroke();

    // Mission marker: a gold diamond.
    if (game.missions.state.active) {
      const t = game.missions.state.target;
      const mx = mapX(t.x);
      const my = mapY(t.y);
      ctx.fillStyle = PALETTE.minimapMission;
      ctx.beginPath();
      ctx.moveTo(mx, my - 6);
      ctx.lineTo(mx + 6, my);
      ctx.lineTo(mx, my + 6);
      ctx.lineTo(mx - 6, my);
      ctx.closePath();
      ctx.fill();
    }

    // Police: red dots.
    ctx.fillStyle = PALETTE.minimapPolice;
    for (const car of game.cars) {
      if (car.kind !== 'police') continue;
      ctx.beginPath();
      ctx.arc(mapX(car.x), mapY(car.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player: a bright arrow that points the way it faces.
    let angle = player.driving ? game.cars[player.car].heading : directionAngle(player.facing);
    const mx = mapX(cx);
    const my = mapY(cy);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = PALETTE.minimapPlayer;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, -5.5);
    ctx.lineTo(-5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Small north marker.
    ctx.fillStyle = PALETTE.minimapBorder;
    ctx.fillText('N', px + 7, py + 15);

    ctx.restore();

    // Thin border.
    ctx.strokeStyle = PALETTE.minimapBorder;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, PANEL, PANEL);
  }

  return { draw };
}
