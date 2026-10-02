'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DEFAULT_PET } = require('../src/pets');

function client({ storedState, reduced = false } = {}) {
  function target() {
    const events = new Map();
    return {
      addEventListener(type, callback) { const list = events.get(type) || []; list.push(callback); events.set(type, list); },
      emit(type, event = {}) { for (const callback of events.get(type) || []) callback(event); }
    };
  }
  function element(dataset = {}) {
    const capture = new Set();
    return Object.assign(target(), {
      dataset, attrs: {}, textContent: '', innerHTML: '', reflows: 0,
      setAttribute(key, value) { this.attrs[key] = value; },
      get offsetWidth() { this.reflows++; return 220; },
      setPointerCapture(id) { capture.add(id); },
      hasPointerCapture(id) { return capture.has(id); },
      releasePointerCapture(id) { capture.delete(id); this.emit('lostpointercapture', { pointerId: id }); }
    });
  }
  const elements = Object.fromEntries(['companion', 'scene', 'pet-art', 'pet-name', 'pet-status', 'motion', 'toy', 'customize'].map(id => [id, element()]));
  elements.companion.dataset.pet = JSON.stringify(DEFAULT_PET);
  elements.scene.dataset.mood = 'idle';
  const actions = Object.fromEntries(['pet', 'play', 'rest'].map(action => [action, element({ action })]));
  const media = Object.assign(target(), { matches: reduced });
  const document = Object.assign(target(), {
    body: element(), hidden: false,
    getElementById(id) { return elements[id]; },
    querySelectorAll() { return Object.values(actions); }
  });
  const window = Object.assign(target(), { matchMedia() { return media; } });
  const messages = [];
  let state = storedState;
  let nextTimer = 0;
  let now = 0;
  const timers = new Map();
  const vscode = { postMessage(value) { messages.push(value); }, getState() { return state; }, setState(value) { state = value; } };
  const sandbox = {
    acquireVsCodeApi: () => vscode, document, window,
    setTimeout(callback, delay) { timers.set(++nextTimer, { callback, deadline: now + delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../media/pets.js'), 'utf8'), sandbox);
  function send(mood = 'idle', interactionId = 0, visible = true, pet = DEFAULT_PET) {
    window.emit('message', { data: { type: 'state', pet, mood, interactionId, visible } });
  }
  function tick(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.deadline <= now) { timers.delete(id); timer.callback(); }
  }
  return { elements, actions, document, window, media, messages, timers, send, tick, state: () => state };
}

function pointer(client, type, overrides = {}) {
  client.elements['pet-art'].emit(type, { isPrimary: true, button: 0, pointerId: 7, clientX: 90, clientY: 90, ...overrides });
}
function interactionMessages(c) { return c.messages.filter(message => message.type === 'interact'); }

test('click-and-stroke pets once per gesture and ends cleanly when capture is lost', () => {
  const c = client(); c.send();
  pointer(c, 'pointerdown');
  c.send('happy', 1);
  assert.equal(c.timers.size, 0, 'Hold keeps petting without a timer loop');
  for (let x = 100; x < 200; x++) pointer(c, 'pointermove', { clientX: x });
  assert.equal(c.elements.scene.dataset.stroking, 'true');
  assert.equal(interactionMessages(c).length, 1);
  pointer(c, 'pointerup');
  c.elements['pet-art'].emit('click', { detail: 1 });
  assert.equal(interactionMessages(c).length, 1, 'No synthetic click duplicates the gesture');
  assert.equal(c.elements.scene.dataset.stroking, 'false');
  assert.equal(c.timers.size, 1);
  c.tick(1400);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
});

test('keyboard button activation and ball use the same host actions', () => {
  const c = client(); c.send();
  c.elements['pet-art'].emit('click', { detail: 0 });
  c.elements.toy.emit('click');
  assert.equal(interactionMessages(c).map(message => message.action).join(','), 'pet,play');
  assert.equal(c.elements['pet-art'].attrs['aria-label'], 'Pet Luna');
});

test('repeated actions restart one bounded reaction and ready refresh cannot replay it', () => {
  const c = client(); c.send();
  c.send('playful', 1);
  c.tick(1200);
  c.send('playful', 2);
  assert.equal(c.timers.size, 1);
  c.tick(1200);
  assert.equal(c.elements.scene.dataset.mood, 'playful');
  c.tick(1200);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  assert.match(c.elements['pet-status'].textContent, /caught the moon ball/);
  const reflows = c.elements['pet-art'].reflows;
  c.send('playful', 2);
  assert.equal(c.elements['pet-art'].reflows, reflows);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  assert.equal(c.timers.size, 0);
});

test('initial host refresh preserves sleep without replaying a historical action', () => {
  const c = client();
  c.send('playful', 24);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  assert.equal(c.timers.size, 0);
  const sleeping = client();
  sleeping.send('resting', 24);
  assert.equal(sleeping.elements.scene.dataset.mood, 'resting');
  assert.equal(sleeping.timers.size, 0);
  sleeping.elements['pet-art'].emit('click', { detail: 0 });
  sleeping.send('happy', 25);
  assert.equal(sleeping.elements.scene.dataset.mood, 'happy');
});

test('hidden host/document cancels capture and timers, then resumes without replay', () => {
  const c = client(); c.send();
  pointer(c, 'pointerdown'); c.send('happy', 1);
  pointer(c, 'pointermove', { clientX: 110 });
  c.send('happy', 1, false);
  assert.equal(c.document.body.dataset.visible, 'false');
  assert.equal(c.timers.size, 0);
  assert.equal(c.elements.scene.dataset.stroking, 'false');
  const count = interactionMessages(c).length;
  c.elements.toy.emit('click');
  assert.equal(interactionMessages(c).length, count);
  c.send('happy', 1, true);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  c.send('playful', 2);
  c.document.hidden = true; c.document.emit('visibilitychange');
  assert.equal(c.timers.size, 0);
  c.document.hidden = false; c.document.emit('visibilitychange');
  c.send('playful', 2);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
});

test('motion preference persists, and OS reduced motion always wins', () => {
  const c = client({ storedState: { existing: 'preserve', motionEnabled: false } }); c.send();
  assert.equal(c.document.body.dataset.motion, 'false');
  c.elements.motion.emit('click');
  assert.equal(c.document.body.dataset.motion, 'true');
  assert.equal(c.state().existing, 'preserve');
  assert.equal(c.state().motionEnabled, true);
  c.media.matches = true; c.media.emit('change');
  assert.equal(c.document.body.dataset.motion, 'false');
  assert.equal(c.elements.motion.disabled, true);
  assert.equal(c.elements.motion.textContent, 'Reduced motion');
  c.send('happy', 1);
  assert.match(c.elements['pet-status'].textContent, /head scratches/);
  c.media.matches = false; c.media.emit('change');
  assert.equal(c.document.body.dataset.motion, 'true');
});

test('non-primary gestures, cancellation and malformed host state stay bounded', () => {
  const c = client(); c.send();
  pointer(c, 'pointerdown', { isPrimary: false });
  pointer(c, 'pointerdown', { button: 2 });
  assert.equal(interactionMessages(c).length, 0);
  pointer(c, 'pointerdown'); c.send('happy', 1);
  pointer(c, 'pointercancel');
  assert.equal(c.elements.scene.dataset.stroking, 'false');
  c.tick(1400);
  c.send('playful', -1);
  c.send('playful', 3, true, { ...DEFAULT_PET, color: 'url(bad)' });
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  assert.equal(c.timers.size, 0);
  for (let id = 2; id <= 100; id++) c.send('happy', id);
  assert.equal(c.timers.size, 1, 'Rapid input never accumulates reaction timers');
  c.window.emit('pagehide');
  assert.equal(c.timers.size, 0);
});
