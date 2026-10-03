'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const motion = require('../media/pet-motion');

function advance(state, seconds, fps = 60) {
  const dt = 1 / fps;
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) motion.step(state, dt);
  return state;
}

function assertFiniteState(state) {
  for (const value of [state.width, state.height, state.pet.x, state.pet.y, state.pet.vx, state.pet.vy,
    state.pet.targetX, state.ball.x, state.ball.y, state.ball.vx, state.ball.vy]) {
    assert.ok(Number.isFinite(value), `expected a finite number, got ${value}`);
  }
}

function assertPetFits(state) {
  assert.ok(state.pet.x - state.petWidth / 2 >= -1e-6);
  assert.ok(state.pet.x + state.petWidth / 2 <= state.width + 1e-6);
  assert.ok(state.pet.y >= -1e-6);
  assert.ok(state.pet.y + state.petHeight <= state.height + 1e-6);
}

test('exports the same dependency-free API to Node and browser globals', () => {
  const browser = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../media/pet-motion'), 'utf8'), browser);
  assert.deepEqual(Object.keys(browser.MoonlightMotion).sort(), Object.keys(motion).sort());
  assert.equal(typeof browser.MoonlightMotion.create, 'function');
});

test('clamps huge frame steps and throw velocities while keeping all positions finite', () => {
  const state = motion.create(300, 180);
  motion.throwBall(state, 1e100, -1e100);
  motion.holdPet(state, -1e100, 1e100);
  motion.releasePet(state);
  for (let i = 0; i < 30; i++) motion.step(state, 1e100);
  assertFiniteState(state);
  assert.ok(Math.abs(state.ball.vx) <= 1_200);
  assert.ok(Math.abs(state.ball.vy) <= 1_200);
  assert.ok(state.pet.x >= Math.min(65, state.width * 0.28));
  assert.ok(state.pet.x <= state.width - Math.min(65, state.width * 0.28));
});

test('thrown ball bounces, chases and settles once caught', () => {
  const state = motion.create(300, 180);
  motion.throwBall(state, 0, 200);
  let leftGround = false;
  let caught = false;
  for (let i = 0; i < 600; i++) {
    const active = motion.step(state, 1 / 60);
    if (state.ball.y > 12) leftGround = true;
    if (!state.chasing && !state.ball.moving) caught = true;
    assertFiniteState(state);
    if (!active) break;
  }
  assert.equal(leftGround, true, 'gravity lifts the ball through a bounce');
  assert.equal(caught, true, 'the pet reaches the resting ball and stops the chase');
  assert.equal(state.ball.y, 12);
  assert.equal(motion.step(state, 1 / 60), false);
});

test('balls settling at either scene edge remain reachable and stop the chase', () => {
  for (const edge of ['left', 'right']) {
    const state = motion.create(300, 180);
    state.ball.x = edge === 'left' ? 12 : 288;
    state.ball.y = 12;
    state.ball.moving = false;
    state.chasing = true;
    let stopped = false;
    for (let i = 0; i < 600; i++) {
      const active = motion.step(state, 1 / 60);
      if (!state.chasing && !state.ball.moving && !active) { stopped = true; break; }
      assertFiniteState(state);
    }
    assert.equal(stopped, true, `${edge} ball catch should stop animation frames`);
    assert.equal(state.pet.targetX, state.pet.x, 'the caught target is reachable');
    assert.equal(motion.step(state, 1 / 60), false);
  }
});

test('released pet lands with a damped spring bounce and becomes inactive', () => {
  const state = motion.create(320, 200);
  motion.holdPet(state, 110, 70);
  motion.releasePet(state);
  let bounced = false;
  for (let i = 0; i < 600 && motion.step(state, 1 / 60); i++) {
    if (state.pet.y === 0 && state.pet.vy > 0) bounced = true;
    assertFiniteState(state);
  }
  assert.equal(bounced, true);
  assert.equal(state.pet.y, 0);
  assert.equal(state.pet.vy, 0);
  assert.equal(motion.step(state, 1 / 60), false);
});

test('resize to a narrow 150px scene clamps both actors and their targets', () => {
  const state = motion.create(500, 240);
  motion.holdPet(state, 480, 120);
  motion.holdBall(state, 490, 200);
  motion.resize(state, 150, 150);
  assert.equal(state.width, 150);
  assert.equal(state.height, 150);
  assert.ok(state.pet.x >= state.petWidth / 2 && state.pet.x <= 150 - state.petWidth / 2);
  assert.ok(state.pet.targetX >= state.petWidth / 2 && state.pet.targetX <= 150 - state.petWidth / 2);
  assert.ok(state.pet.y >= 0 && state.pet.y <= 40);
  assert.ok(state.ball.x >= 12 && state.ball.x <= 138);
  assert.ok(state.ball.y >= 12 && state.ball.y <= 138);
  assertPetFits(state);
  assertFiniteState(state);
});

test('measured art geometry clamps to scene size and bounds the full pet after dragging and resize', () => {
  const state = motion.create(320, 220, { petWidth: 190, petHeight: 164 });
  motion.holdPet(state, 500, 500);
  assertPetFits(state);
  motion.releasePet(state);
  advance(state, 1);
  assertPetFits(state);
  motion.resize(state, 150, 130, { petWidth: 190, petHeight: 164 });
  assert.equal(state.petWidth, 150);
  assert.equal(state.petHeight, 130);
  assertPetFits(state);
  for (let i = 0; i < 20; i++) {
    motion.step(state, 1 / 60);
    assertPetFits(state);
  }
});

test('shrinking height during a spring bounce keeps the pet inside the new scene', () => {
  const state = motion.create(320, 240);
  motion.holdPet(state, 150, 0);
  motion.releasePet(state);
  motion.step(state, 1 / 60);
  motion.resize(state, 150, 130);
  for (let i = 0; i < 30; i++) {
    motion.step(state, 1 / 60);
    assert.ok(state.pet.y <= 20);
    assertFiniteState(state);
  }
});

test('toss, rest, wake and settle have bounded deterministic state transitions', () => {
  const state = motion.create(300, 200);
  motion.tossBall(state);
  assert.equal(state.chasing, true);
  assert.equal(state.ball.moving, true);
  motion.holdPet(state, state.pet.x, state.pet.y);
  assert.equal(state.chasing, false, 'dragging the pet cancels its pursuit');
  motion.tossBall(state);
  motion.rest(state);
  assert.equal(state.pet.resting, true);
  assert.equal(state.ball.moving, false);
  assert.equal(state.chasing, false);
  advance(state, 2);
  assert.ok(Math.abs(state.pet.x - state.petWidth / 2 - 8) < 1);
  motion.wake(state);
  assert.equal(state.pet.resting, false);
  motion.throwBall(state, -500, 700);
  motion.holdPet(state, 250, 80);
  motion.settle(state);
  assert.equal(motion.step(state, 0.04), false);
  assert.equal(state.pet.held, false);
  assert.equal(state.ball.held, false);
  assert.equal(state.ball.moving, false);
  assert.equal(state.chasing, false);
  assert.deepEqual([state.pet.vx, state.pet.vy, state.ball.vx, state.ball.vy], [0, 0, 0, 0]);
  assertFiniteState(state);
});

test('fixed-frame simulations remain close across common refresh rates', () => {
  const results = [30, 60, 120].map(fps => {
    const state = motion.create(320, 200);
    motion.holdPet(state, 240, 0);
    motion.releasePet(state);
    state.pet.targetX = 90;
    advance(state, 1, fps);
    return state.pet.x;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 3, results.join(', '));
});
