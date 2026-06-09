# Workspace Language Bar

This is a small VS Code extension that shows a GitHub-style language split for the current workspace.

What it does:

- Renders a workspace language summary in the status bar and a real contiguous color bar in the sidebar view.
- Recalculates on save, create, delete, rename, workspace changes, and manual refresh.
- Shows the language list with percentages and sizes in the hover tooltip.
- Adds a persistent sidebar view with a real contiguous color bar and the full language list.
- Normalizes common alias ids like `bf`, `perl6`, `jsonc`, and `shell-script` before coloring.
- Falls back to file name and extension inference when VS Code reports a file as `plaintext`.

Important limitation:

VS Code extensions cannot render a true multi-color GitHub-style bar directly inside one native status bar item. This extension keeps the status bar item as a compact summary and renders the real bar in a dedicated sidebar view.

Unknown language ids still receive a deterministic fallback color. Explicitly known ids and aliases are listed below.

## Run it locally

1. Open this `vscode-language-bar` folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. Open any workspace in that host window.
4. Look for the colored bar in the left side of the status bar.
5. Click the status item or open the `Languages` sidebar view to see the full bar.

## Install into your local editor

Run:

```bash
./install.sh
```

The script copies the extension into your local extensions directory. It checks these locations in order:

- `~/.vscode/extensions`
- `~/.cursor/extensions`
- `~/.vscode-insiders/extensions`
- `~/.vscodium/extensions`

You can also pass a target directory explicitly:

```bash
./install.sh "$HOME/.vscode/extensions"
```

## Commands

- `Language Bar: Refresh`
- `Language Bar: Show Breakdown`
- `Language Bar: Focus View`

## Settings

- `rainbowLanguageBar.maxVisibleSegments`
- `rainbowLanguageBar.excludeGlob`

## Known Languages

Canonical ids with explicit labels and colors:

| Language ID | Label | Color |
| --- | --- | --- |
| `brainfuck` | Brainfuck | `#2F2530` |
| `bqn` | BQN | `#2b7067` |
| `c` | C | `#555555` |
| `cpp` | C++ | `#f34b7d` |
| `csharp` | C# | `#178600` |
| `css` | CSS | `#663399` |
| `d` | D | `#ba595e` |
| `fennel` | Fennel | `#fff3d7` |
| `gleam` | Gleam | `#ffaff3` |
| `go` | Go | `#00ADD8` |
| `idris` | Idris | `#b30000` |
| `io` | Io | `#a9188d` |
| `janet` | Janet | `#0886a5` |
| `java` | Java | `#b07219` |
| `javascript` | JavaScript | `#f1e05a` |
| `javascriptreact` | JavaScript React | `#f1e05a` |
| `json` | JSON | `#56b6c2` |
| `lua` | Lua | `#000080` |
| `markdown` | Markdown | `#98c379` |
| `nim` | Nim | `#ffc200` |
| `objective-c` | Objective-C | `#438eff` |
| `objective-cpp` | Objective-C++ | `#6866fb` |
| `odin` | Odin | `#60AFFE` |
| `other` | Other | `#6b7280` |
| `plaintext` | Plain Text | `#6ea8fe` |
| `python` | Python | `#3572A5` |
| `q` | Q | `#0040cd` |
| `raku` | Raku | `#0000fb` |
| `ring` | Ring | `#2D54CB` |
| `ruby` | Ruby | `#701516` |
| `rust` | Rust | `#dea584` |
| `shellscript` | Shell Script | `#89e051` |
| `typescript` | TypeScript | `#3178c6` |
| `typescriptreact` | TypeScript React | `#3178c6` |
| `v` | V | `#4f87c4` |
| `wren` | Wren | `#383838` |

Normalized aliases:

- `bash` -> `shellscript`
- `bf` -> `brainfuck`
- `fnl` -> `fennel`
- `json5` -> `json`
- `jsonc` -> `json`
- `mdx` -> `markdown`
- `perl6` -> `raku`
- `pod6` -> `raku`
- `shell` -> `shellscript`
- `shell-script` -> `shellscript`
- `sh` -> `shellscript`
- `text` -> `plaintext`
- `zsh` -> `shellscript`

Filename and extension inference used when VS Code returns `plaintext`:

- Exact filenames: `README` -> `markdown`, `Dockerfile` -> `dockerfile`, `Makefile` -> `makefile`, `Gemfile` and `Brewfile` -> `ruby`
- Extensions: `.bf`, `.bqn`, `.c`, `.cpp`, `.cs`, `.css`, `.d`, `.fnl`, `.gleam`, `.go`, `.idr`, `.io`, `.janet`, `.java`, `.js`, `.json`, `.json5`, `.jsonc`, `.jsx`, `.lua`, `.md`, `.markdown`, `.nim`, `.odin`, `.p6`, `.pod6`, `.py`, `.q`, `.rb`, `.ring`, `.rs`, `.sh`, `.ts`, `.tsx`, `.txt`, `.v`, `.wren`, `.zsh`
