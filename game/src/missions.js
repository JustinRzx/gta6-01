// Missions: a marker somewhere in the city; drive or walk into it to start a job with an objective
// in the HUD, a target marker, a time limit and a payout on completion, then the next one. Money
// in the HUD changes when a job pays out.

import { MISSION } from './config.js';
import { randInt, randRange, pick } from './random.js';

const OBJECTIVES = [
  'Deliver the package to the docks',
  'Drop the shipment at the warehouse',
  'Get the briefcase to the bank',
  'Deliver the car to the garage',
  'Meet the contact uptown',
];

function randomRoadPoint(game) {
  const { city, random } = game;
  const h = randInt(random, 0, city.ny);
  const y = city.hRoads[h];
  const x = randRange(random, city.vRoads[1] + 20, city.vRoads[city.nx - 1] - 20);
  return { x, y };
}

export function createMission(random) {
  return {
    active: false,
    index: 0,
    marker: null,
    target: null,
    objective: '',
    timeLeft: 0,
    payout: MISSION.payout,
  };
}

export function placeMissionMarker(game) {
  game.mission.marker = randomRoadPoint(game);
}

function startMission(game) {
  const m = game.mission;
  m.active = true;
  m.objective = pick(game.random, OBJECTIVES);
  let target = randomRoadPoint(game);
  let guard = 0;
  while (Math.hypot(target.x - m.marker.x, target.y - m.marker.y) < 400 && guard++ < 20) {
    target = randomRoadPoint(game);
  }
  m.target = target;
  m.timeLeft = MISSION.timeLimit;
}

function completeMission(game) {
  const m = game.mission;
  game.money += m.payout;
  m.active = false;
  m.index += 1;
  m.payout += 60;
  m.marker = randomRoadPoint(game);
  m.objective = '';
}

export function stepMissions(game, dt) {
  const m = game.mission;
  const p = game.player.car || game.player;
  if (!m.active) {
    if (m.marker && Math.hypot(p.x - m.marker.x, p.y - m.marker.y) < 30) startMission(game);
    return;
  }
  m.timeLeft -= dt;
  if (m.timeLeft <= 0) {
    m.active = false;
    m.objective = '';
    m.marker = randomRoadPoint(game);
    return;
  }
  if (Math.hypot(p.x - m.target.x, p.y - m.target.y) < 34) completeMission(game);
}
