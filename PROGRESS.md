# PROGRESS

## Erledigt
- **2026-10-09:** Website-Vorlagen (Salon, Barber, Café, Angel & Jagd) mit Coolify-Hosting unter Unterverzeichnissen
- **2026-10-10:** Hub-Startseite, mobile Umbrüche, CI/CD-Pipeline (GitHub Actions + Smoke-Test), Deploy über Tailscale/Coolify-Webhook, Seiten im Browser anlegen/löschen, Testseite `/test/`
- **2026-10-10:** Fortschritts-Doku: Abschnitt in `CLAUDE.md`, Befehl `/progress`, diese Datei
- **2026-10-10:** Auftrag Nora Solcher (Schauspielerin/Sprecherin): Recherche in `recherche/nora-solcher/` (`info.md`, 21 Fotos mit Credits, Quellen; per `.gitignore` nicht im Repo)
- **2026-10-10:** Neue `schauspiel-vorlage/` + Seite `/nora-solcher/` (Inhalte `kunden/nora-solcher/schauspiel.json`, 16 Fotos). Lokal gebaut, Smoke-Test mit nginx grün (38 Aufrufe), Menü/Reiter/Lightbox geprüft
- **2026-10-10:** Nach Neustart des Containers war alles aus dieser Session weg (Workspace war vorher nicht mit dem Mac-Ordner verbunden) → komplett wiederhergestellt in `/Users/deluxe/Documents/claude-box/workspace`

## In Arbeit
- Website Nora Solcher: Entwurf fertig (Demo-Modus, noindex), wartet auf Freigabe durch Nora – Vorlage, Seite und `sites.json` noch nicht committet/deployt

## Nächste Schritte
1. Nora den Entwurf zeigen; Freigabe für Fotos (Rechte/Credits), „Über mich“-Text und offene Fragen aus `recherche/nora-solcher/info.md` klären
2. Impressum (Anschrift) ergänzen, bessere „Hertopia“-Fotos (aktuell nur 960 px) und ggf. eigene E-Mail/Domain einholen
3. Nach Freigabe committen → Pipeline → live; danach `demo_modus: false` und `website_url` setzen

## Entscheidungen/Notizen
- Nora: Farben warmes Off-White/Dunkel, Akzent Rostrot `#A84B2A` (aus Porträt), Schriften Fraunces + Manrope; Texte in 3. Person
- Videos/Hörproben nur verlinkt, nicht eingebettet (CSP nur eigene Domain, keine Cookies/Drittanbieter)
- `recherche/` ist in `.gitignore` (personenbezogene Daten); Fotos in `kunden/nora-solcher/images/` gehen beim Commit ins Repo und werden veröffentlicht → erst nach Freigabe committen
- Offen aus früher: PageSpeed-API aktivieren (Leads), Testseite `/test/` prüfen, `/progress` an CLAUDE.md-Format angleichen
- PROGRESS.md liegt im Workspace-Root; `.claude/settings.local.json` bleibt lokal
