#!/usr/bin/env bash
# Optional local setup. Moonlight only prepares this command, never runs it automatically.
set -euo pipefail

if [[ "$(uname -s)" != Darwin ]]; then
  printf '%s\n' 'This setup uses Homebrew on macOS. See the guide for portable Starship setup.'
  exit 1
fi
if ! command -v brew >/dev/null 2>&1; then
  printf '%s\n' 'Homebrew is required. Install it separately from https://brew.sh, then run this setup again.'
  exit 1
fi

MOONLIGHT_SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOONLIGHT_BACKUP_DIR="$HOME/.config/moonlight/backups/$(date +%Y%m%d-%H%M%S)-$$"
printf '%s\n' 'Installing Starship, zsh autosuggestions, syntax highlighting and JetBrains Mono Nerd Font.'
brew install starship zsh-autosuggestions zsh-syntax-highlighting
brew install --cask font-jetbrains-mono-nerd-font
mkdir -p "$HOME/.config/moonlight" "$MOONLIGHT_BACKUP_DIR"

moonlight_copy() {
  local source_file="$1" destination_file="$2" backup_name="$3"
  if [[ -e "$destination_file" ]]; then
    if cmp -s "$source_file" "$destination_file"; then return; fi
    cp -p "$destination_file" "$MOONLIGHT_BACKUP_DIR/$backup_name"
  fi
  cp "$source_file" "$destination_file"
}

moonlight_copy "$MOONLIGHT_SOURCE_DIR/starship.toml" "$HOME/.config/starship.toml" starship.toml
moonlight_copy "$MOONLIGHT_SOURCE_DIR/moonlight.zsh" "$HOME/.config/moonlight/moonlight.zsh" moonlight.zsh
if ! grep -Fq '# Khonsu Moonlight setup' "$HOME/.zshrc" 2>/dev/null; then
  if [[ -e "$HOME/.zshrc" ]]; then cp -p "$HOME/.zshrc" "$MOONLIGHT_BACKUP_DIR/zshrc"; fi
  cat >> "$HOME/.zshrc" <<'MOONLIGHT_ZSH'

# Khonsu Moonlight setup
if [[ -r "$HOME/.config/moonlight/moonlight.zsh" ]]; then
  source "$HOME/.config/moonlight/moonlight.zsh"
fi
MOONLIGHT_ZSH
fi
printf 'Ready. Open a new zsh terminal. Changed files were backed up in %s\n' "$MOONLIGHT_BACKUP_DIR"
printf '%s\n' 'The native Terminal preset, Codex import string and wallpaper remain optional manual imports.'
