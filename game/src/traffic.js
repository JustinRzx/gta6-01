// Traffic that actually drives: cars cruise the lanes both ways, slow for the
// car ahead instead of passing through it, and stop at an intersection while a
// car is crossing. They are locked to their lane, so they never mount a pavement
// or clip a building. Lanes are the two halves of each road in the city grid.
import { INTERSECTION_STOP, LANE_W, PERIOD, ROAD_HALF, ROAD_W, TRAFFIC_CRUISE, TRAFFIC_FOLLOW, TRAFFIC_STOP_GAP, WORLD_H, WORLD_W } from './config.js';
import { ROLE_POLICE, ROLE_PLAYER, ROLE_TRAFFIC, makeCar } from './vehicles.js';

export function laneY(roadY, i, dir) {
  return roadY(i) + dir * (LANE_W / 2);
}
export function laneX(roadX, j, dir) {
  return roadX(j) - dir * (LANE_W / 2);
}

export function placeOnLane(car, city, axis, road, dir, s) {
  car.lane = { axis, road, dir };
  if (axis === 'h') {
    car.x = s;
    car.y = laneY(city.roadY, road, dir);
    car.angle = dir > 0 ? 0 : Math.PI;
  } else {
    car.x = laneX(city.roadX, road, dir);
    car.y = s;
    car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}

function carS(car) {
  return car.lane.axis === 'h' ? car.x : car.y;
}

/** The nearest car on the same lane ahead, with the gap to it (or null). */
function findCarAhead(game, car) {
  const s = carS(car);
  let best = null;
  let bestGap = Infinity;
  for (const other of game.cars) {
    if (other === car || !other.lane) continue;
    if (other.role !== ROLE_TRAFFIC && other.role !== ROLE_POLICE && other.role !== ROLE_PLAYER) continue;
    if (other.lane.axis !== car.lane.axis || other.lane.road !== car.lane.road || other.lane.dir !== car.lane.dir) continue;
    const gap = (carS(other) - s) * car.lane.dir;
    if (gap > 0 && gap < bestGap) {
      bestGap = gap;
      best = other;
    }
  }
  return best ? { car: best, dist: bestGap } : null;
}

/** The centre of the next intersection ahead along the car's lane, or null. */
function nextIntersection(city, car) {
  if (car.lane.axis === 'h') {
    const rel = car.x - ROAD_HALF;
    const k = car.lane.dir > 0 ? Math.ceil(rel / PERIOD) : Math.floor(rel / PERIOD);
    const ix = ROAD_HALF + k * PERIOD;
    const dist = (ix - car.x) * car.lane.dir;
    if (dist < 0) return null;
    return { x: ix, y: car.y, dist };
  }
  const rel = car.y - ROAD_HALF;
  const k = car.lane.dir > 0 ? Math.ceil(rel / PERIOD) : Math.floor(rel / PERIOD);
  const iy = ROAD_HALF + k * PERIOD;
  const dist = (iy - car.y) * car.lane.dir;
  if (dist < 0) return null;
  return { x: car.x, y: iy, dist };
}

function intersectionBlocked(game, car, inter) {
  for (const other of game.cars) {
    if (other === car || !other.lane) continue;
    if (other.role !== ROLE_TRAFFIC && other.role !== ROLE_POLICE && other.role !== ROLE_PLAYER) continue;
    if (other.lane.axis === car.lane.axis) continue;
    if (Math.abs(other.x - inter.x) < ROAD_HALF + 6 && Math.abs(other.y - inter.y) < ROAD_HALF + 6) return true;
  }
  return false;
}

export function updateTrafficCar(game, car, dt) {
  const city = game.city;
  if (!car.lane) return;

  let target = car.cruise;
  const ahead = findCarAhead(game, car);
  if (ahead) {
    if (ahead.dist < TRAFFIC_STOP_GAP) target = 0;
    else if (ahead.dist < TRAFFIC_FOLLOW) target = Math.min(target, Math.max(0, ahead.car.speed));
  }

  const inter = nextIntersection(city, car);
  if (inter && inter.dist < INTERSECTION_STOP && intersectionBlocked(game, car, inter)) {
    if (inter.dist < ROAD_HALF + 12) target = 0;
    else target = Math.min(target, 40);
  }

  const rate = target < car.speed ? 6 : 2.5;
  car.speed += (target - car.speed) * Math.min(1, dt * rate);
  if (car.speed < 0) car.speed = 0;

  const step = car.speed * dt;
  if (car.lane.axis === 'h') {
    car.x += car.lane.dir * step;
    car.y = laneY(city.roadY, car.lane.road, car.lane.dir);
    if (car.x > WORLD_W + 90) car.x = -90;
    else if (car.x < -90) car.x = WORLD_W + 90;
  } else {
    car.y += car.lane.dir * step;
    car.x = laneX(city.roadX, car.lane.road, car.lane.dir);
    if (car.y > WORLD_H + 90) car.y = -90;
    else if (car.y < -90) car.y = WORLD_H + 90;
  }
}

export function spawnTraffic(game, count) {
  const city = game.city;
  for (let k = 0; k < count; k += 1) {
    const axis = game.random() < 0.5 ? 'h' : 'v';
    const roads = axis === 'h' ? city.rows + 1 : city.cols + 1;
    const road = Math.floor(game.random() * roads);
    const dir = game.random() < 0.5 ? 1 : -1;
    const length = axis === 'h' ? WORLD_W : WORLD_H;
    const s = game.random() * length;
    const car = makeCar(game.assets.images, game.random() < 0.12 ? 'police' : 'sedan', 0, 0, 0, ROLE_TRAFFIC);
    placeOnLane(car, city, axis, road, dir, s);
    car.cruise = TRAFFIC_CRUISE * (0.8 + game.random() * 0.5);
    car.speed = car.cruise;
    game.cars.push(car);
  }
}

/** Stage one traffic car exactly on a lane, with a small random speed. */
export function stageTrafficCar(game, axis, road, dir, s, cruise) {
  const city = game.city;
  const car = makeCar(game.assets.images, 'sedan', 0, 0, 0, ROLE_TRAFFIC);
  placeOnLane(car, city, axis, road, dir, s);
  car.cruise = cruise ?? TRAFFIC_CRUISE;
  car.speed = car.cruise;
  game.cars.push(car);
  return car;
}
