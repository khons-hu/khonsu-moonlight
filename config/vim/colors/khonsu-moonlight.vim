" Khonsu Moonlight: original standalone Vim colorscheme. No plugins required.
" Exact RGB colors use :set termguicolors in a compatible terminal.
" A 256-color / basic ANSI approximation is available without truecolor.

set background=dark
highlight clear
if exists('syntax_on')
  syntax reset
endif
let g:colors_name = 'khonsu-moonlight'

" [RGB, xterm-256 approximation, basic terminal color]
let s:palette = {
      \ 'none': ['NONE', 'NONE', 'NONE'],
      \ 'bg': ['#0B111A', 233, 'Black'],
      \ 'panel': ['#0E1621', 234, 'Black'],
      \ 'surface': ['#111C29', 235, 'Black'],
      \ 'line': ['#111A25', 234, 'Black'],
      \ 'border': ['#334356', 238, 'DarkGray'],
      \ 'selection': ['#29435F', 239, 'DarkBlue'],
      \ 'fg': ['#E8EDF2', 255, 'White'],
      \ 'soft': ['#C7D5E3', 252, 'LightGray'],
      \ 'muted': ['#AAB8C7', 249, 'LightGray'],
      \ 'comment': ['#8292A5', 246, 'DarkGray'],
      \ 'dim': ['#718096', 244, 'DarkGray'],
      \ 'blue': ['#A9C7E8', 153, 'LightBlue'],
      \ 'lavender': ['#B6A4DE', 147, 'LightMagenta'],
      \ 'mint': ['#7FC9AC', 115, 'LightGreen'],
      \ 'rose': ['#F0959C', 210, 'LightRed'],
      \ 'sand': ['#E3C98E', 180, 'LightYellow'],
      \ 'cyan': ['#83C7D8', 116, 'LightCyan'],
      \ 'errorbg': ['#321F28', 235, 'DarkRed'],
      \ 'warnbg': ['#30291B', 235, 'Brown'],
      \ 'infobg': ['#14283A', 236, 'DarkBlue'],
      \ 'hintbg': ['#182B29', 235, 'DarkGreen'],
      \ 'searchbg': ['#846FA8', 103, 'DarkMagenta']}

function! s:hi(group, fg, bg, attributes, ...) abort
  let l:fg = s:palette[a:fg]
  let l:bg = s:palette[a:bg]
  let l:index = &t_Co >= 256 ? 1 : 2
  execute 'highlight ' . a:group
        \ . ' guifg=' . l:fg[0] . ' guibg=' . l:bg[0]
        \ . ' ctermfg=' . l:fg[l:index] . ' ctermbg=' . l:bg[l:index]
        \ . ' gui=' . a:attributes . ' cterm=' . substitute(a:attributes, 'undercurl', 'underline', 'g')
  if a:0
    execute 'highlight ' . a:group . ' guisp=' . s:palette[a:1][0]
  endif
endfunction

" Editor surfaces and navigation.
call s:hi('Normal', 'fg', 'bg', 'NONE')
call s:hi('NormalNC', 'soft', 'bg', 'NONE')
call s:hi('Cursor', 'bg', 'blue', 'NONE')
call s:hi('lCursor', 'bg', 'lavender', 'NONE')
call s:hi('CursorLine', 'none', 'line', 'NONE')
call s:hi('CursorColumn', 'none', 'line', 'NONE')
call s:hi('ColorColumn', 'none', 'surface', 'NONE')
call s:hi('LineNr', 'dim', 'bg', 'NONE')
call s:hi('CursorLineNr', 'blue', 'line', 'bold')
call s:hi('SignColumn', 'dim', 'bg', 'NONE')
call s:hi('FoldColumn', 'dim', 'bg', 'NONE')
call s:hi('Folded', 'comment', 'surface', 'NONE')
call s:hi('NonText', 'border', 'none', 'NONE')
call s:hi('EndOfBuffer', 'border', 'bg', 'NONE')
call s:hi('SpecialKey', 'border', 'none', 'NONE')
call s:hi('Conceal', 'comment', 'none', 'NONE')
call s:hi('Visual', 'fg', 'selection', 'NONE')
call s:hi('VisualNOS', 'fg', 'selection', 'NONE')
call s:hi('Search', 'fg', 'selection', 'NONE')
call s:hi('IncSearch', 'fg', 'searchbg', 'bold')
highlight! link CurSearch IncSearch
call s:hi('MatchParen', 'blue', 'selection', 'bold')
call s:hi('StatusLine', 'soft', 'surface', 'NONE')
call s:hi('StatusLineNC', 'comment', 'panel', 'NONE')
call s:hi('VertSplit', 'border', 'panel', 'NONE')
highlight! link WinSeparator VertSplit
call s:hi('TabLine', 'muted', 'panel', 'NONE')
call s:hi('TabLineSel', 'blue', 'surface', 'bold')
call s:hi('TabLineFill', 'none', 'panel', 'NONE')
call s:hi('Pmenu', 'soft', 'surface', 'NONE')
call s:hi('PmenuSel', 'fg', 'selection', 'NONE')
call s:hi('PmenuSbar', 'none', 'panel', 'NONE')
call s:hi('PmenuThumb', 'none', 'dim', 'NONE')
call s:hi('WildMenu', 'bg', 'blue', 'bold')
call s:hi('Title', 'blue', 'none', 'bold')
call s:hi('Directory', 'blue', 'none', 'NONE')
call s:hi('Question', 'mint', 'none', 'NONE')
call s:hi('MoreMsg', 'mint', 'none', 'NONE')
call s:hi('ModeMsg', 'lavender', 'none', 'bold')
call s:hi('ErrorMsg', 'rose', 'none', 'bold')
call s:hi('WarningMsg', 'sand', 'none', 'NONE')
call s:hi('QuickFixLine', 'fg', 'selection', 'NONE')

" Common syntax groups inherited by Vim's language grammars.
call s:hi('Comment', 'comment', 'none', 'italic')
call s:hi('Constant', 'sand', 'none', 'NONE')
call s:hi('String', 'mint', 'none', 'NONE')
call s:hi('Character', 'mint', 'none', 'NONE')
call s:hi('Number', 'sand', 'none', 'NONE')
call s:hi('Boolean', 'lavender', 'none', 'NONE')
call s:hi('Float', 'sand', 'none', 'NONE')
call s:hi('Identifier', 'soft', 'none', 'NONE')
call s:hi('Function', 'cyan', 'none', 'NONE')
call s:hi('Statement', 'lavender', 'none', 'NONE')
call s:hi('Operator', 'muted', 'none', 'NONE')
call s:hi('PreProc', 'lavender', 'none', 'NONE')
call s:hi('Type', 'sand', 'none', 'NONE')
call s:hi('Special', 'sand', 'none', 'NONE')
call s:hi('Delimiter', 'muted', 'none', 'NONE')
call s:hi('SpecialComment', 'muted', 'none', 'italic')
call s:hi('Underlined', 'cyan', 'none', 'underline')
call s:hi('Ignore', 'dim', 'none', 'NONE')
call s:hi('Error', 'fg', 'errorbg', 'NONE')
call s:hi('Todo', 'sand', 'surface', 'bold')
call s:hi('DiffAdd', 'mint', 'hintbg', 'NONE')
call s:hi('DiffChange', 'blue', 'infobg', 'NONE')
call s:hi('DiffDelete', 'rose', 'errorbg', 'NONE')
call s:hi('DiffText', 'fg', 'selection', 'bold')
call s:hi('Added', 'mint', 'none', 'NONE')
call s:hi('Changed', 'blue', 'none', 'NONE')
call s:hi('Removed', 'rose', 'none', 'NONE')
call s:hi('SpellBad', 'none', 'none', 'undercurl', 'rose')
call s:hi('SpellCap', 'none', 'none', 'undercurl', 'sand')
call s:hi('SpellRare', 'none', 'none', 'undercurl', 'lavender')
call s:hi('SpellLocal', 'none', 'none', 'undercurl', 'cyan')

" Optional LSP/diagnostic clients can use these groups. No client is installed.
for [s:severity, s:color] in items({'Error': 'rose', 'Warn': 'sand', 'Info': 'blue', 'Hint': 'mint'})
  call s:hi('Diagnostic' . s:severity, s:color, 'none', 'NONE')
  call s:hi('DiagnosticUnderline' . s:severity, 'none', 'none', 'undercurl', s:color)
  execute 'highlight! link DiagnosticSign' . s:severity . ' Diagnostic' . s:severity
  execute 'highlight! link DiagnosticVirtualText' . s:severity . ' Diagnostic' . s:severity
endfor

highlight! link markdownH1 Title
highlight! link markdownH2 Title
highlight! link markdownH3 Title
highlight! link markdownCode String
highlight! link markdownCodeBlock String
highlight! link markdownLinkText Underlined
highlight! link htmlTag Removed
highlight! link htmlTagName Removed
highlight! link htmlArg Identifier
highlight! link jsonKeyword Directory

let g:terminal_ansi_colors = ['#111C29', '#F0959C', '#7FC9AC', '#E3C98E',
      \ '#A9C7E8', '#B6A4DE', '#83C7D8', '#E8EDF2', '#718096', '#FFADB3',
      \ '#9BE0C2', '#F1D9A6', '#D1E2F5', '#CEBCEF', '#A6E1ED', '#FFFFFF']

delfunction s:hi
unlet s:palette s:severity s:color
