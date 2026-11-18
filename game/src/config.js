// Every tuning number and colour in one place.  The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window.  World
// coordinates are in these logical pixels, so at the default zoom a car is
// ~140 px long, a person ~50 px tall and a road ~190 px wide.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds. */
export const STEP = 1 / 60;

/** The city grid: a road two lanes wide, a pavement each side, a block between. */
export const CITY = {
  roadW: 190,
  laneW: 95,
  sidewalkW: 50,
  blockW: 176,
  gridX: 14,
  gridY: 14,
  // How the block interior is subdivided into building plots (plots per side).
  plots: 2,
};

/** Derived once in city.js; CITY.spacing = blockW + 2*sidewalkW + roadW. */

export const CAR = {
  length: 140,
  width: 66,
  accel: 340,
  reverseAccel: 180,
  brake: 640,
  coastDecel: 90,
  maxSpeed: 275,
  maxReverse: 160,
  turnRate: 2.4,
  // Fraction of turnRate available at very low speed (steering needs speed).
  turnAtStandstill: 0.25,
  enterDistance: 92,
};

export const TRAFFIC = {
  count: 22,
  cruise: 190,
  maxSpeed: 260,
  accel: 220,
  brake: 420,
  // Distance ahead a driver begins to slow for the car in front.
  lookahead: 150,
  stopGap: 46,
  // Chance (per second, at an intersection) a car decides to turn.
  turnChance: 0.12,
};

export const PEDESTRIAN = {
  count: 26,
  speed: 78,
  pauseMin: 0.6,
  pauseMax: 2.4,
};

export const PLAYER = {
  speed: 185,
  radius: 16,
  maxHealth: 100,
  punchRange: 46,
  punchDamage: 24,
  punchCooldown: 0.38,
  shootRange: 300,
  shootDamage: 38,
  shootCooldown: 0.5,
};

export const POLICE = {
  maxCount: 6,
  accel: 430,
  maxSpeed: 290,
  brake: 520,
  turnRate: 3.2,
  // How far a chasing car keeps behind the target before backing off.
  followDistance: 170,
  ramDistance: 60,
};

export const WANTED = {
  maxStars: 5,
  // Seconds of no crime that cool one star.
  coolTime: 14,
  // Heat each crime adds; stars = ceil(heat).
  stealCar: 2,
  hitPedestrian: 1.5,
  hitPoliceCar: 3,
  hitCivilianCar: 0.6,
  shootPedestrian: 2.5,
};

export const MISSIONS = {
  // Seconds allowed per job.
  timeLimit: 75,
  payBase: 240,
};

export const SAVE_KEY = 'gta6-01.save';

export const PALETTE = {
  backdrop: '#0c0e12',
  road: '#2c2b2d',
  roadLine: '#e8e2c8',
  sidewalk: '#b9b0a0',
  park: '#4c7a3d',
  parkPath: '#8f8a74',
  buildingRoof: ['#6e6a66', '#7d7368', '#8a7f70', '#5f5a56', '#94887a', '#75695c'],
  buildingEdge: 'rgba(0,0,0,0.35)',
  parkingLot: '#353338',
  shadow: 'rgba(0,0,0,0.35)',
  player: '#3fd0ff',
  health: '#3fd06a',
  healthLow: '#e5534b',
  money: '#3fd06a',
  wanted: '#e8b93f',
  objective: '#e8e2c8',
  objectiveDim: '#8b93a3',
  minimapBg: 'rgba(8,10,14,0.88)',
  minimapBlock: '#2e333e',
  minimapRoad: '#c2ccdb',
  minimapBorder: '#7b8494',
  minimapPlayer: '#e8f3ff',
  minimapPolice: '#e5534b',
  minimapMission: '#e8b93f',
  panel: '#191c23',
  text: '#eef1f5',
  muted: '#8b93a3',
  hudHealthBg: 'rgba(0,0,0,0.45)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Colours the light bar cycles through for a police car. */
export const LIGHTBAR = { red: '#ff2a3c', blue: '#2a6cff' };
