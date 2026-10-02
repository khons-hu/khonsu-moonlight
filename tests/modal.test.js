'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseExclusive, conflictingBackend, installSelected } = require('../src/installer');
const { supportsNeovim, modalValues, registerModal } = require('../src/modal');
const catalog = require('../config/extension-catalog.json');
const vim = catalog.find(item => item.id === 'vscodevim.vim');
const neovim = catalog.find(item => item.id === 'asvetliakov.vscode-neovim');

test('select all resolves modal backends to one and keeps unrelated tools', async () => {
  const selected = await chooseExclusive({window: {showQuickPick: async choices => choices.find(item => item.id === neovim.id)}}, catalog, catalog.map(item => item.id));
  assert(selected.includes(neovim.id));
  assert(!selected.includes(vim.id));
  assert.equal(selected.length, catalog.length - 1);
});

test('cancelling backend choice cancels the installation selection', async () => {
  assert.equal(await chooseExclusive({window: {showQuickPick: async () => undefined}}, catalog, [vim.id, neovim.id]), undefined);
});

test('installer refuses two modal backends before any extension installation', async () => {
  await assert.rejects(installSelected({extensions: {getExtension() {throw new Error('must not inspect');}}}, catalog, [catalog[0].id, vim.id, neovim.id], {}, {}), /only one modal/);
});

test('an enabled conflicting backend is skipped without blocking unrelated installs', async () => {
  const calls = [];
  const host = {extensions: {getExtension: id => id === vim.id ? {} : undefined}, commands: {executeCommand: async (_, id) => calls.push(id)}};
  const result = await installSelected(host, catalog, [neovim.id, catalog[0].id], {isCancellationRequested: false}, {report() {}});
  assert.deepEqual(calls, [catalog[0].id]);
  assert.match(result.failed[0].message, /Disable VSCodeVim/);
});

test('internally disabled VSCodeVim does not conflict with Neovim', () => {
  assert.equal(conflictingBackend({extensions: {getExtension: id => id === vim.id ? {} : undefined}, workspace: {getConfiguration: () => ({get: () => true})}}, catalog, neovim), undefined);
});

test('modal preset retains custom key delegation and can re-enable Vim', () => {
  const old = {'<C-q>': false, '<C-f>': true};
  const values = modalValues({workspace: {getConfiguration: () => ({inspect: key => ({globalValue: key === 'vim.handleKeys' ? old : undefined})})}}, vim.id);
  assert.deepEqual(values['vim.handleKeys'], {...old, '<C-a>': false, '<C-c>': false, '<C-f>': false, '<C-s>': false, '<C-z>': false});
  assert.equal(values['vim.disableExtension'], false);
  assert.equal(old['<C-f>'], true);
});

test('Neovim version check accepts supported versions and rejects unrelated output', () => {
  for (const version of ['NVIM v0.10.0', 'NVIM v0.12.5\nBuild type: Release', 'NVIM v1.0.0']) assert.equal(supportsNeovim(version), true);
  for (const version of ['NVIM v0.9.5', 'VIM 9.1', '', 'NVIM vbad']) assert.equal(supportsNeovim(version), false);
});

test('Neovim configuration starts no process or writes in an untrusted workspace', async () => {
  let command;
  const notices = [];
  const host = {
    window: {showQuickPick: async () => neovim, showWarningMessage: async message => notices.push(message)},
    commands: {registerCommand: (_, handler) => {command = handler; return {dispose() {}};}},
    extensions: {getExtension: id => id === neovim.id ? {} : undefined},
    workspace: {isTrusted: false, getConfiguration() {throw new Error('must not read executable or update settings');}}
  };
  registerModal(host, {subscriptions: []}, catalog);
  await command();
  assert.match(notices[0], /trusted workspace/);
});
