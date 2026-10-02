(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const main = document.getElementById('companion');
  const scene = document.getElementById('scene');
  const art = document.getElementById('pet-art');
  const name = document.getElementById('pet-name');
  const status = document.getElementById('pet-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const species = ['cat', 'fox', 'robot'];
  const moods = ['idle', 'happy', 'playful', 'resting'];
  let currentPet;

  // All artwork is original, fixed local SVG markup. Only a validated hex color is interpolated.
  const eyes = `<g class="eye-open" fill="#0b111a"><ellipse cx="90" cy="100" rx="4" ry="6"/><ellipse cx="130" cy="100" rx="4" ry="6"/><circle cx="91" cy="98" r="1.3" fill="#fff"/><circle cx="131" cy="98" r="1.3" fill="#fff"/></g><g class="eye-sleep" fill="none" stroke="#0b111a" stroke-width="3.5" stroke-linecap="round"><path d="M84 100q6 5 12 0M124 100q6 5 12 0"/></g>`;
  const frame = body => `<svg viewBox="0 0 220 190" xmlns="http://www.w3.org/2000/svg" focusable="false"><ellipse cx="110" cy="177" rx="67" ry="7" fill="#070e19" opacity=".6"/>${body}</svg>`;
  function petSvg(pet) {
    const color = pet.color;
    if (pet.species === 'fox') return frame(`
      <path d="M142 150q46-59 57-16q7 37-52 39" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="M180 136q20-10 17 12q-3 18-24 21" fill="#edf3ff"/>
      <path d="M73 162q4-48 37-47q38 0 40 47v12H72z" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="m88 132 22 31 22-31-22-10z" fill="#edf3ff"/>
      <path d="M60 81 63 40 90 64q20-11 40 0l27-24 3 41q10 24-50 49q-60-25-50-49z" fill="${color}" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
      <path d="m69 54 2 29 16-13M151 54l-2 29-16-13" fill="#b8a6ff"/><path d="M62 96q21-7 48 20q27-27 48-20q-14 23-48 34q-34-11-48-34z" fill="#edf3ff"/>
      ${eyes}<path d="m105 111 5 5 5-5z" fill="#0b111a"/><path d="M110 116v5" stroke="#0b111a" stroke-width="2"/>
      <rect x="78" y="163" width="27" height="14" rx="7" fill="${color}"/><rect x="115" y="163" width="27" height="14" rx="7" fill="${color}"/>`);
    if (pet.species === 'robot') return frame(`
      <path d="M110 54V35" stroke="${color}" stroke-width="5"/><circle cx="110" cy="29" r="8" fill="#96e6c1" stroke="#0b111a" stroke-width="3"/>
      <rect x="52" y="81" width="15" height="31" rx="7" fill="#b8a6ff"/><rect x="153" y="81" width="15" height="31" rx="7" fill="#b8a6ff"/>
      <rect x="70" y="120" width="80" height="47" rx="16" fill="${color}" stroke="#0b111a" stroke-width="3"/><path d="M59 139v20M161 139v20" stroke="${color}" stroke-width="12" stroke-linecap="round"/>
      <rect x="61" y="56" width="98" height="69" rx="20" fill="${color}" stroke="#0b111a" stroke-width="3"/><rect x="72" y="76" width="76" height="40" rx="12" fill="#edf3ff"/>
      ${eyes}<path d="M104 107q6 5 12 0" fill="none" stroke="#0b111a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="m110 133 3 6 7 2-7 3-3 6-3-6-7-3 7-2z" fill="#0b111a"/>
      <rect x="77" y="162" width="27" height="14" rx="6" fill="#b8a6ff"/><rect x="116" y="162" width="27" height="14" rx="6" fill="#b8a6ff"/>`);
    return frame(`
      <path d="M142 160q43 2 33-33q-5-15-14-6" fill="none" stroke="#0b111a" stroke-width="19" stroke-linecap="round"/><path d="M142 160q43 2 33-33q-5-15-14-6" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round"/>
      <path d="M75 164q-2-52 35-48q39-4 36 48v10H74z" fill="${color}" stroke="#0b111a" stroke-width="3"/><ellipse cx="110" cy="146" rx="17" ry="20" fill="#edf3ff" opacity=".7"/>
      <path d="M67 78 68 42 91 63q19-8 38 0l23-21 1 36q7 49-43 49q-50 0-43-49z" fill="${color}" stroke="#0b111a" stroke-width="3" stroke-linejoin="round"/>
      <path d="m75 56 1 22 12-11M145 56l-1 22-12-11" fill="#b8a6ff"/>
      ${eyes}<path d="m106 109 4 4 4-4z" fill="#0b111a"/><path d="M110 113q-5 9-10 3M110 113q5 9 10 3M69 108l14 2M68 115l15-2M151 108l-14 2M152 115l-15-2" fill="none" stroke="#0b111a" stroke-width="2" stroke-linecap="round"/>
      <path d="M111 70q-10 3-7 12q6 4 10-1q-8 2-7-4q0-4 4-7" fill="#edf3ff"/>
      <rect x="78" y="163" width="27" height="14" rx="7" fill="${color}"/><rect x="115" y="163" width="27" height="14" rx="7" fill="${color}"/>`);
  }

  function validPet(pet) {
    return pet && typeof pet === 'object' && species.includes(pet.species)
      && typeof pet.name === 'string' && Array.from(pet.name).length > 0 && Array.from(pet.name).length <= 32
      && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(pet.name)
      && typeof pet.color === 'string' && /^#[0-9a-f]{6}$/i.test(pet.color);
  }

  function render(pet, mood, visible = true) {
    if (!validPet(pet) || !moods.includes(mood)) return;
    const key = `${pet.species}:${pet.color}`;
    if (!currentPet || key !== `${currentPet.species}:${currentPet.color}`) art.innerHTML = petSvg(pet);
    currentPet = pet;
    name.textContent = pet.name;
    scene.setAttribute('aria-label', `${pet.name}, your ${pet.species === 'robot' ? 'little robot' : `moon ${pet.species}`}`);
    document.body.dataset.visible = String(visible && !document.hidden);
    if (visible && !document.hidden && !reducedMotion.matches) {
      scene.dataset.mood = 'idle';
      void art.offsetWidth;
    }
    scene.dataset.mood = mood;
    const messages = {
      idle: 'Ready to keep you company.',
      happy: `${pet.name} leans into the head scratches.`,
      playful: `${pet.name} caught a little stardust.`,
      resting: `${pet.name} is taking a quiet moon nap.`
    };
    status.textContent = messages[mood];
  }

  try { render(JSON.parse(main.dataset.pet), 'idle'); } catch { /* A fresh host state will arrive next. */ }
  window.addEventListener('message', event => {
    const message = event.data;
    if (message && message.type === 'state' && typeof message.visible === 'boolean') {
      render(message.pet, message.mood, message.visible);
    }
  });
  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => vscode.postMessage({ type: 'interact', action: button.dataset.action }));
  });
  document.getElementById('customize').addEventListener('click', () => vscode.postMessage({ type: 'customize' }));
  document.addEventListener('visibilitychange', () => {
    document.body.dataset.visible = String(!document.hidden);
    if (!document.hidden) vscode.postMessage({ type: 'ready' });
  });
  vscode.postMessage({ type: 'ready' });
})();
