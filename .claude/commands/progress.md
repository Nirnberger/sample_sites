Aktualisiere die passende PROGRESS.md – nicht immer die im Wurzelordner:

1. Projekt bestimmen: Branch (`git branch --show-current`), Arbeitsordner (z. B. `.worktrees/nora`) und die in dieser Session geänderten Dateien.
   - Arbeit an einer Kundenseite → `kunden/<ordner>/PROGRESS.md` (z. B. `kunden/nora-solcher/`, `kunden/gruppe42/`; neu anlegen, falls es sie noch nicht gibt, gleiche Gliederung)
   - Gemeinsames (Hosting, Pipeline, `lib/`, Vorlagen allgemein, Vertrieb) → `PROGRESS.md` im Wurzelordner
   - Beides berührt → jeweils den eigenen Teil in die passende Datei
2. Darin festhalten (Gliederung: Erledigt / Offen / Nächste Schritte / Entscheidungen/Notizen, mit Datum):
   - Was in dieser Session erledigt wurde
   - Was noch offen ist
   - Die nächsten 3 konkreten Schritte
   - Wichtige Entscheidungen
   Alte Einträge unter „Erledigt“ knapp zusammenfassen.
3. Danach nur die geänderten PROGRESS-Dateien committen (auf dem aktuellen Branch).
