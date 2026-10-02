# Khonsu Moonlight

A dark Visual Studio Code color theme built around a midnight-navy editor, pale text, and a small set of cool accents. Ice blue marks focus and links, muted lavender carries language structure, mint distinguishes strings and additions, and muted rose marks removals and errors. Warm sand highlights literals and types so common syntax remains easy to scan.

The package contributes one declarative color theme. It has no runtime code, activation events, injected styles, wallpaper, or extension dependencies. Workbench surfaces stay close to the editor background, with restrained borders and clear selection states.

![Khonsu Moonlight in VS Code](screenshots/vscode.png)

## Install from a VSIX

Download `khonsu-moonlight-0.1.0.vsix` from [GitHub Releases](https://github.com/khons-hu/khonsu-moonlight/releases). This is a GitHub release, not a Marketplace listing. To build the VSIX yourself, use the VS Code Extension Manager (`vsce`) from this directory:

```sh
npx @vscode/vsce package
```

Then in VS Code, run **Extensions: Install from VSIX...** and choose the generated `khonsu-moonlight-0.1.0.vsix`. Select **Khonsu Moonlight** from **Preferences: Color Theme**.

## Optional editor setup

After installing the theme, run **Profiles: Import Profile** and select [`config/khonsu-moonlight.code-profile`](config/khonsu-moonlight.code-profile) to create a separate profile with the optional settings and language extensions. Install the VSIX in that profile too, because the theme is not in the Marketplace. The profile contains only editor settings and a list of public extensions. It does not include account data, workspace history, MCP servers or credentials.

Alternatively, merge the preferences in [`config/settings.json`](config/settings.json) into your user settings. Review the values first, rather than replacing your existing file. [`config/extensions.json`](config/extensions.json) lists the suggested extensions. The theme works without any of them.

The setup uses Menlo with monospace fallbacks, compact text, no minimap, bracket guides and format on explicit save. Prettier covers web files and Markdown, Ruff formats Python and organizes imports on explicit save. ESLint, EditorConfig, YAML and Vue support are recommended. Project-specific `.prettierrc`, `.editorconfig`, Ruff and workspace settings take precedence over the personal formatting defaults. VS Code does not run format-on-save for Auto Save after a short delay, so use a normal save when you want formatting.

A matching [Codex theme import string](config/codex-theme.txt) is included. Import it under **Settings > Appearance > Dark theme > Import**. That preset was checked against the installed Codex theme format, but has not been applied or visually tested in Codex. Claude Desktop currently exposes dark mode and chat-font controls, without a custom background or palette import in the version inspected.

## Palette

| Role | Color |
| --- | --- |
| Midnight navy | `#0B111A` |
| Pale text | `#E8EDF2` |
| Ice blue | `#A9C7E8` |
| Muted lavender | `#B6A4DE` |
| Mint | `#7FC9AC` |
| Muted rose | `#F0959C` |

The theme targets VS Code `^1.100.0`. Syntax coloring includes common TextMate scopes and semantic tokens, with rules for JavaScript, TypeScript, Python, JSON, HTML, CSS, and Markdown. Exact coloring can vary by language extension and grammar.

## Verification

Version 0.1.0 was packaged and installed in VS Code 1.140.0 on macOS Apple silicon. The theme was visually checked on the included synthetic TypeScript sample. Prettier format-on-save was checked in VS Code, and the installed Ruff formatter normalized a synthetic Python sample from its CLI. The profile format was checked against VS Code's profile resource schema. The Codex preset remains an importable file, without a live Codex appearance check.
