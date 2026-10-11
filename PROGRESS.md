# PROGRESS

## Erledigt
- **2026-10-09/10:** Vorlagen Salon, Barber, Café, Angel & Jagd mit Coolify-Hosting; Hub-Startseite, CI/CD (GitHub Actions, Smoke-Test, Deploy über Tailscale/Webhook), Seiten per Workflow anlegen/löschen; Fortschritts-Doku (`/progress`, diese Datei)
- **2026-10-10:** Auftrag Nora Solcher (Schauspielerin/Sprecherin): Recherche in `recherche/nora-solcher/` (nur lokal); nüchterne Vorlage `vorlagen/schauspiel/`. Nach Container-Neustart verlorene Arbeit vollständig wiederhergestellt (Workspace jetzt korrekt mit dem Mac-Ordner verbunden)
- **2026-10-11:** Künstlerische Vorlage `vorlagen/buehne/` („Website als Theaterabend“) – `/nora-solcher/` nutzt sie
- **2026-10-11:** Ordner neu strukturiert (`vorlagen/`, `hosting/`, `vertrieb/`, `README.md` als Wegweiser)
- **2026-10-11:** Videos und Kundenfotos aus Git verbannt (auch aus den ungepushten Commits entfernt)
- **2026-10-11:** Technik A–E umgesetzt und getestet:
  - A: gemeinsames `lib/` statt 6 Kopien (Ausgabe byte-gleich), Inhaltsschemas + Prüfung (`tests/inhalte.js`, build-all, VS Code)
  - D: AVIF zusätzlich zu WebP (Ø 26 % kleiner), Cache nach Prüfsumme, parallele Builds (kalt 267 s → 73 s, warm < 1 s)
  - C: Kundenfotos/-medien im S3-Speicher (`scripts/medien.js`), Build holt automatisch – getestet mit SeaweedFS
  - B: Pages CMS (`.pages.yml`) mit deutschen Formularen für Nora; Speichern simuliert – kein Datenverlust
  - E: Lighthouse in der Pipeline; alle Seiten 97–100 Leistung (Noras Layout-Sprung behoben: 74 → 97)

## Offen
- Noras Entwurf (Demo-Modus, noindex) wartet auf ihre Freigabe: Fotorechte/Credits, Texte, Impressum-Anschrift, ggf. Größe 163/165 cm, bessere „Hertopia“-Fotos (nur 960 px)
- `main` ist 7+ Commits vor GitHub, nicht gepusht
- Docker-Build (AVIF-Paket, BuildKit-Cache) und echte Pages-CMS-Oberfläche erst beim ersten Pipeline-Lauf bzw. Login prüfbar
- Aus früher: PageSpeed-API aktivieren (Leads), Testseite `/test/` prüfen

## Nächste Schritte
1. S3-Speicher auf Coolify einrichten (Garage oder SeaweedFS statt MinIO), `MEDIEN_*` als Coolify-Build-Variablen und GitHub-Secrets eintragen, dann `node scripts/medien.js bucket` und `hochladen nora-solcher`
2. Pushen und den ersten Pipeline-Lauf prüfen (Docker-Build mit AVIF, Smoke-Test, Lighthouse)
3. Pages CMS GitHub-App installieren, Nora per E-Mail einladen und ihr den Entwurf zur Freigabe zeigen

## Entscheidungen/Notizen
- **Medien:** Kundenfotos und Videos nie in Git, nur im S3-Speicher; lizenzfreie Vorlagenbilder bleiben in Git
- **CMS:** Pages CMS, weil Nora kein JSON bearbeiten kann; Fotos nicht übers CMS. Listen werden beim Speichern ersetzt → neue Listenfelder immer auch in `.pages.yml` (ggf. `hidden: true`)
- **Nora-Design:** Bühnenschwarz `#100E0D`, Papier `#EDE5D6`, Vorhangrot aus `farben.akzent`; Instrument Serif + JetBrains Mono + Manrope (selbst gehostet); Texte in 3. Person. `vorlagen/schauspiel/` bleibt als nüchterne Alternative (Tausch in `sites.json`)
- **Videos/Hörproben:** verlinkt oder selbst gehostet unter `/<pfad>/medien/`, nie eingebettet von Drittanbietern (CSP nur eigene Domain)
- **Qualität:** Pipeline-Grenzwerte Lighthouse Leistung ≥ 80, Barrierefreiheit/Best Practices ≥ 90 (`tests/lighthouse.js`)
- Lead-Skripte aus `vertrieb/` starten; `recherche/` und Vertriebsdaten bleiben lokal
