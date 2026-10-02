'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { installSelected } = require('../src/installer');
const { applyPreset, restorePreset, presetGroups, availablePresetValues, BACKUP_KEY } = require('../src/preset');
const { FocusSession, timeLabel } = require('../src/focus');
const catalog = require('../config/extension-catalog.json');

function mockSettings(initial = {}) {
  const values = structuredClone(initial);
  const state = {};
  return {
    values, state,
    vscode: { ConfigurationTarget: {Global: 1}, workspace: { getConfiguration: () => ({
      inspect: key => ({globalValue: values[key]}),
      update: async (key, value) => { if (value === undefined) delete values[key]; else values[key] = structuredClone(value); }
    }) } },
    context: {globalState: {get: key => structuredClone(state[key]), update: async (key, value) => {state[key] = structuredClone(value);} }}
  };
}

test('installer skips available IDs, deduplicates and records failure without retrying', async () => {
  const calls = [];
  const vscode = {
    extensions: {getExtension: id => id === catalog[0].id ? {} : undefined},
    commands: {executeCommand: async (_, id) => {calls.push(id); if (id === catalog[2].id) throw new Error('not compatible');}}
  };
  const result = await installSelected(vscode, catalog, [catalog[0].id, catalog[1].id.toUpperCase(), catalog[1].id, catalog[2].id], {isCancellationRequested: false}, {report() {}});
  assert.deepEqual(calls, [catalog[1].id, catalog[2].id]);
  assert.deepEqual(result.installed, [catalog[1].id]);
  assert.deepEqual(result.skipped, [catalog[0].id]);
  assert.equal(result.failed[0].message, 'not compatible');
});

test('installer honors cancellation before the next extension', async () => {
  const token = {isCancellationRequested: false};
  const calls = [];
  const vscode = {extensions: {getExtension() {}}, commands: {executeCommand: async (_, id) => {calls.push(id); token.isCancellationRequested = true;}}};
  const result = await installSelected(vscode, catalog, [catalog[0].id, catalog[1].id], token, {report() {}});
  assert.deepEqual(calls, [catalog[0].id]);
  assert.equal(result.cancelled, true);
});

test('installer rejects an unbundled ID before any install', async () => {
  const vscode = {extensions: {getExtension() {throw new Error('must not inspect');}}};
  await assert.rejects(installSelected(vscode, catalog, [catalog[0].id, 'unknown.publisher'], {}, {}), /Unknown extension/);
});

test('preset merges language settings and restores previous user values', async () => {
  const original = {'workbench.colorTheme': 'Other', '[python]': {'editor.wordWrap': 'on', 'editor.codeActionsOnSave': {'source.fixAll': 'explicit'}}};
  const mock = mockSettings(original);
  await applyPreset(mock.vscode, mock.context, {'workbench.colorTheme': 'Khonsu Moonlight', 'editor.minimap.enabled': false, '[python]': {'editor.defaultFormatter': 'charliermarsh.ruff', 'editor.codeActionsOnSave': {'source.organizeImports.ruff': 'explicit'}}});
  assert.equal(mock.values['[python]']['editor.wordWrap'], 'on');
  assert.equal(mock.values['[python]']['editor.codeActionsOnSave']['source.fixAll'], 'explicit');
  const result = await restorePreset(mock.vscode, mock.context);
  assert.equal(result.restored, 3);
  assert.deepEqual(mock.values, original);
});

test('restore keeps later user edits and repeated apply keeps the initial backup', async () => {
  const mock = mockSettings({'editor.fontSize': 16, 'workbench.colorTheme': 'Other'});
  await applyPreset(mock.vscode, mock.context, {'editor.fontSize': 13, 'workbench.colorTheme': 'Khonsu Moonlight'});
  await applyPreset(mock.vscode, mock.context, {'editor.fontSize': 13, 'workbench.colorTheme': 'Khonsu Moonlight'});
  mock.values['editor.fontSize'] = 15;
  const result = await restorePreset(mock.vscode, mock.context);
  assert.deepEqual(result, {restored: 1, retained: 1});
  assert.equal(mock.values['editor.fontSize'], 15);
  assert.equal(mock.state[BACKUP_KEY]['editor.fontSize'].previous, 16);
});

test('appearance selection does not change formatting preferences', () => {
  const groups = presetGroups(require('../config/settings.json'));
  assert.equal(groups.appearance['editor.tabSize'], undefined);
  assert.equal(groups.appearance['editor.formatOnSave'], undefined);
  assert.equal(groups.formatting['editor.tabSize'], 2);
});

test('missing optional formatters do not replace existing choices or add Ruff actions', async () => {
  const proposed = {'[python]': {'editor.defaultFormatter': 'charliermarsh.ruff', 'editor.tabSize': 4, 'editor.codeActionsOnSave': {'source.organizeImports.ruff': 'explicit'}}, '[markdown]': {'editor.defaultFormatter': 'esbenp.prettier-vscode', 'editor.wordWrap': 'on'}};
  const {values, missing} = availablePresetValues(proposed, () => false);
  assert.deepEqual(missing.sort(), ['charliermarsh.ruff', 'esbenp.prettier-vscode']);
  assert.equal(values['[python]']['editor.defaultFormatter'], undefined);
  assert.equal(values['[python]']['editor.codeActionsOnSave'], undefined);
  assert.equal(values['[markdown]']['editor.wordWrap'], 'on');
  const mock = mockSettings({'[python]': {'editor.defaultFormatter': 'another.formatter'}});
  await applyPreset(mock.vscode, mock.context, values);
  assert.equal(mock.values['[python]']['editor.defaultFormatter'], 'another.formatter');
  assert.equal(proposed['[python]']['editor.defaultFormatter'], 'charliermarsh.ruff');
});

test('focus timing handles pause, resume and delayed ticks without drift', () => {
  let now = 1000;
  const session = new FocusSession(() => now);
  session.start(1);
  now += 12500;
  session.pause();
  assert.equal(session.remaining(), 47500);
  now += 999000;
  assert.equal(session.remaining(), 47500);
  session.resume();
  now += 48000;
  assert.equal(session.remaining(), 0);
  assert.equal(timeLabel(47500), '00:48');
  session.stop();
  assert.equal(session.paused, false);
  assert.throws(() => session.start(0));
});
