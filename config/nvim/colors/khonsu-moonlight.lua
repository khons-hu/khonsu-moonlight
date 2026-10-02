-- Khonsu Moonlight: original standalone Neovim colorscheme (Neovim 0.8+).
-- No plugin manager, network requests, keymaps or editor-wide behavior changes.
-- Enable termguicolors in your own config for the exact RGB palette.

vim.opt.background = "dark"
vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") == 1 then
  vim.cmd("syntax reset")
end
vim.g.colors_name = "khonsu-moonlight"

local p = {
  bg = "#0B111A", panel = "#0E1621", surface = "#111C29", line = "#111A25",
  border = "#334356", selection = "#29435F", fg = "#E8EDF2", soft = "#C7D5E3",
  muted = "#AAB8C7", comment = "#8292A5", dim = "#718096", blue = "#A9C7E8",
  lavender = "#B6A4DE", mint = "#7FC9AC", rose = "#F0959C", sand = "#E3C98E",
  cyan = "#83C7D8", errorbg = "#321F28", warnbg = "#30291B",
  infobg = "#14283A", hintbg = "#182B29", searchbg = "#846FA8",
}
local cterm = {
  [p.bg] = 233, [p.panel] = 234, [p.surface] = 235, [p.line] = 234,
  [p.border] = 238, [p.selection] = 239, [p.fg] = 255, [p.soft] = 252,
  [p.muted] = 249, [p.comment] = 246, [p.dim] = 244, [p.blue] = 153,
  [p.lavender] = 147, [p.mint] = 115, [p.rose] = 210, [p.sand] = 180,
  [p.cyan] = 116, [p.errorbg] = 235, [p.warnbg] = 235,
  [p.infobg] = 236, [p.hintbg] = 235, [p.searchbg] = 103,
}
local function hi(name, value)
  if value.fg then value.ctermfg = cterm[value.fg] end
  if value.bg then value.ctermbg = cterm[value.bg] end
  vim.api.nvim_set_hl(0, name, value)
end

local groups = {
  Normal = { fg = p.fg, bg = p.bg }, NormalNC = { fg = p.soft, bg = p.bg },
  NormalFloat = { fg = p.soft, bg = p.surface }, FloatBorder = { fg = p.border, bg = p.surface },
  FloatTitle = { fg = p.blue, bg = p.surface, bold = true },
  Cursor = { fg = p.bg, bg = p.blue }, lCursor = { fg = p.bg, bg = p.lavender },
  CursorLine = { bg = p.line }, CursorColumn = { bg = p.line }, ColorColumn = { bg = p.surface },
  LineNr = { fg = p.dim, bg = p.bg }, CursorLineNr = { fg = p.blue, bg = p.line, bold = true },
  SignColumn = { fg = p.dim, bg = p.bg }, FoldColumn = { fg = p.dim, bg = p.bg },
  Folded = { fg = p.comment, bg = p.surface }, NonText = { fg = p.border },
  EndOfBuffer = { fg = p.border, bg = p.bg }, Whitespace = { fg = p.border },
  SpecialKey = { fg = p.border }, Conceal = { fg = p.comment },
  Visual = { fg = p.fg, bg = p.selection }, VisualNOS = { link = "Visual" },
  Search = { fg = p.fg, bg = p.selection }, IncSearch = { fg = p.fg, bg = p.searchbg, bold = true },
  CurSearch = { link = "IncSearch" }, MatchParen = { fg = p.blue, bg = p.selection, bold = true },
  StatusLine = { fg = p.soft, bg = p.surface }, StatusLineNC = { fg = p.comment, bg = p.panel },
  WinSeparator = { fg = p.border, bg = p.panel }, VertSplit = { link = "WinSeparator" },
  WinBar = { fg = p.soft, bg = p.panel }, WinBarNC = { fg = p.comment, bg = p.panel },
  TabLine = { fg = p.muted, bg = p.panel }, TabLineSel = { fg = p.blue, bg = p.surface, bold = true },
  TabLineFill = { bg = p.panel }, Pmenu = { fg = p.soft, bg = p.surface },
  PmenuSel = { fg = p.fg, bg = p.selection }, PmenuSbar = { bg = p.panel }, PmenuThumb = { bg = p.dim },
  WildMenu = { fg = p.bg, bg = p.blue, bold = true }, Title = { fg = p.blue, bold = true },
  Directory = { fg = p.blue }, Question = { fg = p.mint }, MoreMsg = { fg = p.mint },
  ModeMsg = { fg = p.lavender, bold = true }, ErrorMsg = { fg = p.rose, bold = true },
  WarningMsg = { fg = p.sand }, QuickFixLine = { fg = p.fg, bg = p.selection },
  Comment = { fg = p.comment, italic = true }, Constant = { fg = p.sand },
  String = { fg = p.mint }, Character = { fg = p.mint }, Number = { fg = p.sand },
  Boolean = { fg = p.lavender }, Float = { fg = p.sand }, Identifier = { fg = p.soft },
  Function = { fg = p.cyan }, Statement = { fg = p.lavender }, Operator = { fg = p.muted },
  PreProc = { fg = p.lavender }, Type = { fg = p.sand }, Special = { fg = p.sand },
  Delimiter = { fg = p.muted }, SpecialComment = { fg = p.muted, italic = true },
  Underlined = { fg = p.cyan, underline = true }, Ignore = { fg = p.dim },
  Error = { fg = p.fg, bg = p.errorbg }, Todo = { fg = p.sand, bg = p.surface, bold = true },
  DiffAdd = { fg = p.mint, bg = p.hintbg }, DiffChange = { fg = p.blue, bg = p.infobg },
  DiffDelete = { fg = p.rose, bg = p.errorbg }, DiffText = { fg = p.fg, bg = p.selection, bold = true },
  Added = { fg = p.mint }, Changed = { fg = p.blue }, Removed = { fg = p.rose },
  SpellBad = { sp = p.rose, undercurl = true }, SpellCap = { sp = p.sand, undercurl = true },
  SpellRare = { sp = p.lavender, undercurl = true }, SpellLocal = { sp = p.cyan, undercurl = true },
  DiagnosticDeprecated = { fg = p.muted, strikethrough = true }, DiagnosticUnnecessary = { fg = p.dim },
  LspReferenceText = { bg = p.selection }, LspReferenceRead = { bg = p.selection },
  LspReferenceWrite = { bg = p.selection, underline = true },
  LspSignatureActiveParameter = { fg = p.sand, bold = true },
}
for name, value in pairs(groups) do hi(name, value) end

for severity, colors in pairs({
  Error = { p.rose, p.errorbg }, Warn = { p.sand, p.warnbg },
  Info = { p.blue, p.infobg }, Hint = { p.mint, p.hintbg }, Ok = { p.mint, p.hintbg },
}) do
  hi("Diagnostic" .. severity, { fg = colors[1] })
  hi("DiagnosticSign" .. severity, { fg = colors[1], bg = p.bg })
  hi("DiagnosticFloating" .. severity, { fg = colors[1], bg = p.surface })
  hi("DiagnosticVirtualText" .. severity, { fg = colors[1], bg = colors[2] })
  hi("DiagnosticVirtualLines" .. severity, { fg = colors[1] })
  hi("DiagnosticUnderline" .. severity, { sp = colors[1], undercurl = true })
end

-- Built-in Tree-sitter captures and LSP semantic tokens, when present.
-- Defining captures does not install parsers or language servers.
local links = {
  ["@comment"] = "Comment", ["@string"] = "String", ["@character"] = "Character",
  ["@string.escape"] = "Special", ["@string.regexp"] = "Removed", ["@string.special.url"] = "Underlined",
  ["@number"] = "Number", ["@number.float"] = "Float", ["@boolean"] = "Boolean",
  ["@constant"] = "Constant", ["@constant.builtin"] = "Boolean", ["@constant.macro"] = "PreProc",
  ["@variable"] = "Identifier", ["@variable.parameter"] = "Identifier",
  ["@variable.member"] = "Directory", ["@variable.builtin"] = "Statement",
  ["@function"] = "Function", ["@function.call"] = "Function", ["@function.method"] = "Function",
  ["@function.method.call"] = "Function", ["@function.builtin"] = "Function", ["@function.macro"] = "PreProc",
  ["@constructor"] = "Type", ["@keyword"] = "Statement", ["@keyword.function"] = "Statement",
  ["@keyword.operator"] = "Operator", ["@operator"] = "Operator", ["@type"] = "Type",
  ["@type.builtin"] = "Type", ["@attribute"] = "PreProc", ["@module"] = "Directory",
  ["@label"] = "Directory", ["@property"] = "Directory", ["@punctuation"] = "Delimiter",
  ["@punctuation.bracket"] = "Delimiter", ["@punctuation.delimiter"] = "Delimiter",
  ["@tag"] = "Removed", ["@tag.attribute"] = "Directory", ["@tag.delimiter"] = "Delimiter",
  ["@markup.heading"] = "Title", ["@markup.raw"] = "String", ["@markup.link"] = "Underlined",
  ["@markup.link.url"] = "Underlined", ["@markup.quote"] = "Comment", ["@markup.list"] = "Special",
  ["@diff.plus"] = "Added", ["@diff.minus"] = "Removed", ["@diff.delta"] = "Changed",
  ["@lsp.type.namespace"] = "Directory", ["@lsp.type.class"] = "Type", ["@lsp.type.interface"] = "String",
  ["@lsp.type.enum"] = "Statement", ["@lsp.type.struct"] = "Type", ["@lsp.type.type"] = "Type",
  ["@lsp.type.typeParameter"] = "Type", ["@lsp.type.function"] = "Function", ["@lsp.type.method"] = "Function",
  ["@lsp.type.parameter"] = "Identifier", ["@lsp.type.variable"] = "Identifier",
  ["@lsp.type.property"] = "Directory", ["@lsp.type.enumMember"] = "Statement",
  ["@lsp.type.keyword"] = "Statement", ["@lsp.type.modifier"] = "Statement",
  ["@lsp.type.comment"] = "Comment", ["@lsp.type.string"] = "String", ["@lsp.type.number"] = "Number",
  ["@lsp.type.regexp"] = "Removed", ["@lsp.type.operator"] = "Operator", ["@lsp.type.decorator"] = "PreProc",
  ["@lsp.mod.deprecated"] = "DiagnosticDeprecated",
  markdownH1 = "Title", markdownH2 = "Title", markdownH3 = "Title", markdownCode = "String",
  markdownCodeBlock = "String", markdownLinkText = "Underlined", htmlTag = "Removed",
  htmlTagName = "Removed", htmlArg = "Directory", jsonKeyword = "Directory",
}
for name, target in pairs(links) do hi(name, { link = target }) end
hi("@markup.strong", { fg = p.fg, bold = true })
hi("@markup.italic", { fg = p.fg, italic = true })
hi("@markup.strikethrough", { fg = p.muted, strikethrough = true })

local terminal = {
  "#111C29", p.rose, p.mint, p.sand, p.blue, p.lavender, p.cyan, p.fg,
  p.dim, "#FFADB3", "#9BE0C2", "#F1D9A6", "#D1E2F5", "#CEBCEF", "#A6E1ED", "#FFFFFF",
}
for index, color in ipairs(terminal) do vim.g["terminal_color_" .. (index - 1)] = color end
