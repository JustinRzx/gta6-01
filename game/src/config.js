// Every tuning number, colour and geometry constant in one place. The playfield
// is a fixed 1280x720 logical area scaled to the window; the world is larger and
// the camera follows the player. Sizes here are world pixels at zoom 1, so a car
// reads ~140px long and a person ~50px tall in a screenshot.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step in seconds. */
export const STEP = 1 / 60;

// ---- City geometry -------------------------------------------------------
// Roads are two lanes wide and run on a grid; blocks (buildings/parks/parking)
// sit between them. One "period" holds one block, two sidewalks and one road.
export const ROAD_W = 190; // total road width, two lanes
export const LANE_W = ROAD_W / 2;
export const ROAD_HALF = ROAD_W / 2;
export const WALK_W = 56; // sidewalk (pavement) width on each side of a road
export const BLOCK_W = 250; // block interior between the sidewalks
export const PERIOD = BLOCK_W + 2 * WALK_W + ROAD_W; // 552

// Grid: roads every PERIOD in both axes; blocks in between.
export const ROADS_X = 11; // number of vertical roads
export const ROADS_Y = 9; // number of horizontal roads
export const WORLD_W = (ROADS_X - 1) * PERIOD + ROAD_W;
export const WORLD_H = (ROADS_Y - 1) * PERIOD + ROAD_W;

// ---- Sprites (drawn sizes in world pixels) --------------------------------
export const CAR_LENGTH = 140;
export const PERSON_H = 50;

// ---- Player on foot -------------------------------------------------------
export const FOOT_SPEED = 175; // px/s
export const PLAYER_HEALTH = 100;

// ---- Driving --------------------------------------------------------------
export const CAR_MAX_SPEED = 560; // px/s top speed
export const CAR_ACCEL = 380; // px/s^2
export const CAR_BRAKE = 560; // px/s^2 when braking
export const CAR_REVERSE = 200; // px/s reverse cap
export const CAR_COAST = 0.55; // drag per second
export const CAR_STEER = 2.4; // rad/s at full speed
export const CAR_STEER_LOW = 1.0; // rad/s at low speed

// ---- Traffic --------------------------------------------------------------
export const TRAFFIC_CRUISE = 130; // px/s
export const TRAFFIC_FOLLOW = 150; // gap at which a car slows for the one ahead
export const TRAFFIC_STOP_GAP = 60; // hard stop gap
export const INTERSECTION_STOP = 200; // look-ahead for crossing traffic

// ---- Pedestrians ----------------------------------------------------------
export const PED_SPEED = 55; // px/s

// ---- Wanted & police ------------------------------------------------------
export const WANTED_MAX = 5;
export const POLICE_CRUISE = 240; // police chase top speed
export const COOL_SECONDS = 8; // evading this long drops a star

// ---- Missions -------------------------------------------------------------
export const MISSION_TIME = 75; // seconds per job
export const MISSION_PAY = 400; // dollars per completed job

// ---- Palette --------------------------------------------------------------
export const PALETTE = {
  backdrop: '#0c0f14',
  asphalt: '#3a3f46',
  roadMarking: '#e8d44a',
  roadEdge: '#c9ced4',
  sidewalk: '#c9b9a8',
  building: '#8b93a3',
  park: '#4f8a4a',
  parking: '#454b52',
  text: '#eef1f5',
  muted: '#9aa2ad',
  panel: 'rgba(14, 18, 26, 0.86)',
  gold: '#f2c94c',
  health: '#e5534b',
  healthBg: '#3a1f1f',
  money: '#7ee081',
  wanted: '#ffd23f',
  speed: '#7fd4ff',
  shadow: 'rgba(0, 0, 0, 0.32)',
  policeLight: '#ff2d3f',
  policeLight2: '#2d6bff',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where progress is kept between visits (this browser only). */
export const SAVE_KEY = 'gta6-01.save';
