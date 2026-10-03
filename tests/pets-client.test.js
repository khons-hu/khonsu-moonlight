'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DEFAULT_PET, PET_SPECIES } = require('../src/pets');
const motion = require('../media/pet-motion');

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
    const nodes = new Map();
    return Object.assign(target(), {
      dataset, attrs: {}, style: {}, textContent: '', innerHTML: '',
      rect: { left: 0, top: 0, width: 320, height: 220, bottom: 220 },
      setAttribute(key, value) { this.attrs[key] = value; },
      getBoundingClientRect() { return this.rect; },
      querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { setAttribute(key, value) { this[key] = value; } }); return nodes.get(selector); },
      setPointerCapture(id) { capture.add(id); },
      hasPointerCapture(id) { return capture.has(id); },
      releasePointerCapture(id) { capture.delete(id); this.emit('lostpointercapture', { pointerId: id }); }
    });
  }
  const elements = Object.fromEntries(['companion', 'scene', 'pet-art', 'pet-position', 'pet-name', 'pet-status', 'motion', 'toy', 'nap-pad', 'customize'].map(id => [id, element()]));
  elements['pet-art'].rect = { left: 70, top: 53, width: 180, height: 155, bottom: 208 };
  elements.companion.dataset.pet = JSON.stringify(DEFAULT_PET);
  elements.scene.dataset.mood = 'idle';
  const media = Object.assign(target(), { matches: reduced });
  const document = Object.assign(target(), { body: element(), hidden: false, getElementById(id) { return elements[id]; } });
  const window = Object.assign(target(), { matchMedia: () => media, MoonlightMotion: motion });
  const messages = [];
  let state = storedState, nextId = 0, now = 0, resize;
  const timers = new Map(), frames = new Map();
  const sandbox = {
    acquireVsCodeApi: () => ({ postMessage: value => messages.push(value), getState: () => state, setState: value => { state = value; } }), document, window,
    performance: { now: () => now },
    setTimeout(callback, delay) { timers.set(++nextId, { callback, deadline: now + delay }); return nextId; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() { resize = () => {}; } }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../media/pets.js'), 'utf8'), sandbox);
  function send(mood = 'idle', interactionId = 0, visible = true, pet = DEFAULT_PET) {
    window.emit('message', { data: { type: 'state', pet, mood, interactionId, visible } });
  }
  function tick(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 1000 / 60);
      for (const [id, timer] of [...timers]) if (timer.deadline <= now) { timers.delete(id); timer.callback(); }
      for (const [id, callback] of [...frames]) { frames.delete(id); callback(now); }
    }
  }
  return { elements, document, window, media, messages, timers, frames, send, tick, resize: () => resize(), state: () => state };
}
function pointer(c, type, overrides = {}, id = 'pet-art') {
  c.elements[id].emit(type, { isPrimary: true, button: 0, pointerId: 7, clientX: 160, clientY: 130, preventDefault() {}, ...overrides });
}
function actions(c) { return c.messages.filter(message => message.type === 'interact').map(message => message.action); }
function xy(element) { return [...element.style.transform.matchAll(/(-?[\d.]+)px/g)].map(match => Number(match[1])); }

test('petting responds immediately, small strokes lean and host acknowledgements do not replay', () => {
  const c = client(); c.send();
  pointer(c, 'pointerdown');
  assert.equal(c.elements.scene.dataset.mood, 'happy', 'No round trip needed');
  assert.equal(c.timers.size, 0);
  pointer(c, 'pointermove', { clientX: 180 }); c.tick(80);
  assert.equal(c.elements.scene.dataset.stroking, 'true');
  assert.notEqual(c.elements['pet-art'].querySelector('.pet-body').transform, 'rotate(0.00 110 150)');
  c.send('happy', 1);
  assert.equal(c.elements.scene.dataset.stroking, 'true');
  pointer(c, 'pointerup'); c.elements['pet-art'].emit('click', { detail: 1 });
  assert.deepEqual(actions(c), ['pet']);
  c.tick(1450);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  c.send('happy', 1);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
});

test('dragging carries the pet and release lands smoothly inside the scene', () => {
  const c = client(); c.send();
  const start = xy(c.elements['pet-position']);
  pointer(c, 'pointerdown'); pointer(c, 'pointermove', { clientX: 215, clientY: 80 });
  const held = xy(c.elements['pet-position']);
  assert.ok(held[0] > start[0] && held[1] < start[1]);
  assert.equal(c.elements.scene.dataset.held, 'pet');
  pointer(c, 'pointerup'); c.tick(3000);
  assert.equal(xy(c.elements['pet-position'])[1], 0);
  assert.equal(c.frames.size, 0);
  assert.equal(c.elements.scene.dataset.held, 'none');
  assert.equal(c.elements['pet-status'].textContent, 'Luna is ready for more.');
});

test('ball flick follows the gesture, bounces, gets chased and sends one action', () => {
  const c = client(); c.send();
  pointer(c, 'pointerdown', { clientX: 250, clientY: 196 }, 'toy'); c.tick(16);
  pointer(c, 'pointermove', { clientX: 195, clientY: 142 }, 'toy');
  const releasePosition = xy(c.elements.toy);
  pointer(c, 'pointerup', {}, 'toy'); c.elements.toy.emit('click', { detail: 1 });
  assert.deepEqual(actions(c), ['play']);
  c.tick(80);
  assert.notDeepEqual(xy(c.elements.toy), releasePosition);
  c.send('playful', 1); c.tick(12000);
  assert.equal(c.frames.size, 0, 'The animation loop stops after catching');
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  assert.match(c.elements['pet-status'].textContent, /caught it/);
});

test('in-scene objects support keyboard activation and sleep wakes directly', () => {
  const c = client(); c.send();
  c.elements['pet-art'].emit('click', { detail: 0 });
  c.elements.toy.emit('click', { detail: 0 });
  c.elements['nap-pad'].emit('click', { detail: 0 });
  assert.deepEqual(actions(c), ['pet', 'play', 'rest']);
  assert.equal(c.elements.scene.dataset.mood, 'resting');
  c.send('happy', 1); c.send('playful', 2); c.send('resting', 3);
  assert.equal(c.elements.scene.dataset.mood, 'resting', 'Late acknowledgements cannot replace the latest action');
  c.elements['pet-art'].emit('click', { detail: 0 });
  assert.equal(c.elements.scene.dataset.mood, 'happy');
});

test('all seven companions keep original artwork and direct gestures', () => {
  for (const species of PET_SPECIES) {
    const c = client(); c.send('idle', 0, true, { ...DEFAULT_PET, species });
    assert.match(c.elements['pet-art'].innerHTML, /class="pet-body"/);
    assert.match(c.elements['pet-art'].innerHTML, /class="pet-gaze"/);
    assert.equal(c.elements['pet-art'].attrs['aria-label'], 'Pet Luna');
    pointer(c, 'pointerdown'); pointer(c, 'pointerup');
    assert.equal(c.elements.scene.dataset.mood, 'happy');
  }
});

test('hidden views cancel capture, timers and frames without replay on return', () => {
  const c = client(); c.send();
  pointer(c, 'pointerdown'); pointer(c, 'pointermove', { clientY: 70 });
  c.send('happy', 1, false);
  assert.equal(c.frames.size, 0); assert.equal(c.timers.size, 0);
  assert.equal(c.elements['pet-art'].hasPointerCapture(7), false);
  const before = actions(c).length; c.elements.toy.emit('click'); assert.equal(actions(c).length, before);
  c.send('happy', 1, true); c.tick(1500);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
  c.elements.toy.emit('click'); c.document.hidden = true; c.document.emit('visibilitychange');
  assert.equal(c.frames.size, 0); assert.equal(c.timers.size, 0);
  c.document.hidden = false; c.document.emit('visibilitychange');
  c.send('playful', 2); assert.equal(c.elements.scene.dataset.mood, 'idle');
});

test('motion preferences stop physics and OS reduced motion keeps direct actions usable', () => {
  const c = client({ storedState: { existing: 'keep', motionEnabled: false } }); c.send();
  c.elements.toy.emit('click'); assert.equal(c.frames.size, 0);
  c.elements.motion.emit('click'); assert.equal(c.state().existing, 'keep');
  c.elements.toy.emit('click'); assert.equal(c.frames.size, 1);
  c.media.matches = true; c.media.emit('change');
  assert.equal(c.frames.size, 0); assert.equal(c.elements.motion.disabled, true);
  pointer(c, 'pointerdown'); pointer(c, 'pointermove', { clientY: 70 }); pointer(c, 'pointerup');
  assert.equal(c.frames.size, 0); assert.equal(c.elements.scene.dataset.mood, 'happy');
});

test('cancel, blur, pagehide and resize never leave a captured pointer or active loop', () => {
  for (const end of ['pointercancel', 'lostpointercapture', 'blur', 'pagehide', 'resize']) {
    const c = client(); c.send(); pointer(c, 'pointerdown'); pointer(c, 'pointermove', { clientY: 70 });
    if (end === 'resize') { c.elements.scene.rect.width = 150; c.resize(); }
    else if (end === 'blur' || end === 'pagehide') c.window.emit(end);
    else pointer(c, end);
    c.tick(2500);
    assert.equal(c.elements['pet-art'].hasPointerCapture(7), false, end);
    assert.equal(c.frames.size, 0, end);
    assert.equal(c.timers.size, 0, end);
    assert.doesNotMatch(c.elements['pet-status'].textContent, /You've got/);
  }
});

test('non-primary input and malformed host states cannot replace the companion', () => {
  const c = client(); c.send();
  const art = c.elements['pet-art'].innerHTML;
  pointer(c, 'pointerdown', { isPrimary: false }); pointer(c, 'pointerdown', { button: 2 });
  assert.equal(actions(c).length, 0);
  c.send('playful', -1); c.send('happy', 1, true, { ...DEFAULT_PET, color: 'url(bad)' });
  c.send('happy', 1, true, { ...DEFAULT_PET, species: 'unknown' });
  assert.equal(c.elements['pet-art'].innerHTML, art);
  assert.equal(c.elements.scene.dataset.mood, 'idle');
});

test('rapid gestures schedule at most one frame and one reaction timer', () => {
  const c = client(); c.send();
  for (let id = 1; id <= 100; id++) { c.elements['pet-art'].emit('click', { detail: 0 }); c.send('happy', id); }
  assert.equal(c.frames.size, 1); assert.equal(c.timers.size, 1);
  c.tick(2000); assert.equal(c.frames.size, 0); assert.equal(c.timers.size, 0);
});


test('acknowledgements do not release a direct drag with reduced motion enabled', () => {
  const c = client({ reduced: true }); c.send();
  pointer(c, 'pointerdown'); c.send('happy', 1);
  assert.equal(c.elements['pet-art'].hasPointerCapture(7), true);
  pointer(c, 'pointermove', { clientY: 70 });
  assert.equal(c.elements.scene.dataset.held, 'pet');
  pointer(c, 'pointerup');
  assert.equal(c.frames.size, 0);
});

test('resize and disabling motion finish interrupted play instead of claiming a chase', () => {
  for (const reason of ['resize', 'motion']) {
    const c = client(); c.send(); c.elements.toy.emit('click'); c.send('playful', 1);
    if (reason === 'resize') c.resize(); else c.elements.motion.emit('click');
    c.tick(2000);
    assert.equal(c.elements.scene.dataset.mood, 'idle', reason);
    assert.doesNotMatch(c.elements['pet-status'].textContent, /chasing/, reason);
    assert.equal(c.frames.size, 0, reason);
  }
});

test('the resting ball centre matches pointer coordinates above the same floor', () => {
  const c = client(); c.send();
  assert.equal(xy(c.elements.toy)[1], -12, 'The ball radius is applied by its element box, not twice');
});
