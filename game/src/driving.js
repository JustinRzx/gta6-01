// Driving the player's car: steering depends on speed, the car coasts and brakes,
// and it stops dead against a building (or a park). Getting out is handled by the
// vehicles module; this is just the physics of being behind the wheel.
import { CAR_ACCEL, CAR_BRAKE, CAR_COAST, CAR_MAX_SPEED, CAR_REVERSE, CAR_STEER, CAR_STEER_LOW } from './config.js';

export function updateCar(game, move, dt) {
  const car = game.car;
  const city = game.city;
  const steer = move.x;
  const throttle = move.y < 0;
  const brake = move.y > 0;

  const ratio = Math.min(1, Math.abs(car.speed) / CAR_MAX_SPEED);
  const steerRate = CAR_STEER_LOW + (CAR_STEER - CAR_STEER_LOW) * ratio;
  car.angle += steer * steerRate * dt;

  if (throttle) car.speed += CAR_ACCEL * dt;
  if (brake) {
    if (car.speed > 0) car.speed -= CAR_BRAKE * dt;
    else car.speed -= CAR_REVERSE * dt;
  }
  if (!throttle && !brake) car.speed *= Math.max(0, 1 - CAR_COAST * dt);
  car.speed = Math.max(-CAR_REVERSE, Math.min(CAR_MAX_SPEED, car.speed));

  const hx = Math.cos(car.angle);
  const hy = Math.sin(car.angle);
  const nx = car.x + hx * car.speed * dt;
  const ny = car.y + hy * car.speed * dt;

  if (collidesCar(city, nx, ny, car)) {
    car.speed = 0;
  } else {
    car.x = nx;
    car.y = ny;
  }
}

function collidesCar(city, x, y, car) {
  const hx = Math.cos(car.angle);
  const hy = Math.sin(car.angle);
  const px = -hy;
  const py = hx;
  const half = car.length / 2;
  const side = car.width / 2;
  const points = [
    [hx * half, hy * half],
    [-hx * half, -hy * half],
    [px * side, py * side],
    [-px * side, -py * side],
    [0, 0],
  ];
  for (const [ox, oy] of points) {
    if (city.blocksCar(x + ox, y + oy)) return true;
  }
  return false;
}
