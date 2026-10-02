'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  registerPets, MoonlightPetsProvider, PET_STATE_KEY, DEFAULT_PET,
  isValidPetName, isValidPetColor, isValidPet, normalizePet, validatePetMessage, escapeHtml, getPetHtml
} = require('../src/pets');

function fixture(storedPet) {
  const calls = { registeredViews: [], registeredCommands: new Map(), updates: [], messages: [], focus: [], errors: [] };
  const disposable = () => ({ dispose() {} });
  const uri = {
    joinPath(base, ...parts) { return `${base}/${parts.join('/')}`; }
  };
  const vscode = {
    Uri: uri,
    window: {
      registerWebviewViewProvider(id, provider) { calls.registeredViews.push({ id, provider }); return disposable(); },
      async showQuickPick() {},
      async showInputBox() {},
      showErrorMessage(message) { calls.errors.push(message); },
    },
    commands: {
      registerCommand(id, callback) { calls.registeredCommands.set(id, callback); return disposable(); },
      async executeCommand(id) { calls.focus.push(id); }
    }
  };
  const context = {
    extensionUri: 'extension://moonlight', subscriptions: [],
    globalState: {
      get(key) { assert.equal(key, PET_STATE_KEY); return storedPet; },
      async update(key, value) { calls.updates.push({ key, value }); }
    }
  };
  const callbacks = {};
  const view = {
    visible: true,
    webview: {
      cspSource: 'vscode-webview://test',
      asWebviewUri(resource) { return `vscode-webview://test/${resource}`; },
      onDidReceiveMessage(callback) { callbacks.message = callback; return disposable(); },
      async postMessage(message) { calls.messages.push(message); return true; }
    },
    onDidChangeVisibility(callback) { callbacks.visibility = callback; return disposable(); },
    onDidDispose(callback) { callbacks.dispose = callback; return disposable(); }
  };
  return { vscode, context, calls, callbacks, view };
}

test('names have a printable single-line 1–32 character boundary', () => {
  assert.equal(isValidPetName('Luna'), true);
  assert.equal(isValidPetName('🌙'.repeat(32)), true);
  for (const name of ['', ' Luna', 'Luna ', 'x'.repeat(33), 'Moon\ncat', 'Moon\u0000cat', 'Moon\u2028cat', null, 12]) {
    assert.equal(isValidPetName(name), false, String(name));
  }
});

test('only complete six-digit hexadecimal colors are accepted', () => {
  assert.equal(isValidPetColor('#99c7ff'), true);
  assert.equal(isValidPetColor('#B8A6FF'), true);
  for (const color of ['#abc', 'red', '#99c7ff;', '#99c7ff"', 'url(https://example.test)', null, '#99c7ff\n']) {
    assert.equal(isValidPetColor(color), false, String(color));
  }
});

test('pet normalization copies allowed fields and rejects corrupt saved state', () => {
  const valid = { species: 'fox', name: 'Comet', color: '#96e6c1', ignored: 'not copied' };
  assert.equal(isValidPet(valid), true);
  assert.deepEqual(normalizePet(valid), { species: 'fox', name: 'Comet', color: '#96E6C1' });
  for (const corrupt of [null, [], {}, { ...valid, species: 'dog' }, { ...valid, name: '' }, { ...valid, color: 'blue' }]) {
    assert.deepEqual(normalizePet(corrupt), DEFAULT_PET);
  }
  const fallback = normalizePet();
  fallback.name = 'Changed';
  assert.equal(DEFAULT_PET.name, 'Luna');
});

test('message validation has a closed action set and strips extra fields', () => {
  assert.deepEqual(validatePetMessage({ type: 'ready', url: 'https://example.test' }), { type: 'ready' });
  assert.deepEqual(validatePetMessage({ type: 'customize' }), { type: 'customize' });
  for (const action of ['pet', 'play', 'rest']) {
    assert.deepEqual(validatePetMessage({ type: 'interact', action, command: 'untrusted' }), { type: 'interact', action });
  }
  for (const invalid of [null, [], 'pet', {}, { type: 'openUrl' }, { type: 'interact', action: 'constructor' },
    { type: 'interact', action: '__proto__' }, { type: 'interact', action: {} }, { type: 'interact' }]) {
    assert.equal(validatePetMessage(invalid), null);
  }
});

test('HTML escapes text and state, with nonce scripts and local styles only', () => {
  const { vscode, context, view } = fixture();
  const name = '<img src=x onerror="bad">';
  const html = getPetHtml(view.webview, context.extensionUri, vscode, { ...DEFAULT_PET, name }, 'test-nonce');
  assert.ok(html.includes('&lt;img src=x onerror=&quot;bad&quot;&gt;'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes("default-src &#39;none&#39;"));
  assert.ok(html.includes("script-src &#39;nonce-test-nonce&#39;"));
  assert.ok(!html.includes('unsafe-inline'));
  assert.ok(!html.includes('https:'));
  assert.match(html, /<script nonce="test-nonce" src="vscode-webview:/);
  assert.match(html, /<link href="vscode-webview:/);
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('HTML generates a fresh nonce for each webview document', () => {
  const { vscode, context, view } = fixture();
  const first = getPetHtml(view.webview, context.extensionUri, vscode, DEFAULT_PET);
  const second = getPetHtml(view.webview, context.extensionUri, vscode, DEFAULT_PET);
  assert.notEqual(first.match(/<script nonce="([^"]+)"/)[1], second.match(/<script nonce="([^"]+)"/)[1]);
});

test('registration contributes one provider and both command callbacks', async () => {
  const { vscode, context, calls } = fixture();
  const provider = registerPets(vscode, context);
  assert.equal(calls.registeredViews[0].id, 'moonlight.pets');
  assert.equal(calls.registeredViews[0].provider, provider);
  assert.deepEqual([...calls.registeredCommands.keys()], ['moonlight.showPets', 'moonlight.customizePet']);
  assert.equal(context.subscriptions.length, 3);
  await calls.registeredCommands.get('moonlight.showPets')();
  assert.deepEqual(calls.focus, ['moonlight.pets.focus']);
});

test('webview roots are limited to media and unsupported messages have no effect', () => {
  const { vscode, context, calls, callbacks, view } = fixture();
  const provider = new MoonlightPetsProvider(vscode, context);
  provider.resolveWebviewView(view);
  assert.deepEqual(view.webview.options.localResourceRoots, ['extension://moonlight/media']);
  assert.equal(view.webview.options.enableCommandUris, false);
  callbacks.message({ type: 'executeCommand', command: 'any.command' });
  assert.equal(calls.messages.length, 0);
  assert.equal(calls.updates.length, 0);
  callbacks.message({ type: 'ready' });
  assert.deepEqual(calls.messages[0], { type: 'state', pet: DEFAULT_PET, mood: 'idle', interactionId: 0, visible: true });
});

test('interactions update only visual mood and hidden views ignore interaction', () => {
  const { vscode, context, calls, callbacks, view } = fixture();
  const provider = new MoonlightPetsProvider(vscode, context);
  provider.resolveWebviewView(view);
  callbacks.message({ type: 'interact', action: 'play' });
  assert.equal(calls.messages.at(-1).mood, 'playful');
  view.visible = false;
  callbacks.visibility();
  assert.equal(calls.messages.at(-1).visible, false);
  callbacks.message({ type: 'interact', action: 'rest' });
  assert.equal(provider.mood, 'playful');
  assert.equal(calls.updates.length, 0);
});

test('disposal prevents further sends to the closed view', () => {
  const { vscode, context, calls, callbacks, view } = fixture();
  const provider = new MoonlightPetsProvider(vscode, context);
  provider.resolveWebviewView(view);
  callbacks.dispose();
  provider.sendState();
  assert.equal(provider.view, undefined);
  assert.equal(calls.messages.length, 0);
});

test('complete customization persists only the selected companion', async () => {
  const { vscode, context, calls } = fixture();
  const picks = [{ value: 'robot' }, { value: 'custom' }];
  const inputs = ['  Orbit  ', '#abcdef'];
  vscode.window.showQuickPick = async () => picks.shift();
  vscode.window.showInputBox = async () => inputs.shift();
  const provider = new MoonlightPetsProvider(vscode, context);
  await provider.customize();
  assert.deepEqual(calls.updates, [{ key: PET_STATE_KEY, value: { species: 'robot', name: 'Orbit', color: '#ABCDEF' } }]);
  assert.deepEqual(provider.pet, calls.updates[0].value);
});

test('new companions are selectable, named and restored from saved state', async () => {
  const companions = [
    ['penguin', 'Penguin', 'Pip'], ['labrador', 'Labrador', 'Sunny'],
    ['sam', 'Sam Altman', 'Sam Altman'], ['tibo', 'Tibo Sottiaux', 'Tibo']
  ];
  for (const [species, label, suggestedName] of companions) {
    const { vscode, context, calls, view } = fixture();
    let picks = 0;
    vscode.window.showQuickPick = async options => {
      if (picks++ > 0) return options.find(option => option.value === '#99C7FF');
      const choice = options.find(option => option.value === species);
      assert.equal(choice?.label, label, 'The companion is actually offered in the picker');
      return choice;
    };
    vscode.window.showInputBox = async options => {
      assert.equal(options.value, suggestedName);
      return options.value;
    };
    const provider = new MoonlightPetsProvider(vscode, context);
    provider.resolveWebviewView(view);
    await provider.customize();
    const expected = { species, name: suggestedName, color: '#99C7FF' };
    assert.deepEqual(calls.updates, [{ key: PET_STATE_KEY, value: expected }]);
    assert.deepEqual(calls.messages.at(-1).pet, expected);
    const restored = fixture(expected);
    assert.deepEqual(new MoonlightPetsProvider(restored.vscode, restored.context).pet, expected);
  }
});

test('editing the same companion preserves its custom name suggestion', async () => {
  const saved = { species: 'labrador', name: 'Milo', color: '#96E6C1' };
  const { vscode, context, calls } = fixture(saved);
  let picks = 0;
  vscode.window.showQuickPick = async options => {
    const value = picks++ ? '#99C7FF' : 'labrador';
    return options.find(option => option.value === value);
  };
  vscode.window.showInputBox = async options => {
    assert.equal(options.value, 'Milo');
    return options.value;
  };
  await new MoonlightPetsProvider(vscode, context).customize();
  assert.equal(calls.updates[0].value.name, 'Milo');
});

test('canceling any customization step keeps the stored state unchanged', async () => {
  for (const step of ['species', 'name', 'color', 'custom-color']) {
    const { vscode, context, calls } = fixture();
    const picks = [step === 'species' ? undefined : { value: 'fox' }, step === 'color' ? undefined : { value: 'custom' }];
    const inputs = [step === 'name' ? undefined : 'Comet', undefined];
    vscode.window.showQuickPick = async () => picks.shift();
    vscode.window.showInputBox = async () => inputs.shift();
    const provider = new MoonlightPetsProvider(vscode, context);
    await provider.customize();
    assert.equal(calls.updates.length, 0, step);
    assert.deepEqual(provider.pet, DEFAULT_PET, step);
    assert.equal(provider.customizing, false, step);
  }
});

test('invalid customization and failed persistence cannot overwrite the current pet', async () => {
  const { vscode, context, calls } = fixture();
  const picks = [{ value: 'fox' }, { value: '#99C7FF' }, { value: 'robot' }, { value: '#99C7FF' }];
  const inputs = ['invalid\nname', 'Orbit'];
  vscode.window.showQuickPick = async () => picks.shift();
  vscode.window.showInputBox = async () => inputs.shift();
  const provider = new MoonlightPetsProvider(vscode, context);
  await provider.customize();
  assert.equal(calls.updates.length, 0);
  context.globalState.update = async () => { throw new Error('Storage failed'); };
  await assert.rejects(provider.customize(), /Storage failed/);
  assert.deepEqual(provider.pet, DEFAULT_PET);
  assert.equal(provider.customizing, false);
});

test('webview client keeps safe text rendering, local animation and motion guards', () => {
  const script = fs.readFileSync(path.join(__dirname, '../media/pets.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../media/pets.css'), 'utf8');
  assert.match(script, /name\.textContent = pet\.name/);
  assert.match(script, /setStatus\(messages\[mood\]\)/);
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|setInterval|requestAnimationFrame)\s*\(/.test(script));
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /body\[data-motion="false"\]/);
  assert.match(css, /body\[data-visible="false"\]/);
});


test('only accepted interactions advance the sequence and stale views cannot act', () => {
  const first = fixture();
  const provider = new MoonlightPetsProvider(first.vscode, first.context);
  provider.resolveWebviewView(first.view);
  first.callbacks.message({ type: 'interact', action: 'pet' });
  first.callbacks.message({ type: 'interact', action: 'pet' });
  assert.deepEqual(first.calls.messages.map(message => message.interactionId), [1, 2]);
  first.callbacks.message({ type: 'ready' });
  first.callbacks.visibility();
  assert.equal(provider.interactionId, 2);
  first.view.visible = false;
  first.callbacks.message({ type: 'interact', action: 'rest' });
  assert.equal(provider.interactionId, 2);
  const second = fixture();
  provider.resolveWebviewView(second.view);
  first.view.visible = true;
  first.callbacks.message({ type: 'interact', action: 'rest' });
  assert.equal(provider.mood, 'happy');
  assert.equal(provider.interactionId, 2);
  first.callbacks.dispose();
  assert.equal(provider.view, second.view);
});
