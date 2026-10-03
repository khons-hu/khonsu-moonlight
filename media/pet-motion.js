'use strict';

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MoonlightMotion = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const MAX_SIZE = 1_000_000;
  const MAX_SPEED = 1_200;
  const MAX_DT = 0.04;
  const GROUND_BALL_Y = 12;
  const DEFAULT_PET_WIDTH = 130;
  const DEFAULT_PET_HEIGHT = 110;

  function number(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  function dimension(value) {
    return Math.max(1, Math.min(MAX_SIZE, number(value, 1)));
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function petBounds(state) {
    const spare = Math.max(0, (state.width - state.petWidth) / 2);
    const margin = Math.min(state.width / 2, state.petWidth / 2 + Math.min(8, spare));
    return { min: margin, max: Math.max(margin, state.width - margin) };
  }

  function setPetGeometry(state, geometry) {
    const requestedWidth = geometry && geometry.petWidth;
    const requestedHeight = geometry && geometry.petHeight;
    state.petWidth = Math.min(state.width, Math.max(1, number(requestedWidth, state.petWidth || DEFAULT_PET_WIDTH)));
    state.petHeight = Math.min(state.height, Math.max(1, number(requestedHeight, state.petHeight || DEFAULT_PET_HEIGHT)));
  }

  function ballBounds(state) {
    const min = Math.min(GROUND_BALL_Y, state.width / 2);
    return { min, max: Math.max(min, state.width - GROUND_BALL_Y) };
  }

  function clampPet(state) {
    const bounds = petBounds(state);
    state.pet.x = clamp(number(state.pet.x), bounds.min, bounds.max);
    state.pet.targetX = clamp(number(state.pet.targetX, state.pet.x), bounds.min, bounds.max);
    state.pet.y = clamp(number(state.pet.y), 0, Math.max(0, state.height - state.petHeight));
  }

  function clampBall(state) {
    const bounds = ballBounds(state);
    state.ball.x = clamp(number(state.ball.x, state.width / 2), bounds.min, bounds.max);
    state.ball.y = clamp(number(state.ball.y, GROUND_BALL_Y), GROUND_BALL_Y, Math.max(GROUND_BALL_Y, state.height - GROUND_BALL_Y));
  }

  function create(width, height, geometry) {
    const w = dimension(width);
    const h = dimension(height);
    const state = {
      width: w,
      height: h,
      petWidth: Math.min(w, DEFAULT_PET_WIDTH),
      petHeight: Math.min(h, DEFAULT_PET_HEIGHT),
      pet: { x: w / 2, y: 0, vx: 0, vy: 0, targetX: w / 2, held: false, resting: false },
      ball: { x: w * 0.78, y: GROUND_BALL_Y, vx: 0, vy: 0, held: false, moving: false },
      chasing: false
    };
    setPetGeometry(state, geometry);
    clampPet(state);
    clampBall(state);
    return state;
  }

  function resize(state, width, height, geometry) {
    state.width = dimension(width);
    state.height = dimension(height);
    setPetGeometry(state, geometry);
    clampPet(state);
    clampBall(state);
    return state;
  }

  function holdPet(state, x, y) {
    const bounds = petBounds(state);
    const maxY = Math.max(0, state.height - state.petHeight);
    state.pet.held = true;
    state.pet.vx = 0;
    state.pet.vy = 0;
    state.pet.x = clamp(number(x, state.pet.x), bounds.min, bounds.max);
    state.pet.targetX = state.pet.x;
    state.pet.y = clamp(number(y, state.pet.y), 0, maxY);
    state.pet.resting = false;
    state.chasing = false;
    return state;
  }

  function releasePet(state) {
    if (state.pet.held) {
      state.pet.held = false;
      // A small lift makes releasing at floor level feel like a soft spring.
      if (state.pet.y <= 0) state.pet.vy = 105;
    }
    return state;
  }

  function holdBall(state, x, y) {
    state.ball.held = true;
    state.ball.moving = false;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.chasing = false;
    state.ball.x = clamp(number(x, state.ball.x), ballBounds(state).min, ballBounds(state).max);
    state.ball.y = clamp(number(y, state.ball.y), GROUND_BALL_Y, Math.max(GROUND_BALL_Y, state.height - GROUND_BALL_Y));
    return state;
  }

  function throwBall(state, vx, vy) {
    const maxY = Math.max(GROUND_BALL_Y, state.height - GROUND_BALL_Y);
    if (state.ball.held) {
      const direction = number(vx) < 0 ? -1 : 1;
      state.ball.x = clamp(state.ball.x + direction * 12, ballBounds(state).min, ballBounds(state).max);
    }
    state.ball.held = false;
    state.ball.vx = clamp(number(vx), -MAX_SPEED, MAX_SPEED);
    state.ball.vy = clamp(number(vy), -MAX_SPEED, MAX_SPEED);
    state.ball.y = clamp(state.ball.y, GROUND_BALL_Y, maxY);
    state.ball.moving = true;
    state.chasing = true;
    state.pet.resting = false;
    return state;
  }

  function tossBall(state) {
    const bounds = ballBounds(state);
    const direction = state.pet.x > state.width * 0.7 ? -1 : 1;
    state.ball.x = clamp(state.pet.x + direction * Math.min(state.width * 0.3, 120), bounds.min, bounds.max);
    state.ball.y = GROUND_BALL_Y;
    return throwBall(state, direction * clamp(state.width * 1.4, 170, 330), 260);
  }

  function rest(state) {
    state.pet.held = false;
    state.pet.resting = true;
    state.pet.targetX = clamp(state.width * 0.22, petBounds(state).min, petBounds(state).max);
    state.ball.held = false;
    state.ball.moving = false;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.y = GROUND_BALL_Y;
    state.chasing = false;
    return state;
  }

  function wake(state) {
    state.pet.resting = false;
    state.pet.targetX = state.pet.x;
    return state;
  }

  function settle(state) {
    clampPet(state);
    clampBall(state);
    state.pet.held = false;
    state.pet.vx = 0;
    state.pet.vy = 0;
    state.pet.y = 0;
    state.pet.targetX = state.pet.x;
    state.ball.held = false;
    state.ball.moving = false;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.y = GROUND_BALL_Y;
    state.chasing = false;
    return state;
  }

  function step(state, dtSeconds) {
    const dt = clamp(number(dtSeconds), 0, MAX_DT);
    if (dt === 0) return isActive(state);

    const pet = state.pet;
    const ball = state.ball;
    if (ball.moving && !ball.held) stepBall(state, dt);

    if (state.chasing && !pet.held) pet.targetX = clamp(ball.x, petBounds(state).min, petBounds(state).max);
    if (!pet.held) stepPet(state, dt);

    const ballSettled = !ball.moving || (ball.y <= GROUND_BALL_Y + 18 && Math.abs(ball.vx) <= 55 && Math.abs(ball.vy) <= 70);
    const reach = state.petWidth / 2 + GROUND_BALL_Y;
    if (state.chasing && !pet.held && !ball.held && ballSettled && Math.abs(pet.x - ball.x) <= reach) {
      ball.x = clamp(ball.x, ballBounds(state).min, ballBounds(state).max);
      ball.y = GROUND_BALL_Y;
      ball.vx = 0;
      ball.vy = 0;
      ball.moving = false;
      state.chasing = false;
      pet.targetX = clamp(ball.x, petBounds(state).min, petBounds(state).max);
    }

    return isActive(state);
  }

  function stepPet(state, dt) {
    const pet = state.pet;
    const bounds = petBounds(state);
    const acceleration = (pet.targetX - pet.x) * 25 - pet.vx * 10;
    pet.vx = clamp(pet.vx + acceleration * dt, -MAX_SPEED, MAX_SPEED);
    pet.x = clamp(pet.x + pet.vx * dt, bounds.min, bounds.max);

    if (pet.y > 0 || pet.vy > 0) {
      pet.vy = clamp(pet.vy - 1_150 * dt, -MAX_SPEED, MAX_SPEED);
      pet.y += pet.vy * dt;
      const maxY = Math.max(0, state.height - state.petHeight);
      if (pet.y >= maxY) {
        pet.y = maxY;
        if (pet.vy > 0) pet.vy = 0;
      }
      if (pet.y <= 0) {
        pet.y = 0;
        pet.vy = pet.vy < 0 ? -pet.vy * 0.28 : 0;
        if (pet.vy < 24) pet.vy = 0;
      }
    }

    if (Math.abs(pet.targetX - pet.x) < 0.2 && Math.abs(pet.vx) < 1) {
      pet.x = pet.targetX;
      pet.vx = 0;
    }
    if (pet.y < 0.2 && Math.abs(pet.vy) < 1) {
      pet.y = 0;
      pet.vy = 0;
    }
  }

  function stepBall(state, dt) {
    const ball = state.ball;
    const bounds = ballBounds(state);
    ball.vy = clamp(ball.vy - 1_150 * dt, -MAX_SPEED, MAX_SPEED);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= bounds.min) {
      ball.x = bounds.min;
      ball.vx = Math.abs(ball.vx) * 0.68;
    } else if (ball.x >= bounds.max) {
      ball.x = bounds.max;
      ball.vx = -Math.abs(ball.vx) * 0.68;
    }
    const maxY = Math.max(GROUND_BALL_Y, state.height - GROUND_BALL_Y);
    if (ball.y >= maxY) {
      ball.y = maxY;
      ball.vy = -Math.abs(ball.vy) * 0.62;
    }
    if (ball.y <= GROUND_BALL_Y) {
      ball.y = GROUND_BALL_Y;
      ball.vy = Math.abs(ball.vy) * 0.52;
      ball.vx *= 0.82;
      if (ball.vy < 65) ball.vy = 0;
      if (Math.abs(ball.vx) < 9) ball.vx = 0;
      if (ball.vy === 0 && ball.vx === 0) ball.moving = false;
    }
  }

  function isActive(state) {
    const petMoving = !state.pet.held && (
      Math.abs(state.pet.targetX - state.pet.x) > 0.2
      || Math.abs(state.pet.vx) > 1
      || state.pet.y > 0.2
      || Math.abs(state.pet.vy) > 1
    );
    return Boolean(petMoving || state.ball.moving || state.chasing);
  }

  return Object.freeze({ create, resize, step, holdPet, releasePet, holdBall, throwBall, tossBall, rest, wake, settle });
});
