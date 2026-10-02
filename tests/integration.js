'use strict';
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { applyPreset, restorePreset } = require('../src/preset');

async function run() {
  const resultFile = process.env.MOONLIGHT_TEST_RESULT || path.resolve(__dirname, '../.vscode-test/host-test-result.json');
  const evidence = { vscode: vscode.version, checks: [], status: 'running' };
  try {
    const extension = vscode.extensions.getExtension('khons-hu.khonsu-moonlight');
    assert.ok(extension, 'Development extension is available');
    await extension.activate();
    assert.equal(extension.isActive, true);
    evidence.checks.push('Extension activates in the real VS Code extension host');
    const commands = await vscode.commands.getCommands(true);
    for (const entry of extension.packageJSON.contributes.commands) assert.ok(commands.includes(entry.command), entry.command);
    evidence.checks.push('All ten contributed commands are registered');
    const data = {};
    const context = {globalState: {get: key => data[key], update: async (key, value) => {data[key] = structuredClone(value);}}};
    const original = vscode.workspace.getConfiguration().inspect('editor.fontSize').globalValue;
    try {
      await applyPreset(vscode, context, {'editor.fontSize': 17, '[python]': {'editor.defaultFormatter': 'charliermarsh.ruff'}});
      assert.equal(vscode.workspace.getConfiguration().inspect('editor.fontSize').globalValue, 17);
      assert.equal(vscode.workspace.getConfiguration().inspect('[python]').globalValue['editor.defaultFormatter'], 'charliermarsh.ruff');
      evidence.checks.push('Preset applies scalar and language settings using the real configuration API');
    } finally {
      const restored = await restorePreset(vscode, context);
      assert.equal(restored.retained, 0);
      assert.equal(vscode.workspace.getConfiguration().inspect('editor.fontSize').globalValue, original);
      evidence.checks.push('Restore recovers original settings and removes previously unset values');
    }
    await vscode.commands.executeCommand('moonlight.showPets');
    evidence.checks.push('Moonlight pet view opens without an extension-host error');
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed'; evidence.error = error.stack || String(error);
    throw error;
  } finally {
    fs.mkdirSync(path.dirname(resultFile), {recursive: true});
    fs.writeFileSync(resultFile, JSON.stringify(evidence, null, 2) + '\n');
  }
}
module.exports = { run };
