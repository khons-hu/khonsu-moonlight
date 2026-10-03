'use strict';

const { randomBytes } = require('node:crypto');

const PET_STATE_KEY = 'moonlight.pet';
const PET_ENABLED_SETTING = 'moonlight.pets.enabled';
const PET_CHOICES = Object.freeze([
  { label: 'Moon cat', description: 'Curious and quietly cosmic', value: 'cat', name: 'Luna' },
  { label: 'Moon fox', description: 'A small spark of mischief', value: 'fox', name: 'Nova' },
  { label: 'Little robot', description: 'Your pocket-sized sidekick', value: 'robot', name: 'Orbit' },
  { label: 'Penguin', description: 'A little waddle under the moon', value: 'penguin', name: 'Pip' },
  { label: 'Labrador', description: 'Floppy ears and a happy tail', value: 'labrador', name: 'Sunny' },
  { label: 'Sam Altman', description: 'Stylized fan companion', value: 'sam', name: 'Sam Altman' },
  { label: 'Tibo Sottiaux', description: '@thsottiaux · stylized fan companion', value: 'tibo', name: 'Tibo' }
].map(choice => Object.freeze(choice)));
const PET_SPECIES = Object.freeze(PET_CHOICES.map(choice => choice.value));
const PET_COLORS = Object.freeze(['#99C7FF', '#B8A6FF', '#96E6C1', '#F5C7A9']);
const DEFAULT_PET = Object.freeze({ species: 'cat', name: 'Luna', color: '#99C7FF' });
const MOODS = Object.freeze({ pet: 'happy', play: 'playful', rest: 'resting' });

function isValidPetName(value) {
  return typeof value === 'string' && value === value.trim()
    && Array.from(value).length >= 1 && Array.from(value).length <= 32
    && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value);
}

function isValidPetColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function isValidPet(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && PET_SPECIES.includes(value.species)
    && isValidPetName(value.name) && isValidPetColor(value.color);
}

function normalizePet(value) {
  if (!isValidPet(value)) return { ...DEFAULT_PET };
  return { species: value.species, name: value.name, color: value.color.toUpperCase() };
}

function validatePetMessage(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.type === 'ready' || value.type === 'customize') return { type: value.type };
  if (value.type === 'interact' && typeof value.action === 'string' && Object.hasOwn(MOODS, value.action)) {
    return { type: 'interact', action: value.action };
  }
  return null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function getPetHtml(webview, extensionUri, vscode, pet, nonce = randomBytes(18).toString('base64')) {
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pets.css'));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pets.js'));
  const motionUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'pet-motion.js'));
  const csp = `default-src 'none'; base-uri 'none'; form-action 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
  <link href="${escapeHtml(styleUri)}" rel="stylesheet">
  <title>Moonlight companion</title>
</head>
<body>
  <main id="companion" data-pet="${escapeHtml(JSON.stringify(normalizePet(pet)))}">
    <header><span class="eyebrow">A little company</span><button id="customize" class="subtle" type="button" aria-label="Customize your companion">Customize</button></header>
    <section id="scene" class="scene" data-mood="idle" aria-label="Moonlight companion">
      <span class="moon" aria-hidden="true"></span>
      <span class="star star-one" aria-hidden="true"></span>
      <span class="star star-two" aria-hidden="true"></span>
      <button id="nap-pad" class="nap-pad" type="button" aria-label="Rest on the cushion" aria-describedby="pet-hint"><span aria-hidden="true">☾</span></button>
      <div id="pet-position" class="pet-position">
        <button id="pet-art" class="pet-art" type="button" aria-label="Pet your companion" aria-describedby="pet-hint"></button>
        <span class="spark spark-one" aria-hidden="true"></span>
        <span class="spark spark-two" aria-hidden="true"></span>
        <span class="sleep" aria-hidden="true">z z z</span>
      </div>
      <button id="toy" class="toy" type="button" aria-label="Throw the moon ball" aria-describedby="pet-hint"><span aria-hidden="true"></span></button>
      <div class="ground" aria-hidden="true"></div>
    </section>
    <h1 id="pet-name">${escapeHtml(normalizePet(pet).name)}</h1>
    <p id="pet-status" class="status" role="status" aria-live="polite">Ready to keep you company.</p>
    <p id="pet-hint" class="hint">Stroke to pet. Drag to carry. Flick the ball.<br>Tap the cushion for a nap.</p>
    <p class="keyboard-hint">Keyboard: Tab to a scene object, then Enter or Space.</p>
    <div class="motion-controls"><button id="motion" class="subtle" type="button" aria-pressed="true">Motion on</button></div>
    <p class="footnote">Just for fun. No files, feeds or tracking.</p>
  </main>
  <script nonce="${escapeHtml(nonce)}" src="${escapeHtml(motionUri)}"></script>
  <script nonce="${escapeHtml(nonce)}" src="${escapeHtml(scriptUri)}"></script>
</body>
</html>`;
}

class MoonlightPetsProvider {
  constructor(vscode, context) {
    this.vscode = vscode;
    this.context = context;
    this.pet = normalizePet(context.globalState.get(PET_STATE_KEY));
    this.mood = 'idle';
    this.interactionId = 0;
    this.view = undefined;
    this.customizing = false;
  }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      enableCommandUris: false,
      localResourceRoots: [this.vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    view.webview.html = getPetHtml(view.webview, this.context.extensionUri, this.vscode, this.pet);
    const subscriptions = [
      view.webview.onDidReceiveMessage(message => {
        if (this.view !== view) return;
        const validated = validatePetMessage(message);
        if (!validated) return;
        if (validated.type === 'ready') this.sendState();
        if (validated.type === 'interact' && view.visible) {
          this.mood = MOODS[validated.action];
          this.interactionId = this.interactionId >= Number.MAX_SAFE_INTEGER ? 1 : this.interactionId + 1;
          this.sendState();
        }
        if (validated.type === 'customize' && view.visible) {
          void this.customize().catch(() => this.reportSaveError());
        }
      }),
      view.onDidChangeVisibility(() => this.sendState()),
      view.onDidDispose(() => {
        if (this.view === view) this.view = undefined;
        for (const subscription of subscriptions) subscription.dispose();
      })
    ];
    this.context.subscriptions.push(...subscriptions);
  }

  sendState() {
    if (this.view) {
      void this.view.webview.postMessage({
        type: 'state', pet: this.pet, mood: this.mood, interactionId: this.interactionId, visible: this.view.visible
      });
    }
  }

  async show() {
    await this.vscode.workspace.getConfiguration('moonlight.pets')
      .update('enabled', true, this.vscode.ConfigurationTarget.Global);
    await this.vscode.commands.executeCommand('moonlight.pets.focus');
  }

  async hide() {
    await this.vscode.workspace.getConfiguration('moonlight.pets')
      .update('enabled', false, this.vscode.ConfigurationTarget.Global);
  }

  async customize() {
    if (this.customizing) return;
    this.customizing = true;
    try {
      const species = await this.vscode.window.showQuickPick(PET_CHOICES,
        { title: 'Moonlight: Choose your companion', placeHolder: 'Pick a companion', ignoreFocusOut: true });
      if (!species) return;
      const name = await this.vscode.window.showInputBox({
        title: 'Moonlight: Name your companion', prompt: 'A name from 1 to 32 characters',
        value: species.value === this.pet.species ? this.pet.name : (species.name || this.pet.name), ignoreFocusOut: true,
        validateInput: value => isValidPetName(value.trim()) ? undefined : 'Use 1–32 characters on one line.'
      });
      if (name === undefined) return;
      const color = await this.vscode.window.showQuickPick([
        { label: 'Ice blue', value: PET_COLORS[0] },
        { label: 'Lavender', value: PET_COLORS[1] },
        { label: 'Mint', value: PET_COLORS[2] },
        { label: 'Peach', value: PET_COLORS[3] },
        { label: 'Custom color', description: 'A six-digit hex color', value: 'custom' }
      ], { title: 'Moonlight: Companion color', placeHolder: 'Choose a color', ignoreFocusOut: true });
      if (!color) return;
      let chosenColor = color.value;
      if (chosenColor === 'custom') {
        chosenColor = await this.vscode.window.showInputBox({
          title: 'Moonlight: Custom color', prompt: 'Six-digit hex color, for example #99C7FF',
          value: this.pet.color, ignoreFocusOut: true,
          validateInput: value => isValidPetColor(value) ? undefined : 'Enter a color in the form #99C7FF.'
        });
        if (chosenColor === undefined) return;
      }
      const updatedPet = { species: species.value, name: name.trim(), color: chosenColor };
      if (!isValidPet(updatedPet)) return;
      const normalized = normalizePet(updatedPet);
      await this.context.globalState.update(PET_STATE_KEY, normalized);
      this.pet = normalized;
      this.mood = 'idle';
      this.sendState();
    } finally {
      this.customizing = false;
    }
  }

  reportSaveError() {
    void this.vscode.window.showErrorMessage('Could not save your Moonlight companion. Please try again.');
  }
}

function registerPets(vscode, context) {
  const provider = new MoonlightPetsProvider(vscode, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('moonlight.pets', provider),
    vscode.commands.registerCommand('moonlight.showPets', () => provider.show()),
    vscode.commands.registerCommand('moonlight.hidePets', () => provider.hide()),
    vscode.commands.registerCommand('moonlight.customizePet', () => provider.customize().catch(() => provider.reportSaveError()))
  );
  return provider;
}

module.exports = {
  registerPets, MoonlightPetsProvider, PET_STATE_KEY, PET_ENABLED_SETTING, PET_SPECIES, PET_COLORS, DEFAULT_PET,
  isValidPetName, isValidPetColor, isValidPet, normalizePet, validatePetMessage, escapeHtml, getPetHtml
};
