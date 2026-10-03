(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const main = document.getElementById('companion');
  const scene = document.getElementById('scene');
  const art = document.getElementById('pet-art');
  const name = document.getElementById('pet-name');
  const status = document.getElementById('pet-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const species = ['cat', 'fox', 'robot', 'penguin', 'labrador', 'sam', 'tibo'];
  const moods = ['idle', 'happy', 'playful', 'resting'];
  const motionButton = document.getElementById('motion');
  let currentPet;
  let lastInteractionId;
  let hasHostState = false;
  let hostVisible = true;
  let reactionTimer;
  let motionEnabled = vscode.getState()?.motionEnabled !== false;

  // All artwork is original, fixed local SVG markup. Only a validated hex color is interpolated.
  const eyes = `<g class="pet-gaze"><g class="eye-open" fill="#0b111a"><ellipse cx="90" cy="100" rx="4" ry="6"/><ellipse cx="130" cy="100" rx="4" ry="6"/><circle cx="91" cy="98" r="1.3" fill="#fff"/><circle cx="131" cy="98" r="1.3" fill="#fff"/></g><g class="eye-sleep" fill="none" stroke="#0b111a" stroke-width="3.5" stroke-linecap="round"><path d="M84 100q6 5 12 0M124 100q6 5 12 0"/></g></g>`;
  const frame = body => `<svg viewBox="0 0 220 190" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><ellipse cx="110" cy="177" rx="67" ry="7" fill="#070e19" opacity=".6"/><g class="pet-body">${body}</g></svg>`;
  function petSvg(pet) {
    const color = pet.color;
    if (pet.species === 'penguin') return frame(`
      <g class="pet-flippers">
        <path d="M76 113q-22 12-30 39q-3 10 7 13q15 1 31-29" fill="#27344a" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
        <path d="M144 113q22 12 30 39q3 10-7 13q-15 1-31-29" fill="#27344a" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
      </g>
      <path d="M69 137q-1-44 41-45q42 1 41 45v32q0 8-9 8H78q-9 0-9-8z" fill="#26334a" stroke="#0b111a" stroke-width="3"/>
      <ellipse cx="110" cy="145" rx="29" ry="39" fill="#edf3ff"/>
      <ellipse cx="110" cy="79" rx="48" ry="45" fill="#26334a" stroke="#0b111a" stroke-width="3"/>
      <ellipse cx="110" cy="87" rx="36" ry="37" fill="#edf3ff"/>
      ${eyes}<path d="m100 91 10 12 10-12q-10-5-20 0z" fill="#f59b38" stroke="#0b111a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M82 116q28 11 56 0l-2 9q-26 11-52 0z" fill="${color}" stroke="#0b111a" stroke-width="2.5" stroke-linejoin="round"/><path d="m133 122 10 7-10 5-4-6z" fill="${color}" stroke="#0b111a" stroke-width="2" stroke-linejoin="round"/>
      <path d="M80 167q-13 0-18 8q2 7 34 5l5-9zM140 167q13 0 18 8q-2 7-34 5l-5-9z" fill="#f59b38" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
      <path d="M89 177v5m8-5v5m26-5v5m8-5v5" stroke="#0b111a" stroke-width="2" stroke-linecap="round"/>`);
    if (pet.species === 'labrador') return frame(`
      <g class="pet-tail"><path d="M143 151q44 2 36-27q-4-13-15-8" fill="none" stroke="#0b111a" stroke-width="18" stroke-linecap="round"/><path d="M143 151q44 2 36-27q-4-13-15-8" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/></g>
      <path d="M74 160q3-44 36-44q34 0 37 44v15H73z" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="M97 127q13 11 26 0l9 48H88z" fill="#f1d29a" opacity=".8"/>
      <path d="M76 65q-20-18-27 9q-7 30 20 49q13-3 17-25zM144 65q20-18 27 9q7 30-20 49q-13-3-17-25z" fill="#c99247" stroke="#0b111a" stroke-width="3"/>
      <path d="M62 84q0-39 48-40q48 1 48 40v20q-4 37-48 38q-44-1-48-38z" fill="${color}" stroke="#0b111a" stroke-width="3"/>
      ${eyes}<ellipse cx="110" cy="119" rx="30" ry="20" fill="#f1d29a"/><ellipse cx="110" cy="112" rx="8" ry="6" fill="#0b111a"/><path d="M110 118q0 11-10 11m10-11q0 11 10 11" fill="none" stroke="#0b111a" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="79" y="162" width="27" height="14" rx="7" fill="${color}"/><rect x="114" y="162" width="27" height="14" rx="7" fill="${color}"/>`);
    if (pet.species === 'sam' || pet.species === 'tibo') {
      const isTibo = pet.species === 'tibo';
      const hair = isTibo
        ? '<path d="M61 84q-5-44 40-48q48-4 58 32l-8 21q-7-22-20-29q-24 18-69 15z" fill="#27212b" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>'
        : '<path d="M62 83q-5-42 38-47q35-5 54 15q-12 0-22 8q-24-9-48 8l-9 24z" fill="#29242a" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>';
      const accessory = isTibo ? ''
        : '<g class="pet-goggles"><path d="M66 68q22-12 43-7m2 0q22-5 43 7" fill="none" stroke="#b8a6ff" stroke-width="4" stroke-linecap="round"/><rect x="83" y="59" width="23" height="15" rx="6" fill="#99c7ff" stroke="#0b111a" stroke-width="2.5"/><rect x="114" y="59" width="23" height="15" rx="6" fill="#99c7ff" stroke="#0b111a" stroke-width="2.5"/><path d="M106 65h8" stroke="#0b111a" stroke-width="2.5"/></g>';
      const shirt = isTibo ? '#292b31' : color;
      const clothing = isTibo
        ? '<path d="M96 118q14 7 28 0l8 59H88z" fill="#34363d"/><path d="M99 118q11 7 22 0" fill="none" stroke="#99c7ff" stroke-width="3" stroke-linecap="round"/>'
        : '<path d="M89 123l21 19 21-19l9 54H80z" fill="#edf3ff"/><path d="m102 135 8 9 8-9-8 22z" fill="#b8a6ff"/>';
      const smile = isTibo
        ? '<path d="M97 106q13 13 26 0q-2 11-13 11q-11 0-13-11z" fill="#fff4e8" stroke="#0b111a" stroke-width="2" stroke-linejoin="round"/>'
        : '<path d="M104 108q6 4 12 0" fill="none" stroke="#0b111a" stroke-width="2.5" stroke-linecap="round"/>';
      const stubble = isTibo
        ? '<g fill="#55484a" opacity=".62"><circle cx="83" cy="116" r="1.2"/><circle cx="89" cy="122" r="1"/><circle cx="96" cy="126" r="1.2"/><circle cx="103" cy="129" r="1"/><circle cx="117" cy="129" r="1"/><circle cx="124" cy="126" r="1.2"/><circle cx="131" cy="122" r="1"/><circle cx="137" cy="116" r="1.2"/><circle cx="90" cy="129" r="1"/><circle cx="130" cy="129" r="1"/></g>'
        : '';
      return frame(`
        <path d="M74 145q3-30 36-30q34 0 37 30v32H73z" fill="${shirt}" stroke="#0b111a" stroke-width="3"/>
        ${clothing}
        <path d="M74 145q-12 11-10 26q4 7 14 2l12-24M146 145q12 11 10 26q-4 7-14 2l-12-24" fill="${color}" stroke="#0b111a" stroke-width="3" stroke-linecap="round"/>
        <path d="M86 176h17m21 0h17" stroke="#26334a" stroke-width="8" stroke-linecap="round"/><path d="M86 180h17m21 0h17" stroke="#edf3ff" stroke-width="3" stroke-linecap="round"/>
        <path d="M66 76q0-34 44-34q44 0 44 34v20q0 34-44 37q-44-3-44-37z" fill="#e6b98a" stroke="#0b111a" stroke-width="3"/>
        ${hair}${accessory}${eyes}<path d="M81 91q8-5 16 0m26 0q8-5 16 0" fill="none" stroke="#332b31" stroke-width="3" stroke-linecap="round"/>${smile}${stubble}`);
    }
    if (pet.species === 'fox') return frame(`
      <g class="pet-tail"><path d="M142 150q46-59 57-16q7 37-52 39" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="M180 136q20-10 17 12q-3 18-24 21" fill="#edf3ff"/></g>
      <path d="M73 162q4-48 37-47q38 0 40 47v12H72z" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="m88 132 22 31 22-31-22-10z" fill="#edf3ff"/>
      <path d="M60 81 63 40 90 64q20-11 40 0l27-24 3 41q10 24-50 49q-60-25-50-49z" fill="${color}" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
      <path d="m69 54 2 29 16-13M151 54l-2 29-16-13" fill="#b8a6ff"/><path d="M62 96q21-7 48 20q27-27 48-20q-14 23-48 34q-34-11-48-34z" fill="#edf3ff"/>
      ${eyes}<path d="m105 111 5 5 5-5z" fill="#0b111a"/><path d="M110 116v5" stroke="#0b111a" stroke-width="2"/>
      <rect x="78" y="163" width="27" height="14" rx="7" fill="${color}"/><rect x="115" y="163" width="27" height="14" rx="7" fill="${color}"/>`);
    if (pet.species === 'robot') return frame(`
      <g class="pet-antenna"><path d="M110 54V35" stroke="${color}" stroke-width="5"/><circle cx="110" cy="29" r="8" fill="#96e6c1" stroke="#0b111a" stroke-width="3"/></g>
      <rect x="52" y="81" width="15" height="31" rx="7" fill="#b8a6ff"/><rect x="153" y="81" width="15" height="31" rx="7" fill="#b8a6ff"/>
      <rect x="70" y="120" width="80" height="47" rx="16" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="M59 139v20M161 139v20" stroke="${color}" stroke-width="12" stroke-linecap="round"/>
      <rect x="61" y="56" width="98" height="69" rx="20" fill="${color}" stroke="#0b111a" stroke-width="3"/><rect x="72" y="76" width="76" height="40" rx="12" fill="#edf3ff"/>
      ${eyes}<path d="M104 107q6 5 12 0" fill="none" stroke="#0b111a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="m110 133 3 6 7 2-7 3-3 6-3-6-7-3 7-2z" fill="#0b111a"/>
      <rect x="77" y="162" width="27" height="14" rx="6" fill="#b8a6ff"/><rect x="116" y="162" width="27" height="14" rx="6" fill="#b8a6ff"/>`);
    return frame(`
      <g class="pet-tail"><path d="M142 160q43 2 33-33q-5-15-14-6" fill="none" stroke="#0b111a" stroke-width="19" stroke-linecap="round"/><path d="M142 160q43 2 33-33q-5-15-14-6" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/></g>
      <path d="M75 164q-2-52 35-48q39-4 36 48v10H74z" fill="${color}" stroke="#0b111a" stroke-width="3"/><ellipse cx="110" cy="146" rx="17" ry="20" fill="#edf3ff" opacity=".7"/>
      <path d="M67 78 68 42 91 63q19-8 38 0l23-21 1 36q7 49-43 49q-50 0-43-49z" fill="${color}" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
      <path d="m75 56 1 22 12-11M145 56l-1 22-12-11" fill="#b8a6ff"/>
      ${eyes}<path d="m106 109 4 4 4-4z" fill="#0b111a"/><path d="M110 113q-5 9-10 3M110 113q5 9 10 3M69 108l14 2M68 115l15-2M151 108l-14 2M152 115l-15-2" fill="none" stroke="#0b111a" stroke-width="2" stroke-linecap="round"/>
      <path d="M111 70q-10 3-7 12q6 4 10-1q-8 2-7-4q0-4 4-7" fill="#edf3ff"/>
      <rect x="78" y="163" width="27" height="14" rx="7" fill="${color}"/><rect x="115" y="163" width="27" height="14" rx="7" fill="${color}"/>`);
  }

  const position = document.getElementById('pet-position');
  const toy = document.getElementById('toy');
  const pad = document.getElementById('nap-pad');
  const motion = window.MoonlightMotion;
  const bounds = scene.getBoundingClientRect();
  const world = motion.create(bounds.width, bounds.height);
  const pendingActions = [];
  const gaze = { x: 0, y: 0, tx: 0, ty: 0, lean: 0, targetLean: 0 };
  const suppressedClicks = new Set();
  let gesture;
  let frameId;
  let lastFrame;
  let disposed = false;
  let previousPetX = world.pet.x;

  function validPet(pet) {
    return pet && typeof pet === 'object' && species.includes(pet.species)
      && typeof pet.name === 'string' && Array.from(pet.name).length > 0 && Array.from(pet.name).length <= 32
      && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(pet.name)
      && typeof pet.color === 'string' && /^#[0-9a-f]{6}$/i.test(pet.color);
  }
  function setStatus(message) { if (status.textContent !== message) status.textContent = message; }
  function visible() { return !disposed && hostVisible && !document.hidden; }
  function animated() { return visible() && motionEnabled && !reducedMotion.matches; }
  function stopReaction() { clearTimeout(reactionTimer); reactionTimer = undefined; }
  function finishReaction() {
    stopReaction();
    if (scene.dataset.mood !== 'resting') scene.dataset.mood = 'idle';
  }
  function stopFrame() { cancelAnimationFrame(frameId); frameId = undefined; lastFrame = undefined; }
  function draw() {
    position.style.transform = `translate3d(${world.pet.x.toFixed(2)}px, ${(-world.pet.y).toFixed(2)}px, 0)`;
    toy.style.transform = `translate3d(${(world.ball.x - 12).toFixed(2)}px, ${(-world.ball.y).toFixed(2)}px, 0)`;
    art.querySelector('.pet-gaze')?.setAttribute('transform', `translate(${gaze.x.toFixed(2)} ${gaze.y.toFixed(2)})`);
    art.querySelector('.pet-body')?.setAttribute('transform', `rotate(${gaze.lean.toFixed(2)} 110 150)`);
    scene.dataset.held = gesture?.dragging ? gesture.kind : 'none';
  }
  function requestFrame() {
    if (frameId === undefined && animated()) frameId = requestAnimationFrame(animateFrame);
  }
  function animateFrame(time) {
    frameId = undefined;
    if (!animated()) { lastFrame = undefined; return; }
    const dt = lastFrame === undefined ? 1 / 60 : Math.min(.04, Math.max(0, (time - lastFrame) / 1000));
    lastFrame = time;
    const wasChasing = world.chasing;
    const active = motion.step(world, dt);
    const ease = 1 - Math.exp(-14 * dt);
    gaze.x += (gaze.tx - gaze.x) * ease;
    gaze.y += (gaze.ty - gaze.y) * ease;
    gaze.lean += (gaze.targetLean - gaze.lean) * ease;
    scene.dataset.moving = String(!world.pet.held && Math.abs(world.pet.x - previousPetX) > .12);
    previousPetX = world.pet.x;
    if (wasChasing && !world.chasing && scene.dataset.mood === 'playful') {
      finishReaction();
      setStatus(`${currentPet.name} caught it. Your throw, your game.`);
    }
    draw();
    if (active || Math.abs(gaze.x - gaze.tx) + Math.abs(gaze.y - gaze.ty) + Math.abs(gaze.lean - gaze.targetLean) > .04) requestFrame();
    else { lastFrame = undefined; scene.dataset.moving = 'false'; }
  }
  function releaseCapture() {
    const old = gesture;
    gesture = undefined;
    if (old?.element.hasPointerCapture(old.id)) old.element.releasePointerCapture(old.id);
    scene.dataset.stroking = 'false';
    gaze.targetLean = 0;
  }
  function cancelGesture() {
    const wasPlaying = scene.dataset.mood === 'playful';
    const wasCarried = gesture?.kind === 'pet' && gesture.dragging;
    releaseCapture();
    motion.settle(world);
    scene.dataset.moving = 'false';
    finishReaction();
    if (wasPlaying) setStatus('Ready for another throw.');
    else if (wasCarried) setStatus(`${currentPet.name} is ready for more.`);
    draw();
  }
  function syncMotion() {
    const wasAnimated = document.body.dataset.motion === 'true';
    document.body.dataset.visible = String(visible());
    document.body.dataset.motion = String(animated());
    motionButton.textContent = reducedMotion.matches ? 'Reduced motion' : `Motion ${motionEnabled ? 'on' : 'off'}`;
    motionButton.setAttribute('aria-pressed', String(motionEnabled && !reducedMotion.matches));
    motionButton.disabled = reducedMotion.matches;
    if (!animated()) {
      if (!visible() || wasAnimated) cancelGesture();
      stopFrame();
      gaze.x = gaze.y = gaze.tx = gaze.ty = gaze.lean = gaze.targetLean = 0;
      draw();
      if (!visible()) finishReaction();
    }
  }
  function react(action, prepared = false) {
    stopReaction();
    const mood = ({ pet: 'happy', play: 'playful', rest: 'resting' })[action];
    scene.dataset.mood = mood;
    if (action === 'rest') {
      motion.rest(world);
      setStatus(`${currentPet.name} is taking a quiet moon nap. Touch to wake.`);
    } else if (action === 'play') {
      if (!prepared) motion.tossBall(world);
      setStatus(`${currentPet.name} is chasing your throw.`);
    } else {
      motion.wake(world);
      setStatus(`${currentPet.name} leans into the head scratches.`);
    }
    if (!animated()) {
      if (action === 'rest') world.pet.x = world.pet.targetX;
      motion.settle(world);
      if (action === 'play') setStatus(`${currentPet.name} caught the moon ball.`);
      if (action !== 'rest') reactionTimer = setTimeout(finishReaction, 1400);
    } else {
      if (action === 'pet' && !gesture) reactionTimer = setTimeout(finishReaction, 1400);
      requestFrame();
    }
    draw();
  }
  function interact(action, prepared = false) {
    if (!visible()) return;
    // Respond in this frame. Host acknowledgements must never restart the gesture.
    pendingActions.push(action);
    react(action, prepared);
    vscode.postMessage({ type: 'interact', action });
  }
  function render(pet, mood, interactionId, hostIsVisible = true) {
    if (!validPet(pet) || !moods.includes(mood) || !Number.isSafeInteger(interactionId) || interactionId < 0) return false;
    const changed = !currentPet || pet.species !== currentPet.species || pet.color !== currentPet.color || pet.name !== currentPet.name;
    if (!currentPet || pet.species !== currentPet.species || pet.color !== currentPet.color) art.innerHTML = petSvg(pet);
    currentPet = pet;
    name.textContent = pet.name;
    art.setAttribute('aria-label', `Pet ${pet.name}`);
    const kind = ({ robot: 'little robot', penguin: 'moon penguin', labrador: 'moon labrador', sam: 'fan character companion', tibo: 'fan character companion' })[pet.species] || `moon ${pet.species}`;
    scene.setAttribute('aria-label', `${pet.name}, ${pet.species === 'sam' || pet.species === 'tibo' ? 'a fan character companion' : `your ${kind}`}`);
    const newInteraction = lastInteractionId !== undefined && interactionId !== lastInteractionId;
    const acknowledged = newInteraction && pendingActions.length > 0;
    if (acknowledged) pendingActions.shift();
    lastInteractionId = interactionId;
    hostVisible = hostIsVisible;
    if (changed) {
      cancelGesture(); stopFrame(); stopReaction();
      const sprite = art.getBoundingClientRect();
      motion.resize(world, world.width, world.height, { petWidth: sprite.width, petHeight: sprite.height });
      pendingActions.length = 0;
      scene.dataset.mood = 'idle';
      setStatus('A little company. A little mischief.');
    }
    syncMotion();
    if (!hasHostState && !pendingActions.length && mood === 'resting') react('rest');
    else if (hasHostState && newInteraction && !acknowledged && !pendingActions.length && visible()) {
      // Supports a host-originated state without replaying visibility refreshes.
      const action = ({ happy: 'pet', playful: 'play', resting: 'rest' })[mood];
      if (action) react(action);
    }
    draw();
    return true;
  }
  function point(event) {
    const rect = scene.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: rect.bottom - 12 - event.clientY };
  }
  function aim(event) {
    if (!animated() || world.pet.resting) return;
    const rect = art.getBoundingClientRect();
    gaze.tx = Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) / 20));
    gaze.ty = Math.max(-2, Math.min(2, (event.clientY - rect.top - rect.height / 2) / 25));
    requestFrame();
  }
  function startGesture(kind, element, event) {
    if (!event.isPrimary || event.button !== 0 || !visible() || gesture) return;
    event.preventDefault();
    const p = point(event);
    const object = kind === 'pet' ? world.pet : world.ball;
    suppressedClicks.delete(kind);
    gesture = { kind, element, id: event.pointerId, start: p, last: p, time: performance.now(), vx: 0, vy: 0, dragging: kind === 'ball', moved: false, dx: p.x - object.x, dy: p.y - object.y };
    suppressedClicks.add(kind);
    element.setPointerCapture(event.pointerId);
    if (kind === 'pet') interact('pet');
    else { stopReaction(); motion.holdBall(world, world.ball.x, world.ball.y); draw(); }
  }
  function moveGesture(event) {
    if (!gesture || gesture.id !== event.pointerId) { aim(event); return; }
    const p = point(event);
    const dx = p.x - gesture.start.x;
    const dy = p.y - gesture.start.y;
    const now = performance.now();
    const dt = Math.max(.008, Math.min(.08, (now - gesture.time) / 1000));
    gesture.vx = .6 * ((p.x - gesture.last.x) / dt) + .4 * gesture.vx;
    gesture.vy = .6 * ((p.y - gesture.last.y) / dt) + .4 * gesture.vy;
    gesture.moved ||= Math.hypot(dx, dy) > 5;
    if (gesture.kind === 'pet') {
      gesture.dragging ||= Math.abs(dy) > 16 || Math.abs(dx) > 40;
      if (gesture.dragging) {
        motion.holdPet(world, p.x - gesture.dx, p.y - gesture.dy);
        scene.dataset.stroking = 'false';
        gaze.targetLean = Math.max(-9, Math.min(9, gesture.vx / 90));
        setStatus(`You've got ${currentPet.name}. Drop onto the cushion for a nap.`);
      } else {
        scene.dataset.stroking = String(gesture.moved);
        gaze.targetLean = Math.max(-5, Math.min(5, dx / 5));
        aim(event);
      }
    } else motion.holdBall(world, p.x - gesture.dx, p.y - gesture.dy);
    gesture.last = p; gesture.time = now;
    draw(); requestFrame();
  }
  function endGesture(event, cancelled = false) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const old = gesture;
    releaseCapture();
    if (cancelled) {
      motion.settle(world); finishReaction();
      setStatus(`${currentPet.name} is ready for more.`);
    } else if (old.kind === 'ball') {
      if (old.moved) {
        const fresh = performance.now() - old.time < 120;
        motion.throwBall(world, fresh ? old.vx : 0, fresh ? old.vy : 0);
      } else motion.tossBall(world);
      interact('play', true);
    } else {
      motion.releasePet(world);
      if (old.dragging && world.pet.y < 32 && Math.abs(world.pet.x - world.width * .22) < Math.max(24, world.width * .13)) interact('rest');
      else {
        if (old.dragging) setStatus(`${currentPet.name} is ready for more.`);
        reactionTimer = setTimeout(finishReaction, 1400);
      }
    }
    if (!animated()) motion.settle(world);
    draw(); requestFrame();
  }

  try { render(JSON.parse(main.dataset.pet), 'idle', 0); } catch { /* A validated host state follows. */ }
  window.addEventListener('message', event => {
    const message = event.data;
    if (message?.type === 'state' && typeof message.visible === 'boolean' && render(message.pet, message.mood, message.interactionId, message.visible)) hasHostState = true;
  });
  for (const [kind, element] of [['pet', art], ['ball', toy]]) {
    element.addEventListener('pointerdown', event => startGesture(kind, element, event));
    element.addEventListener('pointermove', moveGesture);
    element.addEventListener('pointerup', event => endGesture(event));
    element.addEventListener('pointercancel', event => endGesture(event, true));
    element.addEventListener('lostpointercapture', event => endGesture(event, true));
    element.addEventListener('click', event => {
      if (event.detail > 0 && suppressedClicks.has(kind)) { suppressedClicks.delete(kind); return; }
      suppressedClicks.delete(kind);
      if (gesture) cancelGesture();
      interact(kind === 'pet' ? 'pet' : 'play');
    });
  }
  art.addEventListener('pointerleave', () => {
    if (!gesture) { gaze.tx = gaze.ty = gaze.targetLean = 0; requestFrame(); }
  });
  pad.addEventListener('click', () => { if (gesture) cancelGesture(); interact('rest'); });
  motionButton.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    motionEnabled = !motionEnabled;
    vscode.setState({ ...vscode.getState(), motionEnabled });
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.getElementById('customize').addEventListener('click', () => { if (visible()) vscode.postMessage({ type: 'customize' }); });
  document.addEventListener('visibilitychange', () => {
    syncMotion();
    if (visible()) vscode.postMessage({ type: 'ready' });
  });
  window.addEventListener('blur', () => { cancelGesture(); finishReaction(); stopFrame(); });
  window.addEventListener('pagehide', () => { disposed = true; syncMotion(); stopReaction(); });
  const resizeObserver = new ResizeObserver(() => {
    const rect = scene.getBoundingClientRect();
    const sprite = art.getBoundingClientRect();
    cancelGesture(); motion.resize(world, rect.width, rect.height, { petWidth: sprite.width, petHeight: sprite.height }); draw(); requestFrame();
  });
  resizeObserver.observe(scene);
  window.addEventListener('pagehide', () => resizeObserver.disconnect());
  vscode.postMessage({ type: 'ready' });
})();
