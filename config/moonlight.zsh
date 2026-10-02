# Khonsu Moonlight zsh setup. Source this from ~/.zshrc if desired.

[[ -o interactive ]] || return

# Standard zsh completion system. This does not change shell history retention.
autoload -Uz compinit
compinit

# Keep duplicate commands and entries beginning with a space out of history.
# No history size, file, sharing, or retention settings are changed here.
setopt HIST_IGNORE_DUPS HIST_IGNORE_SPACE

# Emacs-style key bindings are the zsh default on a fresh configuration.
bindkey -e

# Quiet suggestions and command colors follow the same Moonlight palette.
typeset -g ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=#526174'
typeset -gA ZSH_HIGHLIGHT_STYLES
ZSH_HIGHLIGHT_STYLES[command]='fg=#A9C7E8'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=#A9C7E8'
ZSH_HIGHLIGHT_STYLES[alias]='fg=#A9C7E8'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=#B6A4DE'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=#7FC9AC'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=#7FC9AC'
ZSH_HIGHLIGHT_STYLES[path]='fg=#B6A4DE,underline'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=#F0959C,bold'

# Optional Homebrew plugins. Only load these exact, conventional paths.
if [[ -r /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
  source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
elif [[ -r /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
  source /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh
fi

if [[ -r /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
  source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
elif [[ -r /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
  source /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi

# Initialize Starship only when its executable is installed and available.
if (( $+commands[starship] )) && [[ "$TERM" != dumb ]]; then
  eval "$(starship init zsh)"
fi
