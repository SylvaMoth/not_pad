# not_pad v0.9

A minimal, distraction-free markdown text editor for Windows, built with Electron by Claude AI.

Designed for quick note-taking, journaling, and markdown writing with a clean interface and no bloat.

## Features

### Editor
- Monospace text editor with syntax-free writing
- Dark and light themes
- Markdown preview with toggle (Ctrl+M) — supports headings, bold, italic, inline code, code blocks, blockquotes, and bullet lists
- Print from markdown preview (Ctrl+P)
- Right-click context menu (cut, copy, paste, delete, select all)
- Full undo/redo support

### Find & Replace
- Find text from current cursor position (Ctrl+F)
- Find next (Enter / arrow down) and find previous (Shift+Enter / arrow up)
- Wraps around when reaching end/beginning of document
- Replace single match or replace all (Ctrl+H)
- Match highlighting with scroll-to-match positioning
- Search closes automatically on undo/redo/paste/cut, preserving the action

### Save Options
- **Quick save** - overwrites current file (Ctrl+S)
- **Save As** - save as new file with file dialog (Ctrl+Shift+S)
- **Prepend** - add content to the beginning of an existing file
- **Append** - add content to the end of an existing file
- Optional date separator line on save (configurable format)
- Custom text label per save (e.g., "Report 1", "Version 2")
- Unsaved changes warning on close

### File Management
- Open markdown files (Ctrl+O)
- Recent files history (up to 10 files)
- New file (Ctrl+N)
- Close file with unsaved changes detection (Ctrl+W)

### Preferences (Ctrl+,)
- Theme: dark or light
- Default open directory
- Default save directory
- Date line format: YY-MM-DD or YYYY-Month-DD
- Toggle date inclusion in separator lines
- Default date line text

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New file |
| Ctrl+O | Open file |
| Ctrl+S | Quick save (overwrite) |
| Ctrl+Shift+S | Save As (dialog) |
| Ctrl+W | Close file |
| Ctrl+M | Toggle markdown preview |
| Ctrl+P | Print (renders markdown first) |
| Ctrl+F | Find |
| Ctrl+H | Find and replace |
| Ctrl+, | Preferences |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy |
| Ctrl+X | Cut |
| Ctrl+V | Paste |
| Ctrl+A | Select all |
| Escape | Close find bar / close dialogs |
| Enter | Next match (in find) |
| Shift+Enter | Previous match (in find) |

## Supported Markdown

The preview mode renders the following markdown syntax:

| Syntax | Result |
|---|---|
| `# Heading` | H1 heading |
| `## Heading` | H2 heading |
| `### Heading` | H3 heading |
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `` `code` `` | inline code |
| ` ``` ` | fenced code block |
| `> text` | blockquote |
| `- item` or `* item` | bullet list |

## Date Separator Lines

When saving with the "Add date line" option, the editor wraps content with separator lines:

```
____________________________________25-02-07____________________________________

Your content here...

____________________________________25-02-07____________________________________
```

With custom text:

```
______________________________25-02-07_Report 1_________________________________

Your content here...

______________________________25-02-07_Report 1_________________________________
```

## Setup

### Requirements
- Node.js
- npm

### Install & Run

```bash
npm install
npm start
```

### Build (Windows)

```bash
npm run build
```

Output goes to the `dist` folder.

## Project Structure

```
not_pad_app/
  main.js           - Electron main process (window, menus, file I/O, config)
  renderer.js        - UI logic (editor, search, save, preview, dialogs)
  index.html         - Main window HTML (editor, toolbar, dialogs)
  styles.css         - All styling (dark/light themes, print styles)
  preview.html       - Standalone preview window (legacy, not actively used)
  package.json       - Project config and build settings
  not_pad_config.txt - User preferences (auto-generated on first run)
```


## License

Personal project. Use as you like. 
