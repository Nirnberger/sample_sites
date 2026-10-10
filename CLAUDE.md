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

## Projekte

- **Hosting:** Der Workspace ist ein Git-Repository, das Coolify per Dockerfile deployt. Alle Seiten aus `sites.json` laufen unter einer Domain als `/<pfad>/`. `node build-all.js` baut alles nach `public/`, inkl. Hub-Startseite `/` (`hub.js`, zeigt nur Einträge mit `"hub"`-Block). Neue Kundenseiten unter `kunden/<pfad>/` anlegen und in `sites.json` eintragen. Details in `HOSTING.md`.

- `lead_finder.py` – findet gut bewertete Unternehmen (Schleswig-Holstein, Wien) mit schwachen Websites. Ausgabe: CSV mit Priorität und Mängelliste. Start klein testen: `python3 lead_finder.py --orte "Rendsburg" --branchen "Tischlerei" --max-queries 1`
  - **Achtung:** Die PageSpeed-API ist im Google-Cloud-Projekt des Schlüssels nicht aktiviert (HTTP 403) – alle bisherigen CSVs haben daher keine PageSpeed-Werte. Nach dem Aktivieren `.lead_cache/sites/` löschen, sonst bleiben die leeren Ergebnisse 14 Tage im Cache. Ersatz: lokale Lighthouse-Messung in `lead_auswertung_angel_jagd/lh_messen.py`.
- `leads_wien_angel_jagd.csv` – 31 bewertete Leads (Angel-, Jagd-, Waffengeschäfte, Büchsenmacher in Wien & Umgebung), sortiert nach `zusage_score`, mit Pitch-Aufhänger. Rohdaten: `leads_wien_angel_jagd_roh.csv`, Auswertung: `lead_auswertung_angel_jagd/` (`python3 lead_auswertung_angel_jagd/auswerten.py`).
- `salon-vorlage/` – Website-Vorlage für Friseursalons („elegant & modern“). Inhalte nur in `salon.json` + `images/`, Build mit `node build.js` → `dist/`. Details in `salon-vorlage/README.md`.
- `barber-vorlage/` – Schwester-Vorlage für Barbershops („bodenständig“, Du-Ansprache). Gleiche Technik, Inhalte in `barber.json` + `images/`, Build mit `node build.js` → `dist/`. Details in `barber-vorlage/README.md`.
- `cafe-vorlage/` – Vorlage für Cafés, Bistros, Imbisse („hell & herzlich“). Inhalte in `cafe.json` + `images/`, Build mit `node build.js` → `dist/`. Mit Speisekarte, Highlights, Reservieren/Bestellen. Details in `cafe-vorlage/README.md`.
- `angel-jagd-vorlage/` – moderne Shop-Vorlage für Angel- & Jagdgeschäfte (auch Outdoor/Fachhandel). Sortiment mit Filter, Suche und Merkzettel (Click & Collect per WhatsApp/E-Mail). Inhalte in `shop.json` + `images/`, Build mit `node build.js` → `dist/`. Details in `angel-jagd-vorlage/README.md`.
