# Khonsu Moonlight

![Khonsu Moonlight logo](icon.png)

A dark Visual Studio Code color theme built around a midnight-navy editor, pale text, and a small set of cool accents. Ice blue marks focus and links, muted lavender carries language structure, mint distinguishes strings and additions, and muted rose marks removals and errors. Warm sand highlights literals and types so common syntax remains easy to scan.

The package contributes one declarative color theme. It has no runtime code, activation events, injected styles, wallpaper, or extension dependencies. Workbench surfaces stay close to the editor background, with restrained borders and clear selection states.

![Khonsu Moonlight in VS Code](screenshots/vscode.png)

## Details

Real screenshots from VS Code on macOS. Click an image to inspect it at full size.

The two-line Starship prompt shows the current Git branch and detected Node version. `sleep 2.1` demonstrates timing. The harmless `false` command demonstrates exit code 1 and the rose error prompt.

[![Git, runtime, timing and exit status](screenshots/prompt-details.png)](screenshots/prompt-details.png)

The included TypeScript sample shows the syntax colours and bracket guides. The sample text is illustrative, not a test report.

[![TypeScript syntax colours up close](screenshots/syntax-details.png)](screenshots/syntax-details.png)

The shipped public profile uses JetBrains Mono Nerd Font at 14 px in the terminal, a line cursor and Prettier on save.

[![Public font and formatter settings](screenshots/settings-details.png)](screenshots/settings-details.png)

## Install

Download the [0.2.1 VSIX](https://github.com/khons-hu/khonsu-moonlight/raw/v0.2.1/dist/khonsu-moonlight-0.2.1.vsix). In VS Code, run **Extensions: Install from VSIX...** and choose the downloaded file.

Select **Khonsu Moonlight** from **Preferences: Color Theme**.

The current package is distributed here while Marketplace onboarding is in progress. [Earlier GitHub Releases](https://github.com/khons-hu/khonsu-moonlight/releases) remain available.

To build the current version yourself, use the VS Code Extension Manager (`vsce`) from this directory:

```sh
npx @vscode/vsce package
```

## Optional editor setup

After installing the theme, run **Profiles: Import Profile** and select [`config/khonsu-moonlight.code-profile`](config/khonsu-moonlight.code-profile) to create a separate profile with the optional settings and language extensions. Install Khonsu Moonlight in that profile too. The profile contains only editor settings and a list of public extensions. It does not include account data, workspace history, MCP servers or credentials.

Alternatively, merge the preferences in [`config/settings.json`](config/settings.json) into your user settings. Review the values first, rather than replacing your existing file. [`config/extensions.json`](config/extensions.json) lists the suggested extensions. The theme works without any of them.

The editor uses Menlo with monospace fallbacks. The terminal uses JetBrains Mono Nerd Font Mono (`JetBrainsMono NFM`) at 14px, with extra line spacing and a steady line cursor. The editor has no minimap, bracket guides and format on explicit save. Prettier covers web files and Markdown, Ruff formats Python and organizes imports on explicit save. ESLint, EditorConfig, YAML and Vue support are recommended. Project-specific `.prettierrc`, `.editorconfig`, Ruff and workspace settings take precedence over the personal formatting defaults. VS Code does not run format-on-save for Auto Save after a short delay, so use a normal save when you want formatting.

A matching [Codex theme import string](config/codex-theme.txt) is included. Import it under **Settings > Appearance > Dark theme > Import**. That preset was checked against the installed Codex theme format, but has not been applied or visually tested in Codex. Claude Desktop currently exposes dark mode and chat-font controls, without a custom background or palette import in the version inspected.

## Optional terminal setup

The terminal adds a lunar two-line [Starship](https://starship.rs/config/) prompt, shortened paths, Git branch and working-tree indicators, detected project runtimes, command duration after two seconds and the last command's failure code. Completions, muted autosuggestions and syntax highlighting come from the separate zsh setup. These shell files are optional and are not executed by the VS Code extension.

On macOS with Homebrew, install the public dependencies:

```sh
brew install starship zsh-autosuggestions zsh-syntax-highlighting
brew install --cask font-jetbrains-mono-nerd-font
```

Review [`config/starship.toml`](config/starship.toml) and [`config/moonlight.zsh`](config/moonlight.zsh), then copy them to `~/.config/starship.toml` and `~/.config/moonlight/moonlight.zsh`. Back up any existing files first. Add this to your existing `~/.zshrc`:

```zsh
if [[ -r "$HOME/.config/moonlight/moonlight.zsh" ]]; then
  source "$HOME/.config/moonlight/moonlight.zsh"
fi
```

Open a new terminal session. The setup keeps your PATH, history file, history sizes and history sharing settings. It ignores duplicate history entries and commands starting with a space. Homebrew plugins load only from their conventional Apple silicon or Intel locations, and missing dependencies are skipped. Starship is skipped for `TERM=dumb`. Other platforms can use the prompt config with their own Starship installation, but the optional plugin paths are macOS-specific.

[`examples/terminal-demo.sh`](examples/terminal-demo.sh) prints a one-shot colour preview. It does not fabricate build output, change files or make network calls.

For native macOS Terminal, import [`config/Khonsu Moonlight.terminal`](config/Khonsu%20Moonlight.terminal) through **Terminal > Settings > Profiles > Action menu > Import**. It includes matching ANSI colours and the installed font. The preset passed plist validation but has not been imported or visually tested. The screenshots show VS Code's integrated terminal.

![Moonlight shell in VS Code](screenshots/terminal.png)

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

Version 0.1.0 was packaged and installed in VS Code 1.140.0 on macOS Apple silicon. The theme was visually checked on the included synthetic TypeScript sample. Prettier format-on-save was checked in VS Code, and the installed Ruff formatter normalized a synthetic Python sample from its CLI. The profile format was checked against VS Code's profile resource schema.

Version 0.2.0 adds the terminal setup. The shell files passed syntax checks, the TOML parsed successfully, and the native Terminal preset passed plist validation. Starship 1.26.0, zsh-autosuggestions 0.7.1, zsh-syntax-highlighting 0.8.0 and Nerd Fonts 3.5.1 were installed on macOS. The live integrated terminal was checked in VS Code. The Codex and native macOS Terminal presets remain manual imports, without live appearance checks.
