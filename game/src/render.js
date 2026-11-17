// Drawing only: the game state and the current screen in, pixels out. The world
// is painted in world coordinates under a camera translate, then the HUD in the
// fixed 1280x720 frame. Tiles are seamless canvas patterns; cars and people are
// rotated sprites over soft dark shadows so nothing looks pasted on.
import { FIELD, FONT, PALETTE, ROADS_X, ROADS_Y, ROAD_W, WALK_W } from './config.js';
import { DIR_DOWN, carPoliceImage, carSedanImage, pedestrianImage } from './sprites.js';
import { drawHud } from './hud.js';

const ROAD_HALF = ROAD_W / 2;
const ROAD_TILE = 256; // world px per road tile image
const WALK_TILE = 220; // world px per pavement tile image

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';

export function createRenderer(canvas, assets) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  const roadPattern = ctx.createPattern(assets.images.road, 'repeat');
  const walkPattern = ctx.createPattern(assets.images.pavement, 'repeat');

  function font(size) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    return fonts.get(size);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function fillTile(pattern, x, y, w, h, tilePx) {
    const s = tilePx / 512;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.scale(s, s);
    ctx.fillStyle = pattern;
    ctx.fillRect(x / s, y / s, w / s, h / s);
    ctx.restore();
  }

  function dashedLine(x0, y0, x1, y1, dash, gap, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    let d = 0;
    ctx.beginPath();
    while (d < len) {
      const e = Math.min(d + dash, len);
      ctx.moveTo(x0 + ux * d, y0 + uy * d);
      ctx.lineTo(x0 + ux * e, y0 + uy * e);
      d += dash + gap;
    }
    ctx.stroke();
  }

  function drawGround(game) {
    const cam = game.camera;
    const vx0 = cam.x - 40;
    const vy0 = cam.y - 40;
    const vw = FIELD.width + 80;
    const vh = FIELD.height + 80;

    ctx.fillStyle = '#2c3138';
    ctx.fillRect(vx0, vy0, vw, vh);

    const city = game.city;
    // Sidewalks (pavement), then roads over them so crossings are covered.
    for (let j = 0; j < ROADS_X; j += 1) {
      const cx = city.roadX(j);
      if (cx + ROAD_HALF + WALK_W < vx0 || cx - ROAD_HALF - WALK_W > vx0 + vw) continue;
      fillTile(walkPattern, cx - ROAD_HALF - WALK_W, vy0, WALK_W, vh, WALK_TILE);
      fillTile(walkPattern, cx + ROAD_HALF, vy0, WALK_W, vh, WALK_TILE);
    }
    for (let i = 0; i < ROADS_Y; i += 1) {
      const cy = city.roadY(i);
      if (cy + ROAD_HALF + WALK_W < vy0 || cy - ROAD_HALF - WALK_W > vy0 + vh) continue;
      fillTile(walkPattern, vx0, cy - ROAD_HALF - WALK_W, vw, WALK_W, WALK_TILE);
      fillTile(walkPattern, vx0, cy + ROAD_HALF, vw, WALK_W, WALK_TILE);
    }
    for (let j = 0; j < ROADS_X; j += 1) {
      const cx = city.roadX(j);
      if (cx + ROAD_HALF < vx0 || cx - ROAD_HALF > vx0 + vw) continue;
      fillTile(roadPattern, cx - ROAD_HALF, vy0, ROAD_W, vh, ROAD_TILE);
    }
    for (let i = 0; i < ROADS_Y; i += 1) {
      const cy = city.roadY(i);
      if (cy + ROAD_HALF < vy0 || cy - ROAD_HALF > vy0 + vh) continue;
      fillTile(roadPattern, vx0, cy - ROAD_HALF, vw, ROAD_W, ROAD_TILE);
    }
  }

  function drawLaneMarkings(game) {
    const cam = game.camera;
    const vx0 = cam.x - 40;
    const vy0 = cam.y - 40;
    const vx1 = vx0 + FIELD.width + 80;
    const vy1 = vy0 + FIELD.height + 80;
    const city = game.city;
    for (let j = 0; j < ROADS_X; j += 1) {
      const cx = city.roadX(j);
      if (cx < vx0 - 10 || cx > vx1 + 10) continue;
      dashedLine(cx, vy0, cx, vy1, 20, 16, 3, PALETTE.roadMarking);
    }
    for (let i = 0; i < ROADS_Y; i += 1) {
      const cy = city.roadY(i);
      if (cy < vy0 - 10 || cy > vy1 + 10) continue;
      dashedLine(vx0, cy, vx1, cy, 20, 16, 3, PALETTE.roadMarking);
    }
  }

  function drawBlocks(game) {
    const cam = game.camera;
    const vx0 = cam.x - 40;
    const vy0 = cam.y - 40;
    const vx1 = vx0 + FIELD.width + 80;
    const vy1 = vy0 + FIELD.height + 80;
    const city = game.city;

    for (const lot of city.parkingLots) {
      if (lot.x + lot.w < vx0 || lot.x > vx1 || lot.y + lot.h < vy0 || lot.y > vy1) continue;
      drawParkingLot(lot);
    }
    for (const park of city.parks) {
      if (park.x + park.w < vx0 || park.x > vx1 || park.y + park.h < vy0 || park.y > vy1) continue;
      drawPark(park);
    }
    for (const b of city.buildings) {
      if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
      drawBuilding(b);
    }
  }

  function drawParkingLot(lot) {
    ctx.fillStyle = PALETTE.parking;
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (const spot of lot.spots) {
      ctx.strokeRect(spot.x, spot.y, spot.w, spot.h);
      if (spot.occupied) {
        ctx.fillStyle = parkedCarColor(spot.x, spot.y);
        ctx.fillRect(spot.x + 4, spot.y + 4, spot.w - 8, spot.h - 8);
      }
    }
  }

  function parkedCarColor(x, y) {
    const hues = ['#a9b2bc', '#7a8693', '#5c6b78', '#8a7a68', '#6f5f73', '#4f8a6a'];
    const i = Math.floor((x * 0.13 + y * 0.29) % hues.length);
    return hues[i >= 0 ? i : 0];
  }

  function drawPark(park) {
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    if (park.path) {
      ctx.fillStyle = '#c9b9a8';
      ctx.fillRect(park.x + park.w / 2 - 16, park.y, 32, park.h);
      ctx.fillRect(park.x, park.y + park.h / 2 - 16, park.w, 32);
    }
    for (const tree of park.trees) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(tree.x + 3, tree.y + 3, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7a3c';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f8a4a';
      ctx.beginPath();
      ctx.arc(tree.x - tree.r * 0.25, tree.y - tree.r * 0.25, tree.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBuilding(b) {
    const off = b.tall ? 16 : 9;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + off, b.y + off, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

    if (b.tall) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      const step = 22;
      for (let gx = b.x + step; gx < b.x + b.w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, b.y + 4);
        ctx.lineTo(gx, b.y + b.h - 4);
        ctx.stroke();
      }
      for (let gy = b.y + step; gy < b.y + b.h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(b.x + 4, gy);
        ctx.lineTo(b.x + b.w - 4, gy);
        ctx.stroke();
      }
      // A highlight to read as a glass tower.
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    } else if (b.windows) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      const s = 16;
      for (let gx = b.x + s; gx < b.x + b.w - 4; gx += s * 2) {
        for (let gy = b.y + s; gy < b.y + b.h - 4; gy += s * 2) {
          ctx.fillRect(gx, gy, 6, 6);
        }
      }
    }
  }

  function drawShadow(x, y, rx, ry) {
    const ox = rx * 0.18;
    const oy = ry * 0.28;
    const cx = x + ox;
    const cy = y + oy;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(0,0,0,0.38)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCarSprite(img, x, y, angle, length, width) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle - Math.PI);
    ctx.drawImage(img, -length / 2, -width / 2, length, width);
    ctx.restore();
  }

  function drawPoliceGlow(car) {
    const r = car.length * 0.26;
    const pulse = Math.sin(car.flash * 2);
    glow(car.x - r * 0.55, car.y, r, PALETTE.policeLight, 0.5 + 0.4 * pulse);
    glow(car.x + r * 0.55, car.y, r, PALETTE.policeLight2, 0.5 - 0.4 * pulse);
  }

  function glow(x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(0.55, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawCars(game) {
    const cam = game.camera;
    for (const car of game.cars) {
      if (car.role === 'despawn') continue;
      if (car.x < cam.x - 160 || car.x > cam.x + FIELD.width + 160 || car.y < cam.y - 160 || car.y > cam.y + FIELD.height + 160) continue;
      drawShadow(car.x, car.y, car.length / 2, car.width / 2);
    }
    for (const car of game.cars) {
      if (car.role === 'despawn') continue;
      if (car.x < cam.x - 160 || car.x > cam.x + FIELD.width + 160 || car.y < cam.y - 160 || car.y > cam.y + FIELD.height + 160) continue;
      const img = car.sprite === 'police' ? carPoliceImage(game.assets.images) : carSedanImage(game.assets.images);
      if (car.damage > 60 && car.role === 'police') {
        ctx.globalAlpha = 0.6;
      }
      drawCarSprite(img, car.x, car.y, car.angle, car.length, car.width);
      ctx.globalAlpha = 1;
      if (car.sprite === 'police') drawPoliceGlow(car);
    }
  }

  function drawPedestrians(game) {
    const cam = game.camera;
    for (const ped of game.pedestrians) {
      if (ped.x < cam.x - 60 || ped.x > cam.x + FIELD.width + 60 || ped.y < cam.y - 60 || ped.y > cam.y + FIELD.height + 60) continue;
      drawShadow(ped.x, ped.y, 19, 16);
    }
    for (const ped of game.pedestrians) {
      if (ped.x < cam.x - 60 || ped.x > cam.x + FIELD.width + 60 || ped.y < cam.y - 60 || ped.y > cam.y + FIELD.height + 60) continue;
      if (ped.downed > 0) continue;
      const img = pedestrianImage(game.assets.images, ped.person, ped.dirIndex ?? DIR_DOWN);
      const h = 50;
      const w = h * (img.width / img.height);
      const bob = Math.sin(ped.phase * 7) * 1.2;
      ctx.save();
      ctx.translate(ped.x, ped.y + bob);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  function drawPlayerFoot(game) {
    const p = game.player;
    drawShadow(p.x, p.y, 19, 16);
    const img = pedestrianImage(game.assets.images, 0, p.dir);
    const h = 50;
    const w = h * (img.width / img.height);
    const bob = p.moving ? Math.sin(p.anim * 10) * 1.4 : 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    if (p.punch > 0) {
      const fx = Math.cos(p.angle);
      const fy = Math.sin(p.angle);
      ctx.strokeStyle = '#eef1f5';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x + fx * 14, p.y + fy * 14);
      ctx.lineTo(p.x + fx * 30, p.y + fy * 30);
      ctx.stroke();
    }
  }

  function drawMarkers(game) {
    const m = game.mission;
    drawBeacon(game, m.startX, m.startY, PALETTE.gold);
    if (m.phase === 'active') drawBeacon(game, m.targetX, m.targetY, PALETTE.gold);
  }

  function drawBeacon(game, x, y, color) {
    const pulse = 1 + Math.sin(game.time * 4) * 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 18 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x, y + 12);
    ctx.lineTo(x - 12, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBullets(game) {
    ctx.fillStyle = '#ffd23f';
    for (const b of game.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorld(game) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.translate(-game.camera.x, -game.camera.y);

    drawGround(game);
    drawLaneMarkings(game);
    drawBlocks(game);
    drawMarkers(game);
    drawPedestrians(game);
    drawCars(game);
    if (game.mode === 'foot') drawPlayerFoot(game);
    drawBullets(game);
  }

  function drawHudFrame(game, screen) {
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawHud(ctx, game, font);
    if (screen === SCREEN_PAUSED) drawPaused();
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8, 12, 18, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = font(44);
    ctx.fillText('Paused', FIELD.width / 2, FIELD.height / 2 - 12);
    ctx.font = font(20);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Press P to resume', FIELD.width / 2, FIELD.height / 2 + 34);
  }

  function drawTitle(game) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0f16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.fillStyle = 'rgba(8, 12, 18, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.text;
    ctx.font = font(64);
    ctx.fillText('CITYWIDE', FIELD.width / 2, 280);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = font(26);
    ctx.fillText('A top-down open-world crime game', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = font(20);
    ctx.fillText('WASD / arrows to move · E to enter and drive a car', FIELD.width / 2, 400);
    ctx.fillText('Space to punch · K or click to shoot · P to pause', FIELD.width / 2, 432);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = font(26);
    ctx.fillText('Press Space or click to start', FIELD.width / 2, 520);
  }

  function draw(game, screen) {
    if (screen === SCREEN_TITLE) {
      drawTitle(game);
      return;
    }
    drawWorld(game);
    drawHudFrame(game, screen);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, font };
}
