-- Optional snippet. Merge into your existing init.lua, do not replace it.
-- Copy colors/khonsu-moonlight.lua into stdpath("config") .. "/colors/" first.
-- Check your directory with :lua print(vim.fn.stdpath("config"))
-- Exact colors need a truecolor-compatible terminal. Set this false if needed
-- to use the theme's 256-color approximation instead.
-- VS Code Neovim uses VS Code's theme and surfaces. Keep this native-editor
-- appearance block outside that embedded session.
if not vim.g.vscode then
  vim.opt.termguicolors = true
  vim.cmd.colorscheme("khonsu-moonlight")
end

-- Optional navigation preferences, uncomment only what you want:
-- if not vim.g.vscode then
--   vim.opt.number = true
--   vim.opt.relativenumber = true
--   vim.opt.cursorline = true
--   vim.opt.signcolumn = "yes"
-- end
