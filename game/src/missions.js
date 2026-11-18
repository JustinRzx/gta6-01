// Missions: a marker in the city; reaching it starts a timed job with the
// objective written in the HUD, a target marker, a payout on completion, then
// the next job.  Money in the HUD changes when a job pays out.

import { MISSIONS } from './config.js';
import { blockRect, SPACING } from './city.js';

const STREETS = [
  'Calder Street', 'Vane Avenue', 'Morrow Drive', 'Harker Lane', 'Temple Road',
  'Oxley Way', 'Juniper Street', 'Cascade Boulevard', 'Farrow Street', 'Brenner Avenue',
];

const TEMPLATES = [
  (n) => `Deliver the package to ${n}`,
  (n) => `Walk to the payphone on ${n}`,
  (n) => `Pick up the drop on ${n}`,
  (n) => `Reach the marker on ${n}`,
];

export function createMissions() {
  const state = {
    index: 0,
    active: false,
    objective: '',
    target: { x: 0, y: 0 },
    markerKind: 'pickup', // 'pickup' | 'payphone' | 'delivery'
    timer: 0,
    timeLimit: MISSIONS.timeLimit,
    pay: MISSIONS.payBase,
  };

  return { state };
}

/** A reachable point on a pavement, chosen pseudo-randomly. */
export function randomSidewalkPoint(game) {
  const r = game.random;
  const city = game.city;
  const vertical = r() < 0.5;
  const road = Math.floor(r() * (vertical ? city.gridX + 1 : city.gridY + 1));
  const along = 0.15 + r() * 0.7; // fraction along the road
  const length = (vertical ? city.gridY : city.gridX) * city.spacing;
  let x;
  let y;
  const halfRoad = city.roadW / 2;
  const side = r() < 0.5 ? -1 : 1;
  const offset = halfRoad + city.sidewalkW * 0.5;
  if (vertical) {
    x = halfRoad + road * city.spacing + side * offset;
    y = halfRoad + along * length;
  } else {
    y = halfRoad + road * city.spacing + side * offset;
    x = halfRoad + along * length;
  }
  return { x, y };
}

/** Begin job `index` at a fresh target, with the objective text set. */
export function startMission(game) {
  const m = game.missions;
  m.state.index += 0;
  m.state.target = randomSidewalkPoint(game);
  const template = TEMPLATES[m.state.index % TEMPLATES.length];
  const name = STREETS[m.state.index % STREETS.length];
  m.state.objective = template(name);
  m.state.markerKind = m.state.index % 3 === 1 ? 'payphone' : m.state.index % 3 === 2 ? 'delivery' : 'pickup';
  m.state.timer = m.state.timeLimit;
  m.state.pay = MISSIONS.payBase + m.state.index * 60;
  m.state.active = true;
}

/** Set a specific objective (used by the screenshot staging). */
export function setObjective(game, objective, x, y, markerKind) {
  const m = game.missions;
  m.state.objective = objective;
  m.state.target = { x, y };
  m.state.markerKind = markerKind || 'pickup';
  m.state.active = true;
  m.state.timer = m.state.timeLimit;
}

export function completeMission(game) {
  const m = game.missions;
  game.player.money += m.state.pay;
  m.state.index += 1;
  m.state.active = false;
  startMission(game);
}

/** Advance the mission clock; a job that runs out fails quietly. */
export function updateMissions(game, dt) {
  const m = game.missions;
  if (!m.state.active) return;
  m.state.timer -= dt;
  if (m.state.timer <= 0) {
    m.state.active = false;
    m.state.objective = '';
  }
}

/** How close the player (or car) must come to the marker. */
const REACH = 26;

/** True when the player is on the current target; completes the job. */
export function checkReach(game) {
  const m = game.missions;
  if (!m.state.active) return false;
  const p = game.player.driving ? game.cars[game.player.car] : game.player;
  const d = Math.hypot(p.x - m.state.target.x, p.y - m.state.target.y);
  if (d < REACH) {
    completeMission(game);
    return true;
  }
  return false;
}
