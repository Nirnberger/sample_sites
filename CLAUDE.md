# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Arbeitsumgebung

- Du arbeitest in einem Docker-Container (Ubuntu 24.04), nicht direkt auf dem Rechner des Nutzers.
- Alle Projekte liegen unter `/home/claude/workspace` (auf dem Host gespiegelt). Lege neue Projekte als Unterordner hier an.
- Python 3, pip, Node.js, npm, git, ripgrep und jq sind installiert. Fehlende Pakete darfst du installieren:
  `pip install --break-system-packages <paket>` bzw. `sudo apt-get install -y <paket>`.
- API-Schlüssel stehen als Umgebungsvariablen bereit (z. B. `GOOGLE_API_KEY`). Schlüssel nie in Dateien schreiben oder ausgeben.
- Sprache für Erklärungen und Kommentare: Deutsch.

## Fortschritt dokumentieren
- Lies zu Beginn jeder Session PROGRESS.md im Projektordner.
- Aktualisiere PROGRESS.md nach jedem abgeschlossenen Arbeitsschritt
  (nicht erst am Ende).
- Format:
  - **Erledigt:** kurze Stichpunkte mit Datum
  - **In Arbeit:** woran gerade gearbeitet wird
  - **Nächste Schritte:** konkrete To-dos
  - **Entscheidungen/Notizen:** z. B. gewählte Farben, Plugins, Kundenwünsche
- Halte die Datei kurz; fasse alte Einträge unter "Erledigt" zusammen.

## Projekte

Ordnerübersicht in `README.md`. Kurz: `vorlagen/` (Website-Vorlagen), `kunden/` (Kundenseiten), `hosting/` (nginx), `vertrieb/` (Lead-Skripte; Leads, Cache und Pitches nur lokal), `recherche/` (Kundenrecherche – nicht im Repo).

- **Hosting:** Der Workspace ist ein Git-Repository, das Coolify per Dockerfile deployt. Alle Seiten aus `sites.json` laufen unter einer Domain als `/<pfad>/`. `node build-all.js` baut alles nach `public/`, inkl. Hub-Startseite `/` (`hub.js`, zeigt nur Einträge mit `"hub"`-Block). Neue Kundenseiten unter `kunden/<pfad>/` anlegen und in `sites.json` eintragen (`"vorlage": "vorlagen/<name>"`). nginx-Konfiguration in `hosting/`. Details in `HOSTING.md`.
  - **Seiten anlegen/löschen:** GitHub-Workflows „Neue Seite anlegen“ / „Seite löschen“ (Formular → Pull Request) bzw. `scripts/neue-seite.js` / `scripts/seite-loeschen.js`. Mehrere Seiten pro Vorlage parallel möglich; eigene Fotos in `kunden/<pfad>/images/` überlagern die Vorlagenbilder.
  - **CI/CD:** `.github/workflows/pipeline.yml` prüft Inhalte (`tests/inhalte.js`, Schemas in `schemas/`), baut das Docker-Image, testet mit `tests/smoke.js` (alle Seiten mobil+Desktop) und `tests/lighthouse.js` (Leistung ≥ 80, Barrierefreiheit/Best Practices ≥ 90) und löst nur bei Erfolg auf `main` den Coolify-Deploy aus (Secrets `COOLIFY_WEBHOOK`, `COOLIFY_TOKEN`). Live: https://sample.seitenschwung.com
  - **Gemeinsamer Code:** `lib/` (helfer, bilder mit WebP+AVIF, schema, s3, medien) – Vorlagen haben keine eigenen Kopien mehr. Bild-Cache `.bildcache/` nach Prüfsumme, gemeinsam für alle Seiten.
  - **Kundenfotos/-medien** liegen im S3-Objektspeicher, nie in Git (`scripts/medien.js`, Variablen `MEDIEN_ENDPUNKT`, `MEDIEN_ZUGANG`, `MEDIEN_GEHEIMNIS`). Details in `HOSTING.md`.
  - **Pages CMS:** `.pages.yml` – Formulare für Nora Solcher. Listen werden beim Speichern komplett ersetzt: neue Listenfelder immer auch dort eintragen (ggf. `hidden: true`).

- **Vertrieb (`vertrieb/`):** Skripte im Repo, Daten (CSVs, `.lead_cache/`, `pitches/`) nur lokal. `lead_finder.py` immer aus `vertrieb/` starten – Cache und CSVs landen im aktuellen Ordner.
  - `lead_finder.py` – findet gut bewertete Unternehmen (Schleswig-Holstein, Wien) mit schwachen Websites. Ausgabe: CSV mit Priorität und Mängelliste. Start klein testen: `cd vertrieb && python3 lead_finder.py --orte "Rendsburg" --branchen "Tischlerei" --max-queries 1`
  - **Achtung:** Die PageSpeed-API ist im Google-Cloud-Projekt des Schlüssels nicht aktiviert (HTTP 403) – alle bisherigen CSVs haben daher keine PageSpeed-Werte. Nach dem Aktivieren `vertrieb/.lead_cache/sites/` löschen, sonst bleiben die leeren Ergebnisse 14 Tage im Cache. Ersatz: lokale Lighthouse-Messung in `vertrieb/lead_auswertung_angel_jagd/lh_messen.py`.
  - `leads_wien_angel_jagd.csv` – 31 bewertete Leads (Angel-, Jagd-, Waffengeschäfte, Büchsenmacher in Wien & Umgebung), sortiert nach `zusage_score`, mit Pitch-Aufhänger. Rohdaten: `leads_wien_angel_jagd_roh.csv`, Auswertung: `python3 vertrieb/lead_auswertung_angel_jagd/auswerten.py`. Pitches in `vertrieb/pitches/`.

- **Vorlagen (`vorlagen/`):** Inhalte jeweils nur in der JSON-Datei + `images/`, Build einzeln mit `node build.js` im Vorlagenordner → `dist/`, oder alles mit `node build-all.js`.
  - `salon/` – Friseursalons („elegant & modern“), `salon.json`. Details in `vorlagen/salon/README.md`.
  - `barber/` – Barbershops („bodenständig“, Du-Ansprache), `barber.json`.
  - `cafe/` – Cafés, Bistros, Imbisse („hell & herzlich“), `cafe.json`, mit Speisekarte, Highlights, Reservieren/Bestellen.
  - `angel-jagd/` – Shop für Angel- & Jagdgeschäfte (auch Outdoor/Fachhandel), `shop.json`, Sortiment mit Filter, Suche, Merkzettel (Click & Collect per WhatsApp/E-Mail).
  - `repertoire/` – ruhiges, mehrseitiges Künstler-Portfolio (Creme/Braun/Mint): Startseite, je Arbeitsfeld eine Seite (`bereiche[]` → `<id>.html`), ausführliche Kontaktseite; Menü immer sichtbar. Aktuell für Nora Solcher (`kunden/nora-solcher/schauspiel.json`, Bereiche Theater, Film, Audio, Schreiben, Unterrichten; Recherche in `recherche/nora-solcher/`).
  - `buehne/` – künstlerisches Portfolio für Schauspieler:innen („die Website als Theaterabend“). Noras frühere Fassung damit liegt auf dem Branch `nora-buehne-archiv`.
  - `schauspiel/` – nüchterne Schwester-Vorlage von `buehne` mit demselben Datenformat (in `sites.json` austauschbar).
