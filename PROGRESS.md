# PROGRESS

## Erledigt
- **2026-10-09:** Website-Vorlagen (Salon, Barber, Café, Angel & Jagd) mit Coolify-Hosting unter Unterverzeichnissen
- **2026-10-10:** Hub-Startseite, mobile Umbrüche, CI/CD-Pipeline (GitHub Actions + Smoke-Test), Deploy über Tailscale/Coolify-Webhook, Seiten im Browser anlegen/löschen, Testseite `/test/`
- **2026-10-10:** Fortschritts-Doku: Abschnitt in `CLAUDE.md`, Befehl `/progress`, diese Datei
- **2026-10-10:** Auftrag Nora Solcher (Schauspielerin/Sprecherin): Recherche in `recherche/nora-solcher/` (`info.md`, 21 Fotos mit Credits, Quellen; per `.gitignore` nicht im Repo)
- **2026-10-10:** Neue Vorlage `vorlagen/schauspiel/` + Seite `/nora-solcher/` (Inhalte `kunden/nora-solcher/schauspiel.json`, 16 Fotos). Lokal gebaut, Smoke-Test mit nginx grün (38 Aufrufe), Menü/Reiter/Lightbox geprüft
- **2026-10-11:** Künstlerisches Redesign: neue Vorlage `vorlagen/buehne/` („Website als Theaterabend“ – Ouvertüre mit Scheinwerfer + Rollenwechsel, Besetzungszettel + Laufbänder, Akte Bühne/Kamera/Stimme/Feder, Kontaktbogen, Tickets, Vorhang). `/nora-solcher/` nutzt jetzt diese Vorlage; Inhalte um `hero_rollen`, `prolog`, `zitat`, `register`, `vita[].akt` ergänzt; neue Infos (Rezitation Villa Bonn, Frankfurter Spatzen). Smoke-Test grün, Screenshots in `recherche/nora-solcher/entwurf/`
- **2026-10-11:** Ordner aufgeräumt: `vorlagen/` (alle Vorlagen, ohne „-vorlage“), `hosting/` (nginx), `vertrieb/` (Lead-Skripte, Leads, Pitches, Cache), neue `README.md` als Wegweiser; alle Pfade in `sites.json`, Skripten, Dockerfile, Doku angepasst. Build, Smoke-Test (nginx aus `hosting/`), Seite anlegen/löschen und Einzel-Builds geprüft
- **2026-10-10:** Nach Neustart des Containers war alles aus dieser Session weg (Workspace war vorher nicht mit dem Mac-Ordner verbunden) → komplett wiederhergestellt in `/Users/deluxe/Documents/claude-box/workspace`

## In Arbeit
- Website Nora Solcher: Entwurf fertig (Demo-Modus, noindex), wartet auf Freigabe durch Nora – Vorlage, Seite und `sites.json` noch nicht committet/deployt

## Nächste Schritte
1. Nora den Entwurf zeigen; Freigabe für Fotos (Rechte/Credits), „Über mich“-Text und offene Fragen aus `recherche/nora-solcher/info.md` klären
2. Impressum (Anschrift) ergänzen, bessere „Hertopia“-Fotos (aktuell nur 960 px) und ggf. eigene E-Mail/Domain einholen
3. Nach Freigabe committen → Pipeline → live; danach `demo_modus: false` und `website_url` setzen

## Entscheidungen/Notizen
- Nora (Bühnen-Vorlage): Bühnenschwarz `#100E0D`, Programmheft-Papier `#EDE5D6`, Vorhangrot aus `farben.akzent`; Schriften Instrument Serif + JetBrains Mono + Manrope (selbst gehostet); Texte in 3. Person
- Die nüchterne `vorlagen/schauspiel/` bleibt als Alternative (gleiches Datenformat, Tausch in `sites.json`)
- Videos/Hörproben nur verlinkt, nicht eingebettet (CSP nur eigene Domain, keine Cookies/Drittanbieter)
- `recherche/` ist in `.gitignore` (personenbezogene Daten); Fotos in `kunden/nora-solcher/images/` gehen beim Commit ins Repo und werden veröffentlicht → erst nach Freigabe committen
- Lead-Skripte aus `vertrieb/` starten (`cd vertrieb && python3 lead_finder.py …`), Cache/CSVs landen im aktuellen Ordner
- Offen aus früher: PageSpeed-API aktivieren (Leads), Testseite `/test/` prüfen, `/progress` an CLAUDE.md-Format angleichen
- PROGRESS.md liegt im Workspace-Root; `.claude/settings.local.json` bleibt lokal
