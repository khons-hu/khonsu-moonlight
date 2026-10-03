'use strict';

const vscode = require('vscode');
const { registerInstaller } = require('./installer');
const { registerPreset } = require('./preset');
const { registerFocus } = require('./focus');
const { registerPets } = require('./pets');
const { registerModal } = require('./modal');
const catalog = require('../config/extension-catalog.json');
const settings = require('../config/settings.json');

function quoteShell(value) { return `'${value.replace(/'/g, `'"'"'`)}'`; }

function activate(context) {
  registerInstaller(vscode, context, catalog);
  registerPreset(vscode, context, settings);
  registerFocus(vscode, context);
  registerPets(vscode, context);
  registerModal(vscode, context, catalog);
  const guide = vscode.Uri.joinPath(context.extensionUri, 'media', 'setup.md');
  context.subscriptions.push(
    vscode.commands.registerCommand('moonlight.setup', async () => {
      const choice = await vscode.window.showQuickPick([
        { label: 'Install recommended extensions', description: 'Choose individual tools, including optional extras', command: 'moonlight.installExtensions' },
        { label: 'Apply Moonlight settings', description: 'Choose appearance, formatting and terminal presets', command: 'moonlight.applyPreset' },
        { label: 'Vim or Neovim editing', description: 'Configure one optional modal editing backend', command: 'moonlight.configureModal' },
        { label: 'Meet your Moonlight pet', description: 'Choose an optional companion', command: 'moonlight.showPets' },
        { label: 'Start a focus session', description: 'A small local timer in the status bar', command: 'moonlight.focus' },
        { label: 'Terminal, fonts and wallpaper', description: 'Open the optional setup guide', command: 'moonlight.openGuide' },
        { label: 'Restore previous settings', description: 'Restore settings changed by the preset', command: 'moonlight.restorePreset' }
      ], { title: 'Khonsu Moonlight setup', placeHolder: 'Everything is optional. The color theme works on its own.' });
      if (choice) await vscode.commands.executeCommand(choice.command);
    }),
    vscode.commands.registerCommand('moonlight.openGuide', () => vscode.commands.executeCommand('markdown.showPreview', guide)),
    vscode.commands.registerCommand('moonlight.prepareTerminal', async () => {
      if (process.platform !== 'darwin') {
        await vscode.window.showInformationMessage('The Homebrew setup is for macOS. The guide includes the portable Starship preset.');
        return vscode.commands.executeCommand('moonlight.openGuide');
      }
      const terminal = vscode.window.createTerminal({ name: 'Moonlight setup', cwd: context.extensionUri.fsPath });
      terminal.show();
      const script = vscode.Uri.joinPath(context.extensionUri, 'config', 'setup-macos.sh').fsPath;
      terminal.sendText(`bash ${quoteShell(script)}`, false);
      await vscode.window.showInformationMessage('The setup command is ready in the terminal. Review it and press Enter to install Homebrew dependencies and copy configs with backups.');
    }),
    vscode.commands.registerCommand('moonlight.openAssets', () => vscode.commands.executeCommand('revealFileInOS', vscode.Uri.joinPath(context.extensionUri, 'config', 'moonlight-wallpaper.png')))
  );
}

module.exports = { activate, quoteShell };
