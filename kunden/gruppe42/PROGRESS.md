# PROGRESS – Gruppe 42 (Website, Vorlage beratung)

## Erledigt
- **2026-10-11:** Recherche Gruppe 42 (gruppe42.at, Personalentwicklung, Mag. Ingrid Nirnberger, Wien): alle 45 Unterseiten gecrawlt, Zusammenfassung `recherche/gruppe42/info.md` (Leistungen, Workshops, Referenzen, Kundenstimmen, Blog, Schwächen, Fragen), Styleguide `recherche/gruppe42/styleguide.html` (Farben mit Kontrasten, Playfair + Open Sans, Komponenten, Bildsprache, Tokens). Quellen/Screenshots/Bilder dort, nur lokal
- **2026-10-11:** Gruppe 42 Website-Entwurf als Design-Canvas (privat): https://claude.ai/artifact/SsyGRF4fsNWpsVBLaqxPt4 – Startseite, Leistungsseite Führungskräfte (Workshop-Filter), Styleguide. Look (warm): Honiggelb #F2B33D, Espresso #2E2520, Creme #FFFBF5, Sand #F8EEDF, Waldgrün #2F4A3F, Terrakotta #9A4E1A; Newsreader + Figtree (Regler: Hanken Grotesk, Instrument Serif + Plus Jakarta); alle Bilder Unsplash-Platzhalter, Hero-Foto (FORTYTWO, Quelle in `recherche/gruppe42/bilder/unsplash/`). Alter Ist-Styleguide jetzt `recherche/gruppe42/quellen/styleguide-bestand.html`
- **2026-10-11:** Gruppe 42 Website gebaut: neue Vorlage `vorlagen/beratung/` (Design aus dem Entwurf, Newsreader + Figtree selbst gehostet, Unsplash-Bilder in der Vorlage), Inhalte `kunden/gruppe42/gruppe42.json` (Startseite, 4 Zielgruppen-Seiten mit Workshop-Filter, Unternehmenskultur, Employer Branding, Impressum, Datenschutz; Demo-Modus). Neues Feld `domain` in `sites.json` → `build-all.js` erzeugt `nginx-domains.conf` (Serverblock für `gruppe42.seitenschwung.com`), gemeinsame Datei-Regeln in `hosting/nginx-dateien.conf`. Lokal mit nginx getestet: Smoke-Test 68/68, Lighthouse gruppe42 96/100/100. Porträt (`ingring_nirnberger.png`) im S3

## Offen
- Gruppe 42: offene Fragen an die Kundin in `recherche/gruppe42/info.md` (Umfang, Rechte an Illustrationen/Logo als Vektor, Online Seminare, Preise, Englisch)
- Gruppe 42 Subdomain: DNS-A-Eintrag `gruppe42.seitenschwung.com` und Domain in Coolify ergänzen (siehe HOSTING.md „Eigene (Sub-)Domain“)
- Gruppe 42 Impressum prüfen lassen: Aufsichtsbehörde (Magistratisches Bezirksamt 2. Bezirk angenommen), Rechtsform/Firmenbuch; Porträt nur 952 px
- Gruppe 42: Workflow „Neue Seite anlegen“ kennt Vorlage `beratung` noch nicht

## Nächste Schritte
1. DNS-A-Eintrag `gruppe42.seitenschwung.com` und Domain in Coolify ergänzen, danach Seite unter der Subdomain prüfen
2. Entwurf mit Ingrid durchgehen (Design-Canvas https://claude.ai/artifact/SsyGRF4fsNWpsVBLaqxPt4 und Website), Fragen aus `recherche/gruppe42/info.md` klären
3. Nach Freigabe: Impressum bestätigen lassen, `demo_modus` auf false, ggf. eigene Workshop-Fotos statt Unsplash

## Entscheidungen/Notizen
- **Look:** Honiggelb #F2B33D, Creme #FFFBF5, Sand #F8EEDF, Espresso #2E2520, Waldgrün #2F4A3F, Terrakotta #9A4E1A; Newsreader + Figtree. Bilder vorerst Unsplash (Nachweise in `recherche/gruppe42/bilder/unsplash/QUELLEN.md`), Porträt `ingring_nirnberger.png` im S3
