'use strict';

const BACKUP_KEY = 'moonlight.presetBackup';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const formattingEditorKeys = ['editor.formatOnSave', 'editor.formatOnPaste', 'editor.tabSize', 'editor.insertSpaces', 'editor.detectIndentation'];

function mergeSettings(previous, incoming) {
  const result = { ...(previous || {}) };
  for (const [key, value] of Object.entries(incoming)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergeSettings(result[key], value) : value;
  }
  return result;
}

function availablePresetValues(values, isAvailable) {
  const filtered = structuredClone(values);
  const missing = new Set();
  if (filtered['workbench.iconTheme'] && !isAvailable('pkief.material-icon-theme')) {
    delete filtered['workbench.iconTheme'];
    missing.add('pkief.material-icon-theme');
  }
  for (const [key, setting] of Object.entries(filtered)) {
    if (!key.startsWith('[')) continue;
    const formatter = setting['editor.defaultFormatter'];
    if (formatter && !isAvailable(formatter)) {
      delete setting['editor.defaultFormatter'];
      missing.add(formatter);
    }
    const actions = setting['editor.codeActionsOnSave'];
    if (actions && !isAvailable('charliermarsh.ruff')) {
      for (const action of Object.keys(actions)) {
        if (action.endsWith('.ruff')) { delete actions[action]; missing.add('charliermarsh.ruff'); }
      }
      if (!Object.keys(actions).length) delete setting['editor.codeActionsOnSave'];
    }
    if (!Object.keys(setting).length) delete filtered[key];
  }
  return { values: filtered, missing: [...missing] };
}

function presetGroups(settings) {
  return {
    appearance: Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith('workbench.') || key.startsWith('breadcrumbs.') || (key.startsWith('editor.') && !formattingEditorKeys.includes(key)))),
    formatting: Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith('[') || key.startsWith('files.') || key.startsWith('prettier.') || formattingEditorKeys.includes(key))),
    terminal: Object.fromEntries(Object.entries(settings).filter(([key]) => key.startsWith('terminal.')))
  };
}

async function applyPreset(vscode, context, values) {
  const config = vscode.workspace.getConfiguration();
  const backup = { ...(context.globalState.get(BACKUP_KEY) || {}) };
  let changed = 0;
  for (const [key, value] of Object.entries(values)) {
    const previous = config.inspect(key)?.globalValue;
    const next = key.startsWith('[') ? mergeSettings(previous, value) : value;
    if (same(previous, next)) continue;
    // Save before updating so a failed update/reload cannot lose the original value.
    if (!backup[key]) backup[key] = { hadValue: previous !== undefined, previous, applied: next };
    else backup[key].applied = next;
    await context.globalState.update(BACKUP_KEY, backup);
    await config.update(key, next, vscode.ConfigurationTarget.Global);
    changed++;
  }
  return changed;
}

async function restorePreset(vscode, context) {
  const config = vscode.workspace.getConfiguration();
  const backup = { ...(context.globalState.get(BACKUP_KEY) || {}) };
  const result = { restored: 0, retained: 0 };
  for (const [key, entry] of Object.entries(backup)) {
    if (!same(config.inspect(key)?.globalValue, entry.applied)) { result.retained++; continue; }
    await config.update(key, entry.hadValue ? entry.previous : undefined, vscode.ConfigurationTarget.Global);
    delete backup[key];
    result.restored++;
    await context.globalState.update(BACKUP_KEY, backup);
  }
  return result;
}

function registerPreset(vscode, context, settings) {
  const groups = presetGroups(settings);
  context.subscriptions.push(vscode.commands.registerCommand('moonlight.applyPreset', async () => {
    const selected = await vscode.window.showQuickPick([
      { label: 'Moonlight appearance', description: 'Theme, editor font, guides and layout', picked: true, key: 'appearance' },
      { label: 'Formatting', description: 'Prettier, Ruff and format on explicit save', picked: false, key: 'formatting' },
      { label: 'Integrated terminal', description: 'Font, cursor, contrast and spacing', picked: false, key: 'terminal' }
    ], { canPickMany: true, title: 'Moonlight: apply optional user settings', placeHolder: 'Choose groups. Existing values are backed up for Restore Previous Settings.', ignoreFocusOut: true });
    if (!selected?.length) return;
    const selectedValues = Object.assign({}, ...selected.map(item => groups[item.key]));
    const { values, missing } = availablePresetValues(selectedValues, id => Boolean(vscode.extensions.getExtension(id)));
    const changed = await applyPreset(vscode, context, values);
    const skipped = missing.length ? ` Skipped settings for unavailable tools: ${missing.join(', ')}.` : '';
    await vscode.window.showInformationMessage(`Moonlight updated ${changed} user settings. Workspace settings still take precedence.${skipped}`, 'Open User Settings').then(choice => {
      if (choice) return vscode.commands.executeCommand('workbench.action.openSettingsJson');
    });
  }), vscode.commands.registerCommand('moonlight.restorePreset', async () => {
    const result = await restorePreset(vscode, context);
    await vscode.window.showInformationMessage(`Restored ${result.restored} settings. ${result.retained} settings edited since setup were kept.`);
  }));
}

module.exports = { BACKUP_KEY, same, mergeSettings, availablePresetValues, presetGroups, applyPreset, restorePreset, registerPreset };
