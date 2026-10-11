#!/usr/bin/env bash
# Legt einen eigenen Arbeitsordner (git worktree) für eine parallele Claude-Session an.
#   scripts/worktree.sh <name> <kundenordner>      z. B.  scripts/worktree.sh nora nora-solcher
# Ergebnis: .worktrees/<name> auf Branch <name>. Nicht versionierte Dateien (.env, recherche/,
# Kundenfotos und -medien) werden als Links eingebunden, damit beide Sessions dieselben nutzen.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
name="${1:?Name fehlt, z. B. nora}"
kunde="${2:?Kundenordner fehlt, z. B. nora-solcher}"
ziel=".worktrees/$name"

[ -d "kunden/$kunde" ] || { echo "✖ kunden/$kunde gibt es nicht"; exit 1; }
[ -e "$ziel" ] && { echo "✖ $ziel existiert schon"; exit 1; }

if git show-ref --verify --quiet "refs/heads/$name"; then
  git worktree add "$ziel" "$name"
else
  git worktree add "$ziel" -b "$name"
fi

# Links liegen im Worktree und dürfen nicht eingecheckt werden (gilt für alle Worktrees)
ausschluss="$(git rev-parse --git-common-dir)/info/exclude"
for muster in '/kunden/*/images' '/kunden/*/medien' '/recherche'; do
  grep -qxF "$muster" "$ausschluss" 2>/dev/null || echo "$muster" >> "$ausschluss"
done

[ -e .env ] && ln -s ../../.env "$ziel/.env"
[ -d recherche ] && ln -s ../../recherche "$ziel/recherche"
for teil in images medien; do
  mkdir -p "kunden/$kunde/$teil"
  rm -rf "${ziel:?}/kunden/$kunde/$teil"
  ln -s "../../../../kunden/$kunde/$teil" "$ziel/kunden/$kunde/$teil"
done

echo "✔ $ziel auf Branch $name – in der Claude-App als Ordner für die neue Session wählen:"
echo "  $(pwd)/$ziel"
