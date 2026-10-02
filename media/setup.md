# Your Moonlight setup

The color theme works on its own. Every extra below is optional.

## Editor tools

Run **Moonlight: Install Recommended Extensions** to choose from the curated catalog. Core tools are preselected. Language tools, extra Git features, AI agents, Vim or Neovim and upstream VS Code Pets can be added individually. The 22-tool picker supports selecting all. Selecting both Vim and Neovim opens a second choice so only one backend is installed. Disable an enabled conflicting backend before switching. Available extensions are skipped and failed installs are listed separately. Cancellation stops before the next install.

AI extensions do not include a subscription or API credit. Installing one does not sign you in, choose your model, or change your account configuration.

## Settings

Run **Moonlight: Apply Optional Settings**. Pick appearance, formatting and/or the integrated terminal. Original user values are saved before modification. **Moonlight: Restore Previous Settings** restores unchanged preset values and keeps settings you have edited afterward. Workspace values still take precedence.

The appearance group selects Material Icon Theme only when that extension is available. The terminal font uses JetBrains Mono Nerd Font, with Menlo and monospace fallbacks.

## Vim or Neovim

Choose one backend per profile. **VSCodeVim** works without a native editor. **VSCode Neovim** needs Neovim 0.10+ installed locally. On macOS with Homebrew, use `brew install neovim`. If the executable is not found, set the user-level VSCode Neovim executable path, such as `/opt/homebrew/bin/nvim`, then restart that extension.

Run **Moonlight: Configure Vim or Neovim** after enabling the chosen extension. The Vim preset uses relative line numbers, mode cursors and Moonlight search colors, while retaining common VS Code Ctrl shortcuts. The Neovim preset keeps Ctrl-C with VS Code in insert mode. Settings can be restored with the usual backup command. Moonlight checks the user-level Neovim executable only on this command in a trusted workspace.

Separate `khonsu-moonlight-vim.code-profile` and `khonsu-moonlight-neovim.code-profile` files are bundled. Import one through VS Code's Profiles editor, then switch profiles when you want the other backend. The generic profile enables neither.

For native editors, `vim/colors/khonsu-moonlight.vim` and `nvim/colors/khonsu-moonlight.lua` contain original Moonlight colorschemes. Copy the chosen color file into your editor's user `colors` directory. Merge the matching example snippet into your existing vimrc/init.lua. Back up existing files first. The Neovim example guards its native UI block with `if not vim.g.vscode`. No dotfiles or external plugins are changed by the extension.

[Configure a modal editor](command:moonlight.configureModal)

## Pets and focus

Open the Moonlight icon in the Activity Bar, or run **Moonlight: Show Pets**. Choose a moon cat, fox, robot, penguin, Labrador, Sam Altman or Tibo Sottiaux (@thsottiaux), give it a name and choose its color. Sam and Tibo are cartoon fan characters. Click your companion or hold and stroke it to pet it. Toss the ball or press Play for a chase, then Rest for a nap and click to wake. Gentle breathing, blinking and tail movement keep it company. Motion can be switched off, pauses while hidden and respects OS reduced-motion preferences. The companion does not read your code or call a model.

**Moonlight: Start or Manage Focus Session** starts a 15, 25, 45 or 60-minute timer. Click its status-bar item to pause, resume or stop. It only runs after you start it and ends when VS Code reloads or closes.

## macOS shell and fonts

**Moonlight: Prepare macOS Terminal Setup** opens a terminal with a command ready to review. Press Enter yourself to run it. Homebrew must already be installed. It installs Starship, zsh-autosuggestions, zsh-syntax-highlighting and JetBrains Mono Nerd Font. It copies the Moonlight configs and appends an idempotent source block to `.zshrc`. Existing changed files are backed up under `~/.config/moonlight/backups/`.

[Prepare the terminal command](command:moonlight.prepareTerminal)

The script does not install Homebrew, use sudo, change your PATH, or change history retention. Open a fresh zsh terminal afterward.

## Other apps and wallpaper

**Moonlight: Open Setup Assets** reveals the bundled config directory:

- `Khonsu Moonlight.terminal`: import in macOS Terminal > Settings > Profiles.
- `codex-theme.txt`: copy the theme string into Codex's Appearance theme import.
- `khonsu-moonlight.code-profile`: import through VS Code's native Profiles editor if you prefer a separate profile.
- `moonlight-wallpaper.png`: choose it in your operating system's wallpaper settings.
- `starship.toml`: portable Starship configuration for other operating systems.

[Open setup assets](command:moonlight.openAssets)

Moonlight does not patch application CSS or apply settings in other applications automatically.
