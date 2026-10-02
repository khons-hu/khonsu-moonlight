'use strict';

class FocusSession {
  constructor(now = Date.now) { this.now = now; this.stop(); }
  start(minutes) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new Error('Choose 1–180 whole minutes');
    this.remainingMs = minutes * 60000;
    this.deadline = this.now() + this.remainingMs;
    this.paused = false;
  }
  remaining() { return this.deadline === null ? this.remainingMs : Math.max(0, this.deadline - this.now()); }
  pause() { if (this.deadline === null) return; this.remainingMs = this.remaining(); this.deadline = null; this.paused = true; }
  resume() { if (!this.paused || !this.remainingMs) return; this.deadline = this.now() + this.remainingMs; this.paused = false; }
  stop() { this.deadline = null; this.remainingMs = 0; this.paused = false; }
}

function timeLabel(ms) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function registerFocus(vscode, context) {
  const session = new FocusSession();
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
  item.name = 'Moonlight Focus';
  item.command = 'moonlight.focus';
  let timer;
  const clear = () => { if (timer) clearInterval(timer); timer = undefined; };
  const render = () => {
    const remaining = session.remaining();
    item.text = `$(${session.paused ? 'debug-pause' : 'moon'}) ${timeLabel(remaining)}`;
    item.tooltip = session.paused ? 'Moonlight focus paused. Click to resume or stop.' : 'Moonlight focus. Click to pause or stop.';
    if (!remaining && !session.paused) {
      clear(); session.stop(); item.hide();
      void vscode.window.showInformationMessage('Moonlight focus complete. Take a break.');
    }
  };
  const run = () => { clear(); item.show(); render(); timer = setInterval(render, 1000); };
  context.subscriptions.push(item, { dispose: () => { clear(); session.stop(); } }, vscode.commands.registerCommand('moonlight.focus', async () => {
    if (session.remaining() > 0) {
      const action = await vscode.window.showQuickPick([session.paused ? 'Resume' : 'Pause', 'Stop'], { title: 'Moonlight focus session' });
      if (action === 'Pause') { session.pause(); clear(); render(); }
      if (action === 'Resume') { session.resume(); run(); }
      if (action === 'Stop') { clear(); session.stop(); item.hide(); }
      return;
    }
    const duration = await vscode.window.showQuickPick(['15 minutes', '25 minutes', '45 minutes', '60 minutes'], { title: 'Moonlight: start a focus session', placeHolder: 'A local timer. No sound, analytics or workspace tracking.' });
    if (duration) { session.start(Number.parseInt(duration, 10)); run(); }
  }));
}

module.exports = { FocusSession, timeLabel, registerFocus };
