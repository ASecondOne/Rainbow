#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_NAME="workspace-language-bar"
EXTENSION_VERSION="$(sed -n 's/.*"version": "\(.*\)".*/\1/p' "${SCRIPT_DIR}/package.json" | head -n 1)"
TARGET_BASENAME="local.${EXTENSION_NAME}"

pick_target_root() {
  if [[ -n "${VSCODE_EXTENSIONS_DIR:-}" ]]; then
    printf '%s\n' "$VSCODE_EXTENSIONS_DIR"
    return 0
  fi

  local candidates=(
    "${HOME}/.vscode/extensions"
    "${HOME}/.cursor/extensions"
    "${HOME}/.vscode-insiders/extensions"
    "${HOME}/.vscodium/extensions"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  printf '%s\n' "${HOME}/.vscode/extensions"
}

list_candidate_roots() {
  printf '%s\n' "${HOME}/.vscode/extensions"
  printf '%s\n' "${HOME}/.cursor/extensions"
  printf '%s\n' "${HOME}/.vscode-insiders/extensions"
  printf '%s\n' "${HOME}/.vscodium/extensions"
}

remove_old_instances() {
  local root
  local dir

  while IFS= read -r root; do
    [[ -d "$root" ]] || continue
    shopt -s nullglob
    for dir in "$root"/local."${EXTENSION_NAME}"*; do
      rm -rf "$dir"
      printf 'Removed old install %s\n' "$dir"
    done
    shopt -u nullglob
  done < <(list_candidate_roots)
}

copy_extension() {
  local target_root="$1"
  local target_dir="${target_root}/${TARGET_BASENAME}"

  remove_old_instances
  mkdir -p "$target_root"
  rm -rf "$target_dir"
  mkdir -p "$target_dir"

  cp "${SCRIPT_DIR}/package.json" "$target_dir/package.json"
  cp "${SCRIPT_DIR}/extension.js" "$target_dir/extension.js"
  cp "${SCRIPT_DIR}/README.md" "$target_dir/README.md"
  cp "${SCRIPT_DIR}/install.sh" "$target_dir/install.sh"
  if [[ -d "${SCRIPT_DIR}/media" ]]; then
    mkdir -p "$target_dir/media"
    cp "${SCRIPT_DIR}/media/"* "$target_dir/media/"
  fi
  chmod +x "$target_dir/install.sh"

  printf 'Installed version %s to %s\n' "$EXTENSION_VERSION" "$target_dir"
}

main() {
  local target_root="${1:-$(pick_target_root)}"
  copy_extension "$target_root"

  cat <<EOF

Next:
  1. Restart VS Code or run "Developer: Reload Window".
  2. Run "Language Bar: Refresh" if the bar does not appear immediately.

Tip:
  Set VSCODE_EXTENSIONS_DIR to override the destination, or pass a path directly:
    ./install.sh "\$HOME/.vscode/extensions"
EOF
}

main "$@"
