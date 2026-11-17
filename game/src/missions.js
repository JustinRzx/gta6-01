// Missions: a marker in the city starts a job, the objective is written in the
// HUD with a target marker and a time limit, and completing it pays out before
// the next job appears. Mission markers sit on the sidewalk (walk-to jobs) or on
// a road lane (drive-to deliveries), so the player can always reach them.
import { MISSION_PAY, MISSION_TIME } from './config.js';
import { laneX, laneY } from './traffic.js';

const KINDS = ['delivery', 'payphone', 'pickup', 'delivery'];

function missionKind(index) {
  return KINDS[index % KINDS.length];
}

function pointOnSidewalk(game, seedVal) {
  const city = game.city;
  const i = Math.abs(seedVal * 7) % city.rows;
  const j = Math.abs(seedVal * 13) % city.cols;
  const ring = city.walkRing(i, j);
  const t = (seedVal % 97) / 97;
  const w = ring.right - ring.left;
  const h = ring.bottom - ring.top;
  if (t < 0.5) {
    const u = (t * 2) * (w + h);
    return u < w
      ? { x: ring.left + u, y: ring.top }
      : { x: ring.right, y: ring.top + (u - w) };
  }
  const u = ((t - 0.5) * 2) * (w + h);
  return u < w
    ? { x: ring.right - u, y: ring.bottom }
    : { x: ring.left, y: ring.bottom - (u - w) };
}

function pointOnRoad(game, seedVal) {
  const city = game.city;
  if (seedVal % 2 === 0) {
    const i = Math.abs(seedVal * 5) % (city.rows + 1);
    const dir = seedVal % 3 === 0 ? -1 : 1;
    const j = Math.abs(seedVal * 11) % (city.cols + 1);
    return { x: city.roadX(j), y: laneY(city.roadY, i, dir) };
  }
  const j = Math.abs(seedVal * 5) % (city.cols + 1);
  const dir = seedVal % 3 === 0 ? -1 : 1;
  const i = Math.abs(seedVal * 11) % (city.rows + 1);
  return { x: laneX(city.roadX, j, dir), y: city.roadY(i) };
}

function describe(city, kind, start, target) {
  const hNear = nearestName(city, start);
  const vNear = nearestName(city, target);
  if (kind === 'delivery') return `Deliver the package to ${vNear}`;
  if (kind === 'payphone') return `Walk to the payphone on ${hNear}`;
  return `Pick up the briefcase on ${hNear}`;
}

function nearestName(city, p) {
  let best = city.hNames[0];
  let bestDist = Infinity;
  for (let i = 0; i < city.hNames.length; i += 1) {
    const d = Math.abs(city.roadY(i) - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = city.hNames[i];
    }
  }
  return best;
}

export function createMissionState() {
  return {
    index: 0,
    phase: 'idle',
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
    objective: '',
    title: '',
    time: 0,
    pay: MISSION_PAY,
    message: '',
    messageTime: 0,
  };
}

export function placeMission(game, index) {
  const city = game.city;
  const kind = missionKind(index);
  const start = pointOnSidewalk(game, 1000 + index * 31);
  const onRoad = kind === 'delivery';
  const target = onRoad ? pointOnRoad(game, 4000 + index * 47) : pointOnSidewalk(game, 7000 + index * 53);
  const m = game.mission;
  m.index = index;
  m.phase = 'idle';
  m.kind = kind;
  m.startX = start.x;
  m.startY = start.y;
  m.targetX = target.x;
  m.targetY = target.y;
  m.title = kind === 'delivery' ? 'Delivery' : kind === 'payphone' ? 'Payphone' : 'Pickup';
  m.objective = `Go to the marker to start the ${m.title.toLowerCase()}`;
  m.time = MISSION_TIME;
  m.pay = MISSION_PAY + index * 50;
}

function bodyPos(game) {
  return game.mode === 'car' ? game.car : game.player;
}

export function updateMission(game, dt) {
  const m = game.mission;
  const body = bodyPos(game);
  const radius = game.mode === 'car' ? 46 : 30;
  if (m.messageTime > 0) m.messageTime -= dt;

  if (m.phase === 'idle') {
    if (Math.hypot(body.x - m.startX, body.y - m.startY) < radius) {
      m.phase = 'active';
      m.time = MISSION_TIME;
      m.objective = describe(game.city, m.kind, { x: m.startX, y: m.startY }, { x: m.targetX, y: m.targetY });
      m.message = 'Job started';
      m.messageTime = 2.5;
    }
  } else if (m.phase === 'active') {
    m.time -= dt;
    if (Math.hypot(body.x - m.targetX, body.y - m.targetY) < radius) {
      game.money += m.pay;
      m.message = `Job complete +$${m.pay}`;
      m.messageTime = 2.5;
      game.stats = game.stats || {};
      game.stats.jobs = (game.stats.jobs || 0) + 1;
      placeMission(game, m.index + 1);
    } else if (m.time <= 0) {
      m.message = 'Out of time';
      m.messageTime = 2.5;
      m.phase = 'idle';
      m.objective = 'Go to the marker to start a new job';
    }
  }
}
