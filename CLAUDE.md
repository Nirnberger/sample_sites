# Arbeitsumgebung

- Du arbeitest in einem Docker-Container (Ubuntu 24.04), nicht direkt auf dem Rechner des Nutzers.
- Alle Projekte liegen unter `/home/claude/workspace` (auf dem Host gespiegelt). Lege neue Projekte als Unterordner hier an.
- Python 3, pip, Node.js, npm, git, ripgrep und jq sind installiert. Fehlende Pakete darfst du installieren:
  `pip install --break-system-packages <paket>` bzw. `sudo apt-get install -y <paket>`.
- API-Schlüssel stehen als Umgebungsvariablen bereit (z. B. `GOOGLE_API_KEY`). Schlüssel nie in Dateien schreiben oder ausgeben.
- Sprache für Erklärungen und Kommentare: Deutsch.

## Projekte

- **Hosting:** Der Workspace ist ein Git-Repository, das Coolify per Dockerfile deployt. Alle Seiten aus `sites.json` laufen unter einer Domain als `/<pfad>/`. `node build-all.js` baut alles nach `public/`. Neue Kundenseiten unter `kunden/<pfad>/` anlegen und in `sites.json` eintragen. Details in `HOSTING.md`.

- `lead_finder.py` – findet gut bewertete Unternehmen (Schleswig-Holstein, Wien) mit schwachen Websites. Ausgabe: CSV mit Priorität und Mängelliste. Start klein testen: `python3 lead_finder.py --orte "Rendsburg" --branchen "Tischlerei" --max-queries 1`
  - **Achtung:** Die PageSpeed-API ist im Google-Cloud-Projekt des Schlüssels nicht aktiviert (HTTP 403) – alle bisherigen CSVs haben daher keine PageSpeed-Werte. Nach dem Aktivieren `.lead_cache/sites/` löschen, sonst bleiben die leeren Ergebnisse 14 Tage im Cache. Ersatz: lokale Lighthouse-Messung in `lead_auswertung_angel_jagd/lh_messen.py`.
- `leads_wien_angel_jagd.csv` – 31 bewertete Leads (Angel-, Jagd-, Waffengeschäfte, Büchsenmacher in Wien & Umgebung), sortiert nach `zusage_score`, mit Pitch-Aufhänger. Rohdaten: `leads_wien_angel_jagd_roh.csv`, Auswertung: `lead_auswertung_angel_jagd/` (`python3 lead_auswertung_angel_jagd/auswerten.py`).
- `salon-vorlage/` – Website-Vorlage für Friseursalons („elegant & modern“). Inhalte nur in `salon.json` + `images/`, Build mit `node build.js` → `dist/`. Details in `salon-vorlage/README.md`.
- `barber-vorlage/` – Schwester-Vorlage für Barbershops („bodenständig“, Du-Ansprache). Gleiche Technik, Inhalte in `barber.json` + `images/`, Build mit `node build.js` → `dist/`. Details in `barber-vorlage/README.md`.
- `cafe-vorlage/` – Vorlage für Cafés, Bistros, Imbisse („hell & herzlich“). Inhalte in `cafe.json` + `images/`, Build mit `node build.js` → `dist/`. Mit Speisekarte, Highlights, Reservieren/Bestellen. Details in `cafe-vorlage/README.md`.
- `angel-jagd-vorlage/` – moderne Shop-Vorlage für Angel- & Jagdgeschäfte (auch Outdoor/Fachhandel). Sortiment mit Filter, Suche und Merkzettel (Click & Collect per WhatsApp/E-Mail). Inhalte in `shop.json` + `images/`, Build mit `node build.js` → `dist/`. Details in `angel-jagd-vorlage/README.md`.
