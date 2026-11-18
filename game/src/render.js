// Drawing only: the world, entities and HUD out, pixels in.  The fixed 1280x720
// playfield is scaled to the window and letterboxed; the camera pans within it.
// Ground tiles are drawn with a small helper that tiles them aligned to the
// world origin, so they never jump as the camera moves.  Every car and person
// sits on a soft dark ellipse offset away from the light.

import { FIELD, PALETTE, CAR, FONT, LIGHTBAR } from './config.js';
import { roadCenterX, roadCenterY, blockRect } from './city.js';
import { personSprite } from './sprites.js';
import { createHud } from './hud.js';
import { createMinimap } from './minimap.js';

const ROAD_TILE = 190;
const PAVEMENT_TILE = 96;

function makeSoftShadow() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.34)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return c;
}

function rotatedImage(img) {
  const c = document.createElement('canvas');
  c.width = img.height;
  c.height = img.width;
  const g = c.getContext('2d');
  g.translate(c.width / 2, c.height / 2);
  g.rotate(Math.PI / 2);
  g.drawImage(img, -img.width / 2, -img.height / 2);
  return c;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const shadow = makeSoftShadow();
  const hud = createHud();
  const minimap = createMinimap();
  let roadV = null;
  let roadH = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function fillTiled(img, x, y, w, h, size) {
    const x0 = Math.floor(x / size) * size;
    const y0 = Math.floor(y / size) * size;
    for (let ty = y0; ty < y + h; ty += size) {
      for (let tx = x0; tx < x + w; tx += size) {
        ctx.drawImage(img, tx, ty, size, size);
      }
    }
  }

  function drawGround(game, viewRect) {
    const city = game.city;
    const { x0, y0, x1, y1 } = viewRect;

    ctx.fillStyle = '#26242a';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // Blocks (buildings, parks, parking lots) first.
    const firstBlockX = Math.max(0, Math.floor((x0 - city.roadW) / city.spacing));
    const lastBlockX = Math.min(city.gridX - 1, Math.ceil((x1) / city.spacing));
    const firstBlockY = Math.max(0, Math.floor((y0 - city.roadW) / city.spacing));
    const lastBlockY = Math.min(city.gridY - 1, Math.ceil((y1) / city.spacing));
    for (let by = firstBlockY; by <= lastBlockY; by += 1) {
      for (let bx = firstBlockX; bx <= lastBlockX; bx += 1) {
        drawBlock(game, bx, by);
      }
    }

    // Sidewalk strips, then roads on top (roads overwrite at intersections).
    const imgPavement = game.images.pavement;
    for (let j = 0; j <= city.gridX; j += 1) {
      const cx = roadCenterX(city, j);
      const lx = cx - city.roadW / 2 - city.sidewalkW;
      if (lx + city.sidewalkW < x0 || lx > x1) continue;
      fillTiled(imgPavement, lx, y0, city.sidewalkW, y1 - y0, PAVEMENT_TILE);
      fillTiled(imgPavement, cx + city.roadW / 2, y0, city.sidewalkW, y1 - y0, PAVEMENT_TILE);
    }
    for (let i = 0; i <= city.gridY; i += 1) {
      const cy = roadCenterY(city, i);
      const ty = cy - city.roadW / 2 - city.sidewalkW;
      if (ty + city.sidewalkW < y0 || ty > y1) continue;
      fillTiled(imgPavement, x0, ty, x1 - x0, city.sidewalkW, PAVEMENT_TILE);
      fillTiled(imgPavement, x0, cy + city.roadW / 2, x1 - x0, city.sidewalkW, PAVEMENT_TILE);
    }

    if (!roadV) {
      roadV = game.images.road;
      roadH = rotatedImage(game.images.road);
    }
    for (let j = 0; j <= city.gridX; j += 1) {
      const cx = roadCenterX(city, j);
      const rx = cx - city.roadW / 2;
      if (rx + city.roadW < x0 || rx > x1) continue;
      fillTiled(roadV, rx, y0, city.roadW, y1 - y0, ROAD_TILE);
    }
    for (let i = 0; i <= city.gridY; i += 1) {
      const cy = roadCenterY(city, i);
      const ry = cy - city.roadW / 2;
      if (ry + city.roadW < y0 || ry > y1) continue;
      fillTiled(roadH, x0, ry, x1 - x0, city.roadW, ROAD_TILE);
    }

    drawCenterLines(game, viewRect);
    drawTrees(game, viewRect);
  }

  function drawCenterLines(game, viewRect) {
    const city = game.city;
    ctx.strokeStyle = 'rgba(238,208,96,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 24]);
    ctx.beginPath();
    for (let j = 0; j <= city.gridX; j += 1) {
      const cx = roadCenterX(city, j);
      if (cx < viewRect.x0 - 20 || cx > viewRect.x1 + 20) continue;
      ctx.moveTo(cx, viewRect.y0);
      ctx.lineTo(cx, viewRect.y1);
    }
    for (let i = 0; i <= city.gridY; i += 1) {
      const cy = roadCenterY(city, i);
      if (cy < viewRect.y0 - 20 || cy > viewRect.y1 + 20) continue;
      ctx.moveTo(viewRect.x0, cy);
      ctx.lineTo(viewRect.x1, cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBlock(game, bx, by) {
    const city = game.city;
    const b = city.blocks[by * city.gridX + bx];
    if (!b) return;
    const rect = blockRect(bx, by);
    if (b.type === 1) {
      // Park.
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = PALETTE.parkPath;
      ctx.fillRect(rect.x + rect.w * 0.2, rect.y, rect.w * 0.6, rect.h);
      ctx.fillRect(rect.x, rect.y + rect.h * 0.35, rect.w, rect.h * 0.3);
    } else if (b.type === 2) {
      // Parking lot.
      ctx.fillStyle = PALETTE.parkingLot;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      for (let x = rect.x + 20; x < rect.x + rect.w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, rect.y + 10);
        ctx.lineTo(x, rect.y + rect.h - 10);
        ctx.stroke();
      }
    } else {
      // Buildings fill the block interior; the tiny gaps show the base colour.
      for (const bd of city.buildings) {
        if (bd.x > rect.x + rect.w || bd.x + bd.w < rect.x) continue;
        if (bd.y > rect.y + rect.h || bd.y + bd.h < rect.y) continue;
        ctx.fillStyle = bd.color;
        ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
        ctx.strokeStyle = PALETTE.buildingEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(bd.x, bd.y, bd.w, bd.h);
        // Roof detail: a small unit near the centre.
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.fillRect(bd.x + bd.w * 0.32, bd.y + bd.h * 0.32, bd.w * 0.36, bd.h * 0.36);
      }
    }
  }

  function drawTrees(game, viewRect) {
    for (const t of game.city.trees) {
      if (t.x < viewRect.x0 - 30 || t.x > viewRect.x1 + 30 || t.y < viewRect.y0 - 30 || t.y > viewRect.y1 + 30) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(t.x + 4, t.y + 5, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c6b32';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c7a3d';
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.2, t.y - t.r * 0.2, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShadow(x, y, w, h) {
    ctx.drawImage(shadow, x - w / 2 + 5, y - h / 2 + 7, w, h);
  }

  function drawPerson(game, personIndex, dir, x, y, bob) {
    const img = game.images[personSprite(personIndex, dir)];
    const h = 50;
    const w = img.width * (h / img.height);
    ctx.drawImage(img, x - w / 2, y - h / 2 + Math.sin(bob) * 1.5, w, h);
  }

  function drawCar(game, car) {
    const img = game.images[car.sprite];
    const w = CAR.length;
    const h = img.height * (w / img.width);
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading - Math.PI);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    if (car.kind === 'police') {
      drawPoliceGlow(car);
    }
  }

  function drawPoliceGlow(car) {
    const rx = -Math.sin(car.heading);
    const ry = Math.cos(car.heading);
    const half = car.width * 0.32;
    const t = car.flash || 0;
    const redOn = Math.sin(t * 10) > 0;
    for (const [side, color] of [[-1, LIGHTBAR.red], [1, LIGHTBAR.blue]]) {
      const on = side < 0 ? redOn : !redOn;
      const a = on ? 0.9 : 0.4;
      const gx = car.x + rx * side * half;
      const gy = car.y + ry * side * half;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 18);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = a;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawMarker(game) {
    const m = game.missions;
    if (!m.state.active) return;
    const t = m.state.target;
    const pulse = 1 + Math.sin(game.time * 5) * 0.15;
    const r = 16 * pulse;
    const grad = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, r + 10);
    grad.addColorStop(0, 'rgba(255,214,90,0.9)');
    grad.addColorStop(1, 'rgba(255,214,90,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff2c0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffd65a';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - 9);
    ctx.lineTo(t.x + 9, t.y);
    ctx.lineTo(t.x, t.y + 9);
    ctx.lineTo(t.x - 9, t.y);
    ctx.closePath();
    ctx.fill();
  }

  function drawWorld(game) {
    const cam = game.camera.cam;
    const viewRect = { x0: cam.x, y0: cam.y, x1: cam.x + FIELD.width, y1: cam.y + FIELD.height };
    drawGround(game, viewRect);
    drawMarker(game);

    // Shadows for every car and person.
    for (const car of game.cars) {
      if (car.remove) continue;
      drawShadow(car.x, car.y, CAR.length, CAR.length * 0.62);
    }
    for (const p of game.people) {
      if (p.downed) continue;
      drawShadow(p.x, p.y, 34, 22);
    }
    if (!game.player.driving) drawShadow(game.player.x, game.player.y, 34, 22);

    // Entities, sorted back-to-front by their base y.
    const items = [];
    for (const car of game.cars) {
      if (car.remove) continue;
      items.push({ y: car.y, kind: 'car', ref: car });
    }
    for (const p of game.people) {
      if (p.downed) continue;
      items.push({ y: p.y, kind: 'person', ref: p });
    }
    if (!game.player.driving) items.push({ y: game.player.y, kind: 'player', ref: game.player });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      if (it.kind === 'car') drawCar(game, it.ref);
      else if (it.kind === 'person') drawPerson(game, it.ref.person, it.ref.dir, it.ref.x, it.ref.y, it.ref.bob);
      else drawPerson(game, 0, it.ref.facing, it.ref.x, it.ref.y, 0);
    }

    // Downed pedestrians drawn flat under everything moving.
    for (const p of game.people) {
      if (!p.downed) continue;
      ctx.save();
      ctx.translate(p.x, p.y + 6);
      ctx.rotate(Math.PI / 2);
      const img = game.images[personSprite(p.person, p.dir)];
      const h = 44;
      const w = img.width * (h / img.height);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Bullets and muzzle flashes.
    for (const b of game.bullets) {
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const e of game.effects) {
      if (e.kind === 'muzzle') {
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6 * (1 - e.t * 2), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === 'punch') {
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - e.t * 2)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 10 + e.t * 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawOverlay(game, screen) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.text;
    ctx.font = '46px ' + FONT;
    if (screen === 'title') {
      ctx.fillText('SUNSET CITY', FIELD.width / 2, FIELD.height / 2 - 40);
      ctx.font = '20px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('A top-down open-world crime game', FIELD.width / 2, FIELD.height / 2 + 2);
      ctx.fillText('WASD / arrows to move · E to enter a car · Space to fight · P to pause', FIELD.width / 2, FIELD.height / 2 + 34);
      ctx.fillStyle = PALETTE.money;
      ctx.font = '24px ' + FONT;
      ctx.fillText('Press Enter or click to start', FIELD.width / 2, FIELD.height / 2 + 96);
    } else if (screen === 'paused') {
      ctx.fillText('Paused', FIELD.width / 2, FIELD.height / 2 - 20);
      ctx.font = '20px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Press P to resume', FIELD.width / 2, FIELD.height / 2 + 22);
    } else if (screen === 'over') {
      ctx.fillText('Wasted', FIELD.width / 2, FIELD.height / 2 - 20);
      ctx.font = '20px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Press Enter to continue', FIELD.width / 2, FIELD.height / 2 + 22);
    }
  }

  function draw(game, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    const cam = game.camera.cam;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    drawWorld(game);
    ctx.restore();

    if (screen === 'play' || screen === 'paused') {
      hud.draw(ctx, game);
      minimap.draw(ctx, game);
    }
    if (screen === 'title' || screen === 'paused' || screen === 'over') {
      drawOverlay(game, screen);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize };
}
