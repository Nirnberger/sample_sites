Stand wiederherstellen:

1. Projekt bestimmen: Branch (`git branch --show-current`) und Arbeitsordner. Im Worktree `.worktrees/<name>` bzw. auf Branch `<name>` ist das Projekt der passende Kundenordner (z. B. `nora` → `kunden/nora-solcher/`).
2. Lies die PROGRESS.md dieses Projekts (`kunden/<ordner>/PROGRESS.md`) und die gemeinsame `PROGRESS.md` im Wurzelordner. Ohne erkennbares Projekt: die gemeinsame und alle `kunden/*/PROGRESS.md` kurz überfliegen.
3. Dazu `git log --oneline -10` und `git status`.
4. Fasse kurz zusammen: Stand, offene Punkte, nächste Schritte – getrennt nach Projekt und Gemeinsamem.
5. Frag dann, womit wir weitermachen.
