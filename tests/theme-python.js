'use strict';

// Exercise the real bundled Python grammar, without requiring a language server.
// VSCODE_PYTHON_GRAMMAR can point to another VS Code installation on Windows/Linux.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Registry, parseRawGrammar } = require('vscode-textmate');
const { loadWASM, OnigScanner, OnigString } = require('vscode-oniguruma');

async function main() {
  const candidates = [
    process.env.VSCODE_PYTHON_GRAMMAR,
    '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/python/syntaxes/MagicPython.tmLanguage.json',
    '/usr/share/code/resources/app/extensions/python/syntaxes/MagicPython.tmLanguage.json',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs/Microsoft VS Code/resources/app/extensions/python/syntaxes/MagicPython.tmLanguage.json')
  ].filter(Boolean);
  const grammarFile = candidates.find(file => fs.existsSync(file));
  assert.ok(grammarFile, 'Set VSCODE_PYTHON_GRAMMAR to the bundled MagicPython.tmLanguage.json');
  const theme = JSON.parse(fs.readFileSync(process.env.MOONLIGHT_THEME_FILE || path.join(__dirname, '../themes/khonsu-moonlight-color-theme.json')));
  await loadWASM(fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')));
  const registry = new Registry({
    onigLib: Promise.resolve({ createOnigScanner: patterns => new OnigScanner(patterns), createOnigString: value => new OnigString(value) }),
    theme: { settings: [{ settings: { foreground: theme.colors['editor.foreground'], background: theme.colors['editor.background'] } }, ...theme.tokenColors] },
    loadGrammar: async scope => scope === 'source.python' ? parseRawGrammar(fs.readFileSync(grammarFile, 'utf8'), grammarFile) : null
  });
  try {
    const grammar = await registry.loadGrammar('source.python');
    const colors = registry.getColorMap();
    function color(line, word) {
      const offset = line.indexOf(word);
      assert.ok(offset >= 0);
      const { tokens } = grammar.tokenizeLine2(line, null);
      let metadata;
      for (let i = 0; i < tokens.length && tokens[i] <= offset; i += 2) metadata = tokens[i + 1];
      return colors[(metadata >>> 15) & 0x1ff];
    }
    const callLine = 'result = worker.resolve(ticket, retries=3, label="Ready")';
    const call = color(callLine, 'resolve');
    const variable = color(callLine, 'result');
    const parameter = color(callLine, 'retries');
    const string = color(callLine, 'Ready');
    const number = color(callLine, '3');
    const property = color('value = ticket.priority', 'priority');
    const decorator = color('@dataclass', 'dataclass');
    assert.notEqual(call, variable, 'Python calls must not fall back to plain text');
    assert.notEqual(property, variable, 'Python attributes must not fall back to plain text');
    assert.notEqual(parameter, variable, 'Named arguments need a distinct colour');
    assert.notEqual(call, string, 'A call rule must not swallow string arguments');
    assert.notEqual(call, number, 'A call rule must not swallow numeric arguments');
    assert.notEqual(call, decorator, 'Decorators must remain distinct from calls');
    assert.equal(call, theme.semanticTokenColors.function, 'Grammar and semantic call colours agree');
    assert.equal(parameter, theme.semanticTokenColors.parameter, 'Grammar and semantic parameter colours agree');
    assert.equal(theme.semanticHighlighting, true, 'The theme opts into semantic highlighting');
    console.log(JSON.stringify({ status: 'passed', grammarFile, colors: { call, variable, parameter, property, string, number, decorator } }, null, 2));
  } finally { registry.dispose(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
