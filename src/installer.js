'use strict';

function missingExtensions(catalog, installedIds) {
  const installed = new Set(installedIds.map(id => id.toLowerCase()));
  return catalog.filter(item => !installed.has(item.id.toLowerCase()));
}

async function installSelected(vscode, catalog, selectedIds, token, progress) {
  const allowed = new Map(catalog.map(item => [item.id.toLowerCase(), item]));
  const result = { installed: [], skipped: [], failed: [], cancelled: false };
  const selected = [...new Set(selectedIds.map(id => id.toLowerCase()))];
  if (selected.some(id => !allowed.has(id))) throw new Error('Unknown extension selection');
  const groups = selected.map(id => allowed.get(id).exclusiveGroup).filter(Boolean);
  if (new Set(groups).size !== groups.length) throw new Error('Choose only one modal editing extension');
  for (const id of selected) {
    if (token.isCancellationRequested) { result.cancelled = true; break; }
    if (vscode.extensions.getExtension(id)) { result.skipped.push(id); continue; }
    const conflict = conflictingBackend(vscode, catalog, allowed.get(id));
    if (conflict) {
      result.failed.push({id, message: `Disable ${conflict.label} in this profile before installing ${allowed.get(id).label}.`});
      continue;
    }
    progress.report({ message: `Installing ${allowed.get(id).label}` });
    try {
      await vscode.commands.executeCommand('workbench.extensions.installExtension', id);
      result.installed.push(id);
    } catch (error) {
      result.failed.push({ id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

function conflictingBackend(vscode, catalog, item) {
  if (!item.exclusiveGroup) return undefined;
  return catalog.find(other => other.id !== item.id && other.exclusiveGroup === item.exclusiveGroup
    && vscode.extensions.getExtension(other.id)
    && !(other.id === 'vscodevim.vim' && vscode.workspace?.getConfiguration('vim').get('disableExtension')));
}

async function chooseExclusive(vscode, catalog, ids) {
  let selected = [...ids];
  for (const group of new Set(catalog.map(item => item.exclusiveGroup).filter(Boolean))) {
    const choices = catalog.filter(item => item.exclusiveGroup === group && selected.includes(item.id));
    if (choices.length < 2) continue;
    const chosen = await vscode.window.showQuickPick(choices.map(item => ({label: item.label, detail: item.description, id: item.id})), {
      title: 'Moonlight: choose one modal editing backend',
      placeHolder: 'Vim and Neovim capture the same keys. Choose one, or cancel without installing.'
    });
    if (!chosen) return undefined;
    selected = selected.filter(id => !choices.some(item => item.id === id) || id === chosen.id);
  }
  return selected;
}

function registerInstaller(vscode, context, catalog) {
  const output = vscode.window.createOutputChannel('Khonsu Moonlight Setup');
  context.subscriptions.push(output, vscode.commands.registerCommand('moonlight.installExtensions', async preferredIds => {
    const choices = catalog.map(item => ({
      label: item.label,
      description: `${item.group} · ${item.id}`,
      detail: `${item.description}${vscode.extensions.getExtension(item.id) ? ' Available in this window. It will be skipped.' : ''}`,
      picked: (Array.isArray(preferredIds) ? preferredIds.includes(item.id) : item.recommended) && !vscode.extensions.getExtension(item.id),
      id: item.id
    }));
    const selected = await vscode.window.showQuickPick(choices, {
      canPickMany: true,
      title: 'Moonlight: choose extensions to install',
      placeHolder: 'Core tools are selected. Choose optional language, AI or fun extras, or select all.',
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: true
    });
    if (!selected?.length) return;
    const selectedIds = await chooseExclusive(vscode, catalog, selected.map(item => item.id));
    if (!selectedIds) return;
    const result = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Moonlight extension setup',
      cancellable: true
    }, (progress, token) => installSelected(vscode, catalog, selectedIds, token, progress));
    output.appendLine(JSON.stringify(result, null, 2));
    const message = `Moonlight: ${result.installed.length} installed, ${result.skipped.length} already present, ${result.failed.length} failed${result.cancelled ? '. Cancelled before the next install' : ''}.`;
    if (result.failed.length) {
      if (await vscode.window.showWarningMessage(message, 'Show details') === 'Show details') output.show();
    } else await vscode.window.showInformationMessage(message);
  }));
}

module.exports = { missingExtensions, installSelected, conflictingBackend, chooseExclusive, registerInstaller };
