// Every tuning number and colour in one place. World units are pixels at zoom 1; the renderer
// scales a 1280x720 logical view, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const CITY = {
  blockSize: 176,
  roadWidth: 56,
  sidewalkWidth: 20,
  nx: 10,
  ny: 10,
};
/** A street strip (road + two sidewalks); block centres sit this far apart. */
export const STREET_WIDTH = CITY.roadWidth + 2 * CITY.sidewalkWidth;
/** Distance from a road centre line to the middle of a sidewalk lane. */
export const SIDEWALK_OFFSET = CITY.roadWidth / 2 + CITY.sidewalkWidth / 2;
/** Distance from a road centre line to the middle of a driving lane. */
export const LANE_OFFSET = CITY.roadWidth / 4;

export const PLAYER = {
  radius: 9,
  walkSpeed: 150,
  enterRange: 34,
};

export const VEHICLE = {
  length: 56,
  width: 25,
  maxSpeed: 300,
  accel: 260,
  brake: 520,
  coast: 90,
  reverseMax: 90,
  steer: 2.4,
  steerAtSpeed: 0.008,
};

export const TRAFFIC = {
  count: 26,
  cruise: 130,
  gap: 34,
  stopDistance: 60,
  yieldWait: 4,
};

export const PEDESTRIAN = {
  count: 40,
  speed: 46,
  scatterSpeed: 150,
  scatterRange: 90,
};

export const WANTED = {
  maxStars: 5,
  cooldownTime: 12,
  policeCount: 3,
  spawnDistance: 620,
  despawnDistance: 1500,
};

export const MISSION = {
  payout: 150,
  timeLimit: 90,
};

export const MONEY_START = 500;

export const ZOOM = {
  foot: 2.7,
  car: 2.5,
  min: 1.2,
  max: 3.2,
};

/** On-screen sizes: a person is about 50 px tall, a car about 140 px long at the camera zoom. */
export const SPRITE = {
  person: 20,
  player: 22,
};

export const HEALTH = {
  max: 100,
  regen: 4,
  hitBuilding: 3,
  rammed: 5,
};

/** Scale factor from car speed (px/s) to the speedometer's km/h. */
export const SPEED_KMH = 0.35;

export const PALETTE = {
  backdrop: '#0b0f14',
  roadEdge: '#3a3f47',
  curb: '#7a7f88',
  grass: '#4f7d3a',
  grassDark: '#3f6630',
  tree: '#3a6b2c',
  treeDark: '#2c5221',
  parkPath: '#c9bda4',
  parkingAsphalt: '#4a4f57',
  parkingLine: '#e8e8e0',
  buildingRoof: '#9aa1ab',
  buildingRoofDark: '#7c838d',
  buildingLine: '#5b616a',
  shadow: 'rgba(0,0,0,0.35)',
  window: '#31404f',
  hudPanel: 'rgba(10,14,20,0.82)',
  hudBorder: '#2a3442',
  text: '#eef1f5',
  muted: '#8b93a3',
  money: '#7ed47a',
  star: '#ffd54a',
  starOff: '#3a3f47',
  objective: '#ffd54a',
  marker: '#4fc3f7',
  markerPulse: 'rgba(79,195,247,0.35)',
  police: '#e5534b',
  policeBlue: '#3f7dff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'gta6-rec.save';
