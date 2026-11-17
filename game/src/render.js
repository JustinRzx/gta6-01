// Drawing only: the game state in, pixels out. A 1280x720 logical view is scaled to the window;
// inside it the camera maps world space to the screen. Draws the city (tiles, blocks, buildings,
// parks, parking), then the shadows, cars, people, the player, markers, then the HUD and minimap.

import { FIELD, PALETTE, FONT, SPRITE } from './config.js';
import { DIR_VEC, CAR_FACING, playerKey, drawCentered, drawRotated } from './sprites.js';
import { drawHud } from './hud.js';
import { drawMinimap } from './minimap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';

function makeShadow(context) {
  const s = document.createElement('canvas');
  s.width = 64;
  s.height = 64;
  const c = s.getContext('2d');
  const g = c.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  return s;
}

function makeGlow(context, color) {
  const s = document.createElement('canvas');
  s.width = 48;
  s.height = 48;
  const c = s.getContext('2d');
  const g = c.createRadialGradient(24, 24, 1, 24, 24, 23);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 48, 48);
  return s;
}

export function createRenderer(canvas, images) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const shadow = makeShadow(context);
  const redGlow = makeGlow(context, 'rgba(255,60,50,0.9)');
  const blueGlow = makeGlow(context, 'rgba(70,110,255,0.9)');

  const roadPattern = context.createPattern(images.road, 'repeat');
  roadPattern.setTransform(new DOMMatrix().scale(170 / 512));
  const pavementPattern = context.createPattern(images.pavement, 'repeat');
  pavementPattern.setTransform(new DOMMatrix().scale(220 / 512));

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * dpr);
    const height = Math.round(window.innerHeight * dpr);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function beginWorld(cam) {
    context.translate(FIELD.width / 2, FIELD.height / 2);
    context.scale(cam.zoom, cam.zoom);
    context.translate(-cam.x, -cam.y);
  }

  function visibleRect(cam) {
    const w = FIELD.width / cam.zoom;
    const h = FIELD.height / cam.zoom;
    return { x0: cam.x - w / 2, y0: cam.y - h / 2, x1: cam.x + w / 2, y1: cam.y + h / 2 };
  }

  function drawTileBands(game, viewRect) {
    const { city } = game;
    // Sidewalks (pavement) first, then roads (asphalt) on top, per street.
    context.fillStyle = pavementPattern;
    for (const ry of city.hRoads) {
      const y0 = ry - city.street / 2;
      if (y0 > viewRect.y1 || ry + city.street / 2 < viewRect.y0) continue;
      context.fillRect(Math.max(viewRect.x0, -20), y0, (viewRect.x1 - viewRect.x0) + 40, city.street);
    }
    for (const rx of city.vRoads) {
      const x0 = rx - city.street / 2;
      if (x0 > viewRect.x1 || rx + city.street / 2 < viewRect.x0) continue;
      context.fillRect(x0, Math.max(viewRect.y0, -20), city.street, (viewRect.y1 - viewRect.y0) + 40);
    }
    context.fillStyle = roadPattern;
    for (const ry of city.hRoads) {
      const y0 = ry - city.roadWidth / 2;
      context.fillRect(viewRect.x0 - 20, y0, (viewRect.x1 - viewRect.x0) + 40, city.roadWidth);
    }
    for (const rx of city.vRoads) {
      const x0 = rx - city.roadWidth / 2;
      context.fillRect(x0, viewRect.y0 - 20, city.roadWidth, (viewRect.y1 - viewRect.y0) + 40);
    }
  }

  function drawLaneMarkings(game, viewRect) {
    const { city } = game;
    context.strokeStyle = 'rgba(245,220,90,0.9)';
    context.lineWidth = 2;
    context.setLineDash([11, 13]);
    for (const ry of city.hRoads) {
      if (ry < viewRect.y0 - 2 || ry > viewRect.y1 + 2) continue;
      context.beginPath();
      context.moveTo(viewRect.x0 - 20, ry);
      context.lineTo(viewRect.x1 + 20, ry);
      context.stroke();
    }
    for (const rx of city.vRoads) {
      if (rx < viewRect.x0 - 2 || rx > viewRect.x1 + 2) continue;
      context.beginPath();
      context.moveTo(rx, viewRect.y0 - 20);
      context.lineTo(rx, viewRect.y1 + 20);
      context.stroke();
    }
    context.setLineDash([]);
    context.strokeStyle = 'rgba(240,240,235,0.8)';
    context.lineWidth = 2;
    for (const ry of city.hRoads) {
      for (const e of [ry - city.roadWidth / 2, ry + city.roadWidth / 2]) {
        context.beginPath();
        context.moveTo(viewRect.x0 - 20, e);
        context.lineTo(viewRect.x1 + 20, e);
        context.stroke();
      }
    }
    for (const rx of city.vRoads) {
      for (const e of [rx - city.roadWidth / 2, rx + city.roadWidth / 2]) {
        context.beginPath();
        context.moveTo(e, viewRect.y0 - 20);
        context.lineTo(e, viewRect.y1 + 20);
        context.stroke();
      }
    }
  }

  function drawBlocks(game, viewRect) {
    const { city } = game;
    for (const block of city.blocks) {
      if (block.x + block.w < viewRect.x0 || block.x > viewRect.x1 || block.y + block.h < viewRect.y0 || block.y > viewRect.y1) continue;
      if (block.kind === 'park') {
        context.fillStyle = PALETTE.grass;
        context.fillRect(block.x, block.y, block.w, block.h);
        context.fillStyle = PALETTE.grassDark;
        context.fillRect(block.x, block.y + 8, block.w, 10);
        for (const t of block.trees) {
          context.fillStyle = PALETTE.treeDark;
          context.beginPath();
          context.arc(t.x + 2, t.y + 2, t.r, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = PALETTE.tree;
          context.beginPath();
          context.arc(t.x, t.y, t.r, 0, Math.PI * 2);
          context.fill();
        }
      } else if (block.kind === 'parking') {
        context.fillStyle = PALETTE.parkingAsphalt;
        context.fillRect(block.x, block.y, block.w, block.h);
        context.strokeStyle = PALETTE.parkingLine;
        context.lineWidth = 2;
        const n = 3;
        const gap = 18;
        const spotW = (block.w - gap * 2) / n;
        for (let r = 0; r < 2; r += 1) {
          const y = block.y + 16 + r * (46 + 20);
          for (let s = 0; s <= n; s += 1) {
            context.beginPath();
            context.moveTo(block.x + gap + s * spotW, y - 8);
            context.lineTo(block.x + gap + s * spotW, y + 38);
            context.stroke();
          }
        }
      } else {
        context.fillStyle = '#737880';
        context.fillRect(block.x, block.y, block.w, block.h);
        for (const b of block.buildings) {
          drawBuilding(b);
        }
      }
    }
  }

  function drawBuilding(b) {
    const off = b.height * 3;
    context.fillStyle = 'rgba(0,0,0,0.28)';
    context.fillRect(b.x + off, b.y + off, b.w, b.h);
    context.fillStyle = b.tone;
    context.fillRect(b.x, b.y, b.w, b.h);
    context.strokeStyle = PALETTE.buildingLine;
    context.lineWidth = 2;
    context.strokeRect(b.x, b.y, b.w, b.h);
    if (b.vent) {
      context.fillStyle = 'rgba(40,46,54,0.55)';
      context.fillRect(b.x + b.w * 0.25, b.y + b.h * 0.2, b.w * 0.2, b.h * 0.16);
      context.fillRect(b.x + b.w * 0.55, b.y + b.h * 0.5, b.w * 0.18, b.h * 0.14);
    }
  }

  function drawShadow(x, y, w, h) {
    context.drawImage(shadow, x - w / 2, y - h / 2, w, h);
  }

  function drawVehicle(v, time) {
    const img = images[v.kind === 'police' ? 'car-police' : 'car-sedan'];
    drawShadow(v.x + 3, v.y + 5, v.length * 1.2, v.length * 0.6);
    drawRotated(context, img, v.x, v.y, v.length, v.width, v.heading - CAR_FACING);
    if (v.kind === 'police') drawPoliceLights(v, time);
  }

  function drawPoliceLights(v, time) {
    const flash = Math.sin(time * 9 + v.flash * 6.28);
    const redOn = flash > 0;
    const blueOn = !redOn;
    const big = v.length * 0.3;
    const small = v.length * 0.18;
    const cos = Math.cos(v.heading);
    const sin = Math.sin(v.heading);
    const off = v.width * 0.32;
    const bx = v.x - sin * off;
    const by = v.y + cos * off;
    const fx = v.x + sin * off;
    const fy = v.y - cos * off;
    const rw = redOn ? big : small;
    const bw = blueOn ? big : small;
    context.drawImage(redGlow, bx - rw, by - rw, rw * 2, rw * 2);
    context.drawImage(blueGlow, fx - bw, fy - bw, bw * 2, bw * 2);
  }

  function drawPed(ped, time) {
    const img = images[`ped-${ped.person}-${['up', 'right', 'down', 'left'][ped.facing]}`];
    const bob = Math.sin(time * 8 + ped.x * 0.1 + ped.y * 0.13) * 1.1;
    drawShadow(ped.x, ped.y + 3, 16, 13);
    drawCentered(context, img, ped.x, ped.y + bob, SPRITE.person);
  }

  function drawPlayer(game) {
    const p = game.player;
    if (p.mode === 'car') return;
    const bob = Math.sin(game.time * 6) * 1.1;
    // A subtle highlight ring so the eye finds the player among the crowd.
    context.strokeStyle = 'rgba(255,255,255,0.75)';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(p.x, p.y + 2, 14, 10, 0, 0, Math.PI * 2);
    context.stroke();
    drawShadow(p.x, p.y + 3, 17, 13);
    let ox = 0;
    let oy = 0;
    if (p.punchTimer > 0) {
      const fv = DIR_VEC[p.dir];
      ox = fv.x * 6;
      oy = fv.y * 6;
    }
    const img = images[playerKey(p.dir)];
    drawCentered(context, img, p.x + ox, p.y + oy + bob, SPRITE.player);
  }

  function drawMarkers(game, viewRect) {
    const m = game.mission;
    if (m.marker) drawMarker(m.marker, PALETTE.marker, '★', game.time);
    if (m.active && m.target) drawMarker(m.target, PALETTE.objective, '✚', game.time);
  }

  function drawMarker(pt, color, glyph, time) {
    const pulse = 10 + Math.sin(time * 4) * 4;
    context.fillStyle = PALETTE.markerPulse;
    context.beginPath();
    context.arc(pt.x, pt.y, pulse + 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(pt.x, pt.y, pulse, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = '#0b0f14';
    context.font = `bold ${pulse}px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(glyph, pt.x, pt.y + 1);
  }

  function drawWorld(game) {
    const cam = game.camera.cam;
    const viewRect = visibleRect(cam);
    context.fillStyle = '#4a4f57';
    context.fillRect(viewRect.x0, viewRect.y0, viewRect.x1 - viewRect.x0, viewRect.y1 - viewRect.y0);
    drawBlocks(game, viewRect);
    drawTileBands(game, viewRect);
    drawLaneMarkings(game, viewRect);

    // Entities, sorted by y for a natural top-down order.
    const entities = [];
    for (const v of game.vehicles) entities.push({ y: v.y, kind: 'car', ref: v });
    for (const ped of game.peds) entities.push({ y: ped.y, kind: 'ped', ref: ped });
    if (game.player.mode === 'foot') entities.push({ y: game.player.y, kind: 'player', ref: game.player });
    entities.sort((a, b) => a.y - b.y);

    for (const e of entities) {
      if (e.kind === 'car') drawVehicle(e.ref, game.time);
      else if (e.kind === 'ped') drawPed(e.ref, game.time);
      else drawPlayer(game);
    }
    drawMarkers(game, viewRect);
  }

  function drawTitle(game) {
    context.fillStyle = 'rgba(8,11,16,0.9)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.text;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.font = `bold 52px ${FONT}`;
    context.fillText('SUNSET CITY', FIELD.width / 2, 240);
    context.font = `20px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText('A top-down open-world crime game', FIELD.width / 2, 284);
    context.fillStyle = PALETTE.text;
    context.font = `24px ${FONT}`;
    context.fillText('WASD / arrows  move', FIELD.width / 2, 370);
    context.fillText('E  enter or leave a car', FIELD.width / 2, 406);
    context.fillText('Space / click  punch', FIELD.width / 2, 442);
    context.fillText('P  pause', FIELD.width / 2, 478);
    context.fillStyle = PALETTE.objective;
    context.font = `26px ${FONT}`;
    context.fillText('Press any key or click to start', FIELD.width / 2, 560);
    if (game.loaded) {
      context.fillStyle = PALETTE.money;
      context.font = `18px ${FONT}`;
      context.fillText('Continue saved game', FIELD.width / 2, 604);
    }
  }

  function drawPause() {
    context.fillStyle = 'rgba(8,11,16,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.text;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.font = `bold 44px ${FONT}`;
    context.fillText('Paused', FIELD.width / 2, 330);
    context.font = `20px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.fillText('Press P or Esc to resume', FIELD.width / 2, 376);
  }

  function draw(game, screen) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    if (screen === SCREEN_TITLE) {
      context.save();
      beginWorld(game.camera.cam);
      drawWorld(game);
      context.restore();
      drawTitle(game);
      return;
    }

    context.save();
    beginWorld(game.camera.cam);
    drawWorld(game);
    context.restore();

    if (screen === SCREEN_PAUSED) drawPause();
    drawHud(context, game);
    drawMinimap(context, game);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, context };
}
