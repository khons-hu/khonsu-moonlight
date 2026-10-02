'use strict';

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { applyPreset, mergeSettings } = require('./preset');
const { conflictingBackend } = require('./installer');
const vimSettings = require('../config/vscode-vim.json');
const neovimSettings = require('../config/vscode-neovim.json');
const runFile = promisify(execFile);

function supportsNeovim(version) {
  const match = /^NVIM v(\d+)\.(\d+)\.(\d+)/m.exec(version);
  return Boolean(match && (+match[1] > 0 || +match[2] >= 10));
}

function modalValues(vscode, backend) {
  const proposed = structuredClone(backend === 'vscodevim.vim' ? vimSettings : neovimSettings);
  // Preserve unrelated key delegation entries while backing up the original object.
  for (const [key, value] of Object.entries(proposed)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      proposed[key] = mergeSettings(vscode.workspace.getConfiguration().inspect(key)?.globalValue, value);
    }
  }
  return proposed;
}

function registerModal(vscode, context, catalog) {
  context.subscriptions.push(vscode.commands.registerCommand('moonlight.configureModal', async () => {
    const item = await vscode.window.showQuickPick(catalog.filter(entry => entry.exclusiveGroup === 'modal').map(entry => ({
      label: entry.label, detail: entry.description, ...entry
    })), {title: 'Moonlight: optional Vim or Neovim settings', placeHolder: 'Choose the backend enabled in this profile. Settings are backed up.'});
    if (!item) return;
    const conflict = conflictingBackend(vscode, catalog, item);
    if (conflict) {
      const choice = await vscode.window.showWarningMessage(`Disable ${conflict.label} in this profile before configuring ${item.label}. Only one should capture editing keys.`, 'Open conflicting extension');
      if (choice) await vscode.commands.executeCommand('extension.open', conflict.id);
      return;
    }
    if (!vscode.extensions.getExtension(item.id)) {
      const choice = await vscode.window.showInformationMessage(`${item.label} is not enabled in this window. Install it before applying its settings.`, 'Choose extension');
      if (choice) await vscode.commands.executeCommand('moonlight.installExtensions', [item.id]);
      return;
    }
    if (item.id === 'asvetliakov.vscode-neovim') {
      if (!vscode.workspace.isTrusted) {
        await vscode.window.showWarningMessage('Open a trusted workspace before checking the Neovim executable. No program was started.');
        return;
      }
      const executableSetting = vscode.workspace.getConfiguration('vscode-neovim').inspect(`neovimExecutablePaths.${process.platform}`);
      const executable = executableSetting?.globalValue || executableSetting?.defaultValue || 'nvim';
      try {
        const result = await runFile(executable, ['--version'], {timeout: 5000, maxBuffer: 65536});
        if (!supportsNeovim(result.stdout)) throw new Error('Neovim 0.10 or newer is required');
      } catch {
        await vscode.window.showWarningMessage('Neovim 0.10+ was not found at the configured executable path. Install it and set the path in VSCode Neovim settings before applying this preset.', 'Open setup guide').then(choice => choice && vscode.commands.executeCommand('moonlight.openGuide'));
        return;
      }
    }
    const changed = await applyPreset(vscode, context, modalValues(vscode, item.id));
    await vscode.window.showInformationMessage(`Moonlight updated ${changed} ${item.label} settings. Restore Previous Settings can recover your original values. Workspace settings still take precedence.`);
  }));
}

module.exports = { supportsNeovim, modalValues, registerModal };
