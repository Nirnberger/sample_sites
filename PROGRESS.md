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
- **2026-10-11:** Gepusht; Konflikt mit PR „Seite löschen: /test/“ gelöst (Testseite entfernt, Nora bleibt). Pipeline grün, Deploy läuft
- **2026-10-11:** SeaweedFS auf Coolify (`https://medien.seitenschwung.com`, Port 8333 am Dienst seaweedfs-master), Bucket `kunden-medien`, Noras 16 Fotos hochgeladen, übersteht Neustart; `MEDIEN_*` als Coolify-Build-Variablen → Fotos live auf `/nora-solcher/`
- **2026-10-11:** `node scripts/medien.js sync`: lädt neue/geänderte Fotos aller Kundenseiten hoch und startet die Pipeline (GitHub-Token via `gh` oder `GITHUB_TOKEN`) – lokal mit SeaweedFS + simuliertem GitHub getestet
- **2026-10-11:** `.env` (lokale Schlüssel: Schreibschlüssel S3 + `GITHUB_TOKEN`) in `.gitignore`/`.dockerignore`; Laden mit `set -a; source .env; set +a`. Alles gepusht
- **2026-10-11:** Nora-Neufassung `vorlagen/repertoire` (mehrseitig, Menü Theater · Film · Audio · Schreiben · Unterrichten, ausführliche Kontaktseite, Creme/Braun/Mint, Projekte nach Filmmakers, Film als Projektkarten, Unterricht mit Angeboten/Referenzen). Beide Fassungen live: `/nora-solcher/v1/` (buehne, eingefroren in `v1.json`) und `/nora-solcher/v2/` (CMS); `/nora-solcher/` → 302 auf v2. `pfad` darf Unterordner haben, Medien-Sync nach Kundenordner, Smoke-Test prüft Unterseiten. Branch `nora-buehne-archiv` auf GitHub
- **2026-10-11:** Farbschema von coolors.co (Feld `farbschema`, jedes Export-Format oder Link) für buehne/repertoire, im CMS für v1 und v2. Farb-Labor unter `…/#farben`: Vorschau nur im eigenen Tab, minimierbar, Vorschau-Link teilbar, kein Speichern/Senden. Build und Labor nutzen `lib/farbschema.js`
- **2026-10-11:** SeaweedFS „degraded“ behoben (Philipp); Speicher erreichbar, Noras Fotos mit Schlüssel lesbar
- **2026-10-11:** Cache-Fix: buehne/repertoire binden Skripte mit `?v=<Prüfsumme>` ein (nginx cacht JS 7 Tage). Alles gepusht, Pipeline grün, live geprüft
- **2026-10-11:** Abgesicherte Compose-Datei `hosting/seaweedfs.yml` (kein anonymer Zugriff, kein Admin-UI, nur lesender Schlüssel `build`) – lokal getestet: ohne Schlüssel 403, `build` liest/listet, darf nicht schreiben
- **2026-10-11:** Nora v1 überarbeitet: Akte wie v2 (Theater · Film · Audio · Schreiben · Unterrichten), Fehlendes aus v2 übernommen, neuer Akt-Stil `unterricht` (buehne); Kamera-Akt ohne Animationen. Farb-Labor: Farbwähler für Palette/Rollen, Rollen tauschen/mischen, „Automatisch“, Kontrastanzeige; feste Rollen `{"Hintergrund":…,"Schrift":…,"Akzent":…,"Flächen":…}` gelten auch im Build/CMS, Link `#farben=r:…`. Gepusht (`7650210`)
- **2026-10-11:** Pipeline `paths-ignore`: Änderungen nur an `**.md`, `.claude/`, `.vscode/`, `.pages.yml`, `vertrieb/`, `hosting/seaweedfs.yml` starten keinen Lauf/Deploy (`254b36f`)
- **2026-10-11:** Remote Control (Handy) für diese Session an, neue Sessions verbinden sich automatisch
- **2026-10-11:** Farb-Labor: Rollen beeinflussen sich nicht mehr gegenseitig – Klick auf Palettenfarbe tauscht nicht mehr, Rollen-Farbwähler ändert die Palette nicht mehr, feste Rollen werden in der Vorlage nicht mehr nachgeregelt (repertoire: Flächen/Akzent, buehne: Papier 2); Labor zeigt stattdessen Kontrastwarnungen (Schrift/Hintergrund, Schrift/Flächen, Akzent/Hintergrund).
- **2026-10-11:** Nora v1 (buehne): neue Szene „Zuletzt“ direkt unter dem Hero (Hertopia groß mit Foto, „Innere Sicherheit“ und NARNIA klein; aus dem Prolog entfernt), Programm-Menü nur Theater · Film · Audio · Schreiben · Unterrichten · Kontakt, Filmklappen durch schlichte Karten ersetzt, voller Frankfurter-Spatzen-Text als Zitat im Akt Unterrichten. Danach: Rotstift-Kreise im Kontaktbogen entfernt (`markiert` raus), Akt Unterrichten neu gegliedert (Angebote 01–03 knapp + Erfolgshinweis, darunter „Wo Nora unterrichtet“ | „Stimme aus der Praxis“), Texte gekürzt; Überschriften „Kontaktbogen“ → „Galerie“, „Besetzung anfragen“ → „Kontakt aufnehmen“. Menü als immer sichtbare Reiterleiste oben (statt Programm-Knopf + Overlay), aktiver Abschnitt markiert. Hero: zwei Scheinwerfer (groß/klein), nach 2,5 s ohne Mausbewegung schwingen sie suchend hin und her. Standardfarben v1 per `farbschema` mit festen Rollen: Hintergrund `#f2e8cf`, Schrift `#223e28`, Akzent `#a7c957`, Flächen `#bc4749`. Danach: Szene „Einlass“ (Sehen & Hören) und Vorhang am Seitenende entfernt, Instagram als Knopf im Kontakt und in der Fußzeile, Akt Schreiben mit Foto links (`akt.bild`, Poetry-Slam-Foto aus der Mediathek Hessen, Credit vorläufig „Mediathek Hessen“), suchende Scheinwerfer klein und hell. Gepusht, Foto in S3. Live geprüft, Pipeline grün
- **2026-10-11:** Farb-Labor/buehne: Rollen „Bühne“ (dunkle Szenen) und „Schrift“ getrennt (fünfte feste Rolle `Bühne`, optional – ohne sie gilt die Schrift auch für die Bühne; Link `r:` mit 5 Farben, alte 4er-Links gehen weiter). Labor startet mit den Farben der Seite (Farbschema bzw. Standardfarben der Vorlage, Attribut `data-farben-start`), Knopf „Zurücksetzen“; bei festen Rollen ein Palettenfeld je Rolle (v1: 5), Felder fest an ihre Rolle gebunden; repertoire mit 5. Rolle „Abschnitte“ (`--sand`, optional), damit beide Vorlagen 5 Farben haben. Standardfarben v2 per `farbschema`: Hintergrund `#F6F1E9`, Abschnitte `#ECE3D5`, Schrift `#502D2B`, Akzent `#3D6651`, Flächen `#E7DEDD`
- **2026-10-11:** Texte v1/v2 ohne Gedankenstriche als Satzzeichen (weniger KI-typisch): Fließtexte in `v1.json`/`schauspiel.json` umformuliert, feste Vorlagentexte angepasst (repertoire: Kontakt-Hinweis, Auszeichnungen; buehne: Manuskript, Berufe-Zeile). Striche bleiben nur in Werktiteln, Jahresspannen, Größen, Agenturname, Paragrafen, Browser-Titeln. Gepusht

- **2026-10-11:** Recherche Gruppe 42 (gruppe42.at, Personalentwicklung, Mag. Ingrid Nirnberger, Wien): alle 45 Unterseiten gecrawlt, Zusammenfassung `recherche/gruppe42/info.md` (Leistungen, Workshops, Referenzen, Kundenstimmen, Blog, Schwächen, Fragen), Styleguide `recherche/gruppe42/styleguide.html` (Farben mit Kontrasten, Playfair + Open Sans, Komponenten, Bildsprache, Tokens). Quellen/Screenshots/Bilder dort, nur lokal

- **2026-10-11:** Gruppe 42 Website-Entwurf als Design-Canvas (privat): https://claude.ai/artifact/SsyGRF4fsNWpsVBLaqxPt4 – Startseite, Leistungsseite Führungskräfte (Workshop-Filter), Styleguide. Look (warm): Honiggelb #F2B33D, Espresso #2E2520, Creme #FFFBF5, Sand #F8EEDF, Waldgrün #2F4A3F, Terrakotta #9A4E1A; Newsreader + Figtree (Regler: Hanken Grotesk, Instrument Serif + Plus Jakarta); alle Bilder Unsplash-Platzhalter, Hero-Foto (FORTYTWO, Quelle in `recherche/gruppe42/bilder/unsplash/`). Alter Ist-Styleguide jetzt `recherche/gruppe42/quellen/styleguide-bestand.html`

- **2026-10-11:** Gruppe 42 Website gebaut: neue Vorlage `vorlagen/beratung/` (Design aus dem Entwurf, Newsreader + Figtree selbst gehostet, Unsplash-Bilder in der Vorlage), Inhalte `kunden/gruppe42/gruppe42.json` (Startseite, 4 Zielgruppen-Seiten mit Workshop-Filter, Unternehmenskultur, Employer Branding, Impressum, Datenschutz; Demo-Modus). Neues Feld `domain` in `sites.json` → `build-all.js` erzeugt `nginx-domains.conf` (Serverblock für `gruppe42.seitenschwung.com`), gemeinsame Datei-Regeln in `hosting/nginx-dateien.conf`. Lokal mit nginx getestet: Smoke-Test 68/68, Lighthouse gruppe42 96/100/100. Porträt (`ingring_nirnberger.png`) im S3

## Offen
- Falls in den Branch-Regeln „Build, Docker & Smoke-Test“ Pflicht-Check ist: reine Doku-PRs warten dann ewig (wegen `paths-ignore`) – prüfen, ggf. auf Skip-Job umbauen
- Mac: Claude-App (und Docker Desktop) in die Anmeldeobjekte eintragen, damit Handy-Anbindung nach Neustart von selbst klappt
- Gleiches Cache-Problem in salon/barber/cafe/angel-jagd (`js/main.js` ohne Versionsnummer, 7 Tage Cache) – Fix wie bei repertoire anbieten
- v1 (buehne) mit eigener Palette: großer Name nutzt Mischmodus „Differenz“ → bei rötlicher Bühne mintgrün statt beige (ggf. einfarbig setzen)
- Workflow/Skript „Seite löschen“ akzeptiert keine Pfade mit Unterordner (`nora-solcher/v1`) – nur von Hand in `sites.json`
- CMS-Formulare für Nora stark umgebaut (Bereiche, Farbschema, v1) – noch nie in Pages CMS selbst getestet
- Fragen an Nora zur Neufassung: eigene E-Mail für Unterricht/Kooperationen (`kontakt.email_direkt`, bis dahin geht alles ans Management), Ort des Präsenzunterrichts, Rollengröße Tatort, Texte der Unterrichtsangebote freigeben, Film-Standbilder vorhanden?
- Noras Entwurf (Demo-Modus, noindex) wartet auf ihre Freigabe: Fotorechte/Credits, Texte, Impressum-Anschrift, ggf. Größe 163/165 cm, bessere „Hertopia“-Fotos (nur 960 px)
- **SeaweedFS: einzelne Dateien weiter ohne Schlüssel lesbar** (Stand 2026-10-11: `…/kunden-medien/nora-solcher/images/hero.jpg` → 200, Bucket-Liste → 403). „Degraded“ ist gelöst – prüfen, ob `hosting/seaweedfs.yml` wirklich aktiv ist oder der Bucket eine öffentliche Lese-Regel hat
- Unklar, ob Coolify/GitHub den schreibenden Schlüssel (`SERVICE_USER_S3`) statt eines nur lesenden nutzen
- Pages-CMS-Oberfläche erst nach Login prüfbar
- CSP-Konsolenmeldung (Hash `Q00BMk9…`) stammt nicht von unseren Seiten – vermutlich Browser-Erweiterung; im privaten Fenster gegenprüfen
- Aus früher: PageSpeed-API aktivieren (Leads)

- Gruppe 42: offene Fragen an die Kundin in `recherche/gruppe42/info.md` (Umfang, Rechte an Illustrationen/Logo als Vektor, Online Seminare, Preise, Englisch)

- Gruppe 42 Subdomain: DNS-A-Eintrag `gruppe42.seitenschwung.com` und Domain in Coolify ergänzen (siehe HOSTING.md „Eigene (Sub-)Domain“)
- Gruppe 42 Impressum prüfen lassen: Aufsichtsbehörde (Magistratisches Bezirksamt 2. Bezirk angenommen), Rechtsform/Firmenbuch; Porträt nur 952 px
- Gruppe 42: Workflow „Neue Seite anlegen“ kennt Vorlage `beratung` noch nicht

## Nächste Schritte
1. Nora beide Fassungen zeigen (`/nora-solcher/v1/` und `/v2/`, Farb-Labor mit `#farben`) und Fragen klären: eigene E-Mail für Unterricht, Ort Präsenzunterricht, Texte der Angebote, Impressum-Anschrift, Fotorechte
2. Pages CMS GitHub-App installieren und auf Branch `cms-test` testen (Bereiche-Listen, Farbschema-Feld, v1-Eintrag; danach `git diff` auf Datenverlust prüfen), dann Nora einladen
3. SeaweedFS anonymes Lesen abstellen (aktive Konfiguration/Bucket-Regel prüfen, Ziel: `hero.jpg` ohne Schlüssel → 403), dann `MEDIEN_ZUGANG`/`MEDIEN_GEHEIMNIS` in Coolify und GitHub auf den lesenden Schlüssel `build` umstellen

4. Gruppe 42: Styleguide mit Kundin abstimmen, danach eigene Vorlage (z. B. `vorlagen/beratung/`) aus den Tokens bauen

## Entscheidungen/Notizen
- **Medien:** Kundenfotos und Videos nie in Git, nur im S3-Speicher; lizenzfreie Vorlagenbilder bleiben in Git
- **CMS:** Pages CMS, weil Nora kein JSON bearbeiten kann; Fotos nicht übers CMS. Listen werden beim Speichern ersetzt → neue Listenfelder immer auch in `.pages.yml` (ggf. `hidden: true`)
- **Nora-Design (ab 2026-10-11, Vorlage repertoire):** Creme `#F6F1E9`, Sand `#ECE3D5`, Mint `#D5E8DD`/`#A9CBB8`, Salbei `#3D6651` (Text-Akzent), Braun `#3A2C24`/`#6B5242`; Fraunces + Manrope; Texte in 3. Person; Tanz läuft unter „Theater“ (Gruppe „Tanz & Choreografie“). Frühere Bühnen-Fassung (schwarz/rot, Instrument Serif) bleibt als v1 online, wird nicht mehr gepflegt
- **Farbschema:** Vorschau nur im Browser (`#farben`), dauerhaft nur über CMS (Login + Pipeline) – bewusst kein Schreibzugang auf der Website. Rollen automatisch: hellste = Hintergrund, dunkelste = Schrift, kräftigste = Akzent; Kontraste werden nachgeregelt Von Hand verteilte Rollen (Labor-Export als Objekt) haben Vorrang: keine Rolle wird wegen einer anderen nachgeregelt, das Labor warnt unter 4,5:1. Ausnahme buehne: Akzent-Varianten auf Bühne/Papier (`--rot-hell`/`--rot-dunkel`, `--kodak`) bleiben lesbar angepasst
- **Nora v1/v2:** v1 eingefroren (nur Farbschema änderbar; Gliederung am 2026-10-11 an v2 angeglichen), gepflegt wird v2; bisherige Links `/nora-solcher/` landen auf v2
- **Videos/Hörproben:** verlinkt oder selbst gehostet unter `/<pfad>/medien/`, nie eingebettet von Drittanbietern (CSP nur eigene Domain)
- **Pipeline-Ausnahmen:** nur Dateien in `paths-ignore`, die weder Build, Image noch Tests lesen
- **Texte:** keine Gedankenstriche als Pause/Verbindung in Fließtexten (wirkt KI-typisch); erlaubt in Titeln, Spannen, Namen
- **Qualität:** Pipeline-Grenzwerte Lighthouse Leistung ≥ 80, Barrierefreiheit/Best Practices ≥ 90 (`tests/lighthouse.js`)
- **S3/SeaweedFS:** nur über `https://medien.seitenschwung.com` (keine sslip-Domains, keine Port-Mappings, kein Admin-UI); ohne Schlüssel nichts lesbar; Build nur mit lesendem Schlüssel. Live-Seite baut Coolify (dessen Variablen zählen), GitHub-Secrets nur für den Pipeline-Test
- **Schlüssel:** lokal nur in `.env` (ignoriert); Upload immer per `node scripts/medien.js sync` (startet geprüften Deploy über die Pipeline, nicht direkt den Coolify-Webhook)
- Lead-Skripte aus `vertrieb/` starten; `recherche/` und Vertriebsdaten bleiben lokal
