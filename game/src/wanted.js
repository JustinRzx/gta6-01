// The wanted level: crimes raise it, time without being caught cools it down.
// The level is a float of "heat"; stars = ceil(heat), so three-to-five lit
// stars in the HUD is just the same heat rendered as stars.

import { WANTED } from './config.js';

export function createWanted() {
  const state = {
    heat: 0,
    stars: 0,
    cooldown: 0,
    // How long the current heat has gone without a fresh crime.
  };

  function sync() {
    state.stars = Math.min(WANTED.maxStars, Math.max(0, Math.ceil(state.heat)));
    if (state.heat <= 0) {
      state.heat = 0;
      state.stars = 0;
      state.cooldown = 0;
    }
  }

  function addHeat(amount) {
    if (amount <= 0) return;
    state.heat += amount;
    state.cooldown = 0;
    sync();
  }

  function cool(dt) {
    if (state.heat <= 0) return;
    state.cooldown += dt;
    while (state.cooldown >= WANTED.coolTime && state.heat > 0) {
      state.cooldown -= WANTED.coolTime;
      state.heat -= 1;
    }
    sync();
  }

  function steal(car) {
    if (!car.owned) addHeat(WANTED.stealCar);
  }
  function hitPedestrian() {
    addHeat(WANTED.hitPedestrian);
  }
  function hitPoliceCar() {
    addHeat(WANTED.hitPoliceCar);
  }
  function hitCivilianCar() {
    addHeat(WANTED.hitCivilianCar);
  }
  function shootPerson() {
    addHeat(WANTED.shootPedestrian);
  }

  function set(stars) {
    state.heat = Math.max(0, Math.min(WANTED.maxStars, stars));
    state.cooldown = 0;
    sync();
  }

  return { state, addHeat, cool, steal, hitPedestrian, hitPoliceCar, hitCivilianCar, shootPerson, set, sync };
}
