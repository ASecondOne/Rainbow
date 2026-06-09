"use strict";

const path = require("path");
const vscode = require("vscode");

const LANGUAGE_BAR_CONTAINER_ID = "rainbowLanguageBar";
const LANGUAGE_BAR_VIEW_ID = "rainbowLanguageBar.breakdown";
const LANGUAGE_BAR_FOCUS_COMMAND = `workbench.view.extension.${LANGUAGE_BAR_CONTAINER_ID}`;

const LANGUAGE_NAMES = {
  brainfuck: "Brainfuck",
  bqn: "BQN",
  cpp: "C++",
  csharp: "C#",
  d: "D",
  fsharp: "F#",
  json: "JSON",
  markdown: "Markdown",
  other: "Other",
  plaintext: "Plain Text",
  raku: "Raku",
  shellscript: "Shell Script",
  javascriptreact: "JavaScript React",
  typescript: "TypeScript",
  typescriptreact: "TypeScript React",
  "objective-c": "Objective-C",
  "objective-cpp": "Objective-C++"
};

const LANGUAGE_ALIASES = {
  bash: "shellscript",
  bf: "brainfuck",
  fnl: "fennel",
  json5: "json",
  jsonc: "json",
  mdx: "markdown",
  perl6: "raku",
  pod6: "raku",
  shell: "shellscript",
  "shell-script": "shellscript",
  sh: "shellscript",
  text: "plaintext",
  zsh: "shellscript"
};

const FILE_NAME_LANGUAGE_IDS = {
  brewfile: "ruby",
  dockerfile: "dockerfile",
  gemfile: "ruby",
  makefile: "makefile",
  readme: "markdown"
};

const FILE_EXTENSION_LANGUAGE_IDS = {
  ".bf": "brainfuck",
  ".bqn": "bqn",
  ".c": "c",
  ".cpp": "cpp",
  ".cs": "csharp",
  ".css": "css",
  ".d": "d",
  ".fnl": "fennel",
  ".gleam": "gleam",
  ".go": "go",
  ".idr": "idris",
  ".io": "io",
  ".janet": "janet",
  ".java": "java",
  ".js": "javascript",
  ".json": "json",
  ".json5": "json",
  ".jsonc": "json",
  ".jsx": "javascriptreact",
  ".lua": "lua",
  ".md": "markdown",
  ".markdown": "markdown",
  ".nim": "nim",
  ".odin": "odin",
  ".p6": "raku",
  ".pod6": "raku",
  ".py": "python",
  ".q": "q",
  ".rb": "ruby",
  ".ring": "ring",
  ".rs": "rust",
  ".sh": "shellscript",
  ".ts": "typescript",
  ".tsx": "typescriptreact",
  ".txt": "plaintext",
  ".v": "v",
  ".wren": "wren",
  ".zsh": "shellscript"
};

const LANGUAGE_COLORS = {
  c: "#555555",
  cpp: "#f34b7d",
  csharp: "#178600",
  css: "#663399",
  d: "#ba595e",
  go: "#00ADD8",
  java: "#b07219",
  javascript: "#f1e05a",
  javascriptreact: "#f1e05a",
  json: "#56b6c2",
  lua: "#000080",
  markdown: "#98c379",
  odin: "#60AFFE",
  "objective-c": "#438eff",
  "objective-cpp": "#6866fb",
  other: "#6b7280",
  plaintext: "#6ea8fe",
  python: "#3572A5",
  ruby: "#701516",
  shellscript: "#89e051",
  rust: "#dea584",
  typescript: "#3178c6",
  typescriptreact: "#3178c6",
  brainfuck: "#2F2530",
  bqn: "#2b7067",
  fennel: "#fff3d7",
  gleam: "#ffaff3",
  idris: "#b30000",
  io: "#a9188d",
  janet: "#0886a5",
  nim: "#ffc200",
  raku: "#0000fb",
  q: "#0040cd",
  ring: "#2D54CB",
  v: "#4f87c4",
  wren: "#383838"
};

const FALLBACK_COLORS = [
  "#e06c75",
  "#e5c07b",
  "#98c379",
  "#56b6c2",
  "#61afef",
  "#c678dd",
  "#d19a66",
  "#7fbbb3",
  "#d3869b",
  "#8ec07c"
];

let controller;

function activate(context) {
  controller = new LanguageBarController(context);
  context.subscriptions.push(controller);
}

function deactivate() {
  if (controller) {
    controller.dispose();
  }
}

class LanguageBarController {
  constructor(context) {
    this.context = context;
    this.snapshot = null;
    this.detailsView = undefined;
    this.updateTimer = undefined;
    this.updateToken = 0;

    this.placeholderItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000
    );
    this.placeholderItem.name = "Workspace Language Bar";
    this.placeholderItem.command = "rainbowLanguageBar.focusView";
    this.placeholderItem.show();

    context.subscriptions.push(this.placeholderItem);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(LANGUAGE_BAR_VIEW_ID, this, {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand("rainbowLanguageBar.refresh", () => {
        this.scheduleUpdate(0);
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand("rainbowLanguageBar.showBreakdown", () => {
        return this.focusView();
      })
    );
    context.subscriptions.push(
      vscode.commands.registerCommand("rainbowLanguageBar.focusView", () => {
        return this.focusView();
      })
    );
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(() => this.scheduleUpdate()),
      vscode.workspace.onDidCreateFiles(() => this.scheduleUpdate()),
      vscode.workspace.onDidDeleteFiles(() => this.scheduleUpdate()),
      vscode.workspace.onDidRenameFiles(() => this.scheduleUpdate()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.scheduleUpdate()),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("rainbowLanguageBar")) {
          this.scheduleUpdate(0);
        }
      })
    );

    this.setPlaceholder("$(sync~spin) Lang", "Scanning workspace languages...");
    this.scheduleUpdate(0);
  }

  dispose() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.placeholderItem.dispose();
  }

  resolveWebviewView(webviewView) {
    this.detailsView = webviewView;
    this.detailsView.title = "Workspace Language Bar";
    this.detailsView.description = "Workspace breakdown";
    this.detailsView.webview.options = {
      enableScripts: false
    };

    this.detailsView.onDidDispose(() => {
      if (this.detailsView === webviewView) {
        this.detailsView = undefined;
      }
    });

    this.updateDetailsView();
  }

  async focusView() {
    try {
      await vscode.commands.executeCommand(LANGUAGE_BAR_FOCUS_COMMAND);
    } catch (error) {
      console.error("Workspace Language Bar focus failed:", error);
    }

    if (this.detailsView) {
      this.detailsView.show(false);
      return;
    }

    vscode.window.showInformationMessage("Open the Language Bar view from the sidebar to see the full breakdown.");
  }

  setPlaceholder(text, tooltip, color) {
    this.placeholderItem.text = text;
    this.placeholderItem.tooltip = tooltip;
    this.placeholderItem.color = color;
    this.placeholderItem.show();
  }

  scheduleUpdate(delay = 400) {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.updateTimer = undefined;
      this.update().catch((error) => {
        console.error("Workspace Language Bar update failed:", error);
        this.setPlaceholder(
          "$(warning) Lang",
          `Language scan failed: ${error instanceof Error ? error.message : String(error)}`,
          undefined
        );
        this.updateDetailsView();
      });
    }, delay);
  }

  async update() {
    const token = ++this.updateToken;
    this.setPlaceholder("$(sync~spin) Lang", "Scanning workspace languages...", undefined);

    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      this.snapshot = null;
      this.setPlaceholder("Lang", "Open a folder or workspace to calculate language usage.", undefined);
      this.updateDetailsView();
      return;
    }

    const snapshot = await collectWorkspaceStats();
    if (token !== this.updateToken) {
      return;
    }

    this.snapshot = snapshot;
    this.render(snapshot);
  }

  render(snapshot) {
    if (!snapshot.entries.length || snapshot.totalBytes === 0) {
      this.setPlaceholder("Lang", "No supported text files found in the current workspace.", undefined);
      this.updateDetailsView();
      return;
    }

    const colorizedEntries = colorizeEntries(snapshot.entries);
    const tooltip = buildTooltip(snapshot, colorizedEntries);
    const displayEntries = buildDisplayEntries(colorizedEntries, getMaxVisibleSegments());
    const summaryText = buildStatusSummary(displayEntries);

    this.placeholderItem.text = summaryText;
    this.placeholderItem.tooltip = tooltip;
    this.placeholderItem.color = undefined;
    this.placeholderItem.show();

    this.updateDetailsView();
  }

  updateDetailsView() {
    if (!this.detailsView) {
      return;
    }

    const entries = this.snapshot ? colorizeEntries(this.snapshot.entries) : [];
    this.detailsView.webview.html = buildBreakdownHtml(this.snapshot, entries);
  }
}

async function collectWorkspaceStats() {
  const include = "**/*";
  const exclude = getExcludeGlob();
  const uris = await vscode.workspace.findFiles(include, exclude);
  const buckets = new Map();

  let totalBytes = 0;
  let totalFiles = 0;

  for (const uri of uris) {
    let stat;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {
      continue;
    }

    if ((stat.type & vscode.FileType.Directory) !== 0 || stat.size <= 0) {
      continue;
    }

    let document;
    try {
      document = await vscode.workspace.openTextDocument(uri);
    } catch {
      continue;
    }

    const languageId = detectLanguageId(document, uri);
    const label = formatLanguageName(languageId);
    const existing = buckets.get(languageId) || {
      languageId,
      label,
      bytes: 0,
      files: 0
    };

    existing.bytes += stat.size;
    existing.files += 1;
    buckets.set(languageId, existing);
    totalBytes += stat.size;
    totalFiles += 1;
  }

  const entries = Array.from(buckets.values())
    .sort((left, right) => right.bytes - left.bytes)
    .map((entry) => ({
      ...entry,
      percent: entry.bytes / totalBytes
    }));

  return {
    entries,
    totalBytes,
    totalFiles
  };
}

function colorizeEntries(entries) {
  return entries.map((entry, index) => ({
    ...entry,
    color: resolveLanguageColor(entry.languageId, index)
  }));
}

function buildDisplayEntries(entries, maxVisibleSegments) {
  const limit = Math.max(2, maxVisibleSegments);
  if (entries.length <= limit) {
    return entries;
  }

  const visibleEntries = entries.slice(0, limit - 1);
  const hiddenEntries = entries.slice(limit - 1);
  const otherEntry = hiddenEntries.reduce(
    (combined, entry) => {
      combined.bytes += entry.bytes;
      combined.files += entry.files;
      combined.percent += entry.percent;
      return combined;
    },
    {
      languageId: "other",
      label: formatLanguageName("other"),
      bytes: 0,
      files: 0,
      percent: 0,
      color: resolveLanguageColor("other", 0)
    }
  );

  return [...visibleEntries, otherEntry];
}

function buildTooltip(snapshot, entries) {
  const markdown = new vscode.MarkdownString("", true);
  markdown.isTrusted = false;
  markdown.supportHtml = false;
  markdown.supportThemeIcons = true;

  markdown.appendMarkdown("**Workspace Language Bar**\n\n");
  markdown.appendMarkdown(`${snapshot.totalFiles} files • ${formatBytes(snapshot.totalBytes)} total\n\n`);

  for (const entry of entries) {
    markdown.appendMarkdown(
      `**${escapeMarkdown(entry.label)}** — ${formatPercent(entry.percent)} (${formatBytes(entry.bytes)}, ${entry.files} ${entry.files === 1 ? "file" : "files"}) \`${entry.color}\`\n\n`
    );
  }

  markdown.appendMarkdown("---\nClick the status item to open the persistent language view.");
  return markdown;
}

function buildStatusSummary(entries) {
  if (!entries.length) {
    return "Lang";
  }

  const [topEntry] = entries;
  return `Lang ${topEntry.label} ${formatPercent(topEntry.percent)}`;
}

function buildBreakdownHtml(snapshot, entries) {
  const body = snapshot && entries.length
    ? buildBreakdownContent(snapshot, entries)
    : buildEmptyState();

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: dark light;
      }
      html {
        scroll-behavior: smooth;
      }
      body {
        margin: 0;
        font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--vscode-sideBar-background);
        color: var(--vscode-sideBar-foreground);
      }
      .wrap {
        padding: 16px;
      }
      .hero {
        position: sticky;
        top: 0;
        z-index: 1;
        margin: -16px -16px 14px;
        padding: 16px;
        background:
          linear-gradient(180deg, var(--vscode-sideBar-background) 0%, var(--vscode-sideBar-background) 85%, transparent 100%);
      }
      h1 {
        margin: 0 0 6px;
        font-size: 18px;
        font-weight: 650;
      }
      .subtitle {
        margin: 0 0 14px;
        color: var(--vscode-descriptionForeground);
      }
      .bar {
        display: flex;
        overflow: hidden;
        height: 14px;
        border-radius: 999px;
        background: var(--vscode-input-background);
        box-shadow: inset 0 0 0 1px var(--vscode-widget-border, transparent);
      }
      .segment {
        display: block;
        height: 100%;
        min-width: 2px;
        text-decoration: none;
      }
      .segment:hover {
        filter: brightness(1.08);
      }
      .list {
        border-top: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.2));
      }
      .row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 11px 0;
        border-bottom: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.15));
        scroll-margin-top: 90px;
      }
      .row:target {
        background: rgba(127, 127, 127, 0.12);
      }
      .lang {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex: 0 0 auto;
      }
      .label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
      }
      .meta {
        color: var(--vscode-descriptionForeground);
        text-align: right;
        white-space: nowrap;
      }
      .empty {
        padding: 24px 16px;
        color: var(--vscode-descriptionForeground);
      }
      @media (max-width: 420px) {
        .row {
          grid-template-columns: 1fr;
        }
        .meta {
          text-align: left;
          white-space: normal;
        }
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function buildBreakdownContent(snapshot, entries) {
  const bar = entries
    .map((entry, index) => {
      const title = `${entry.label} — ${formatPercent(entry.percent)} (${formatBytes(entry.bytes)}, ${entry.files} ${entry.files === 1 ? "file" : "files"})`;
      return `<a class="segment" href="#lang-${index}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" style="width:${(entry.percent * 100).toFixed(4)}%;background:${escapeHtml(entry.color)}"></a>`;
    })
    .join("");

  const rows = entries
    .map((entry, index) => `
      <div class="row" id="lang-${index}">
        <div class="lang">
          <span class="swatch" style="background:${escapeHtml(entry.color)}"></span>
          <span class="label">${escapeHtml(entry.label)}</span>
        </div>
        <div class="meta">${formatPercent(entry.percent)} · ${formatBytes(entry.bytes)} · ${entry.files} ${entry.files === 1 ? "file" : "files"}</div>
      </div>`)
    .join("");

  return `<div class="wrap">
    <div class="hero">
      <h1>Workspace Language Bar</h1>
      <p class="subtitle">${snapshot.totalFiles} files · ${formatBytes(snapshot.totalBytes)} total</p>
      <div class="bar" aria-label="Workspace language usage bar">${bar}</div>
    </div>
    <div class="list">${rows}</div>
  </div>`;
}

function buildEmptyState() {
  return `<div class="empty">
    Open a folder or run <strong>Language Bar: Refresh</strong> to populate the workspace language view.
  </div>`;
}

function getMaxVisibleSegments() {
  const config = vscode.workspace.getConfiguration("rainbowLanguageBar");
  return config.get("maxVisibleSegments", 6);
}

function getExcludeGlob() {
  const config = vscode.workspace.getConfiguration("rainbowLanguageBar");
  return config.get(
    "excludeGlob",
    "**/{.git,node_modules,dist,out,build,target,coverage,.next,.nuxt,.svelte-kit,.vscode-test}/**"
  );
}

function normalizeLanguageId(languageId) {
  return LANGUAGE_ALIASES[languageId] || languageId;
}

function detectLanguageId(document, uri) {
  const normalizedLanguageId = normalizeLanguageId(document.languageId || "plaintext");
  if (normalizedLanguageId !== "plaintext") {
    return normalizedLanguageId;
  }

  return inferLanguageIdFromPath(uri) || normalizedLanguageId;
}

function inferLanguageIdFromPath(uri) {
  const fileName = path.basename(uri.fsPath || uri.path);
  const lowerFileName = fileName.toLowerCase();
  const extension = path.extname(lowerFileName);

  if (FILE_NAME_LANGUAGE_IDS[lowerFileName]) {
    return FILE_NAME_LANGUAGE_IDS[lowerFileName];
  }

  const baseNameWithoutExtension = extension
    ? lowerFileName.slice(0, lowerFileName.length - extension.length)
    : lowerFileName;

  if (FILE_NAME_LANGUAGE_IDS[baseNameWithoutExtension]) {
    return FILE_NAME_LANGUAGE_IDS[baseNameWithoutExtension];
  }

  if (FILE_EXTENSION_LANGUAGE_IDS[extension]) {
    return FILE_EXTENSION_LANGUAGE_IDS[extension];
  }

  return undefined;
}

function formatLanguageName(languageId) {
  const canonicalLanguageId = normalizeLanguageId(languageId);

  if (LANGUAGE_NAMES[canonicalLanguageId]) {
    return LANGUAGE_NAMES[canonicalLanguageId];
  }

  return canonicalLanguageId
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveLanguageColor(languageId) {
  const canonicalLanguageId = normalizeLanguageId(languageId);
  return LANGUAGE_COLORS[canonicalLanguageId] || FALLBACK_COLORS[hashString(canonicalLanguageId) % FALLBACK_COLORS.length];
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = units[0];

  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`;
}

function escapeMarkdown(value) {
  return value.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashString(value) {
  let hash = 0;

  for (const char of value) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}

module.exports = {
  activate,
  deactivate
};
