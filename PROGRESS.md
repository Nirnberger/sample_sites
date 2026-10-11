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
- **2026-10-11:** Noras Seite neu: Vorlage `vorlagen/repertoire` (mehrseitig, Menü Theater · Film · Audio · Schreiben · Unterrichten immer sichtbar, ausführliche Kontaktseite, Creme/Braun/Mint, keine Animationen). Projekte nach Filmmakers, Film als Projektkarten, Unterricht mit Angeboten/Referenzen. Alte Fassung auf Branch `nora-buehne-archiv` (lokal). `.pages.yml` aufs neue Format umgestellt, Smoke-Test prüft jetzt auch Unterseiten. Lokal getestet: Smoke (nginx) grün, Lighthouse 99–100
- **2026-10-11:** Beide Fassungen gehostet: `/nora-solcher/v1/` (buehne, eingefroren in `v1.json`) und `/nora-solcher/v2/` (repertoire, CMS); `/nora-solcher/` → 302 auf v2. `pfad` mit Unterordnern erlaubt, Medien-Sync nach Kundenordner. Lokal getestet: Smoke 25 Seiten grün
- **2026-10-11:** Abgesicherte Compose-Datei `hosting/seaweedfs.yml` (kein anonymer Zugriff, kein Admin-UI, nur lesender Schlüssel `build`) – lokal getestet: ohne Schlüssel 403, `build` liest/listet, darf nicht schreiben

## Offen
- **Nora v1/v2 noch nicht gepusht** (Commits auf `main` lokal, Branch `nora-buehne-archiv` lokal) – Push nach OK von Philipp
- Fragen an Nora zur Neufassung: eigene E-Mail für Unterricht/Kooperationen (`kontakt.email_direkt`, bis dahin geht alles ans Management), Ort des Präsenzunterrichts, Rollengröße Tatort, Texte der Unterrichtsangebote freigeben, Film-Standbilder vorhanden?
- Noras Entwurf (Demo-Modus, noindex) wartet auf ihre Freigabe: Fotorechte/Credits, Texte, Impressum-Anschrift, ggf. Größe 163/165 cm, bessere „Hertopia“-Fotos (nur 960 px)
- **SeaweedFS liefert Dateien ohne Schlüssel aus** (`hero.jpg` → 200). Compose in Coolify durch `hosting/seaweedfs.yml` ersetzt, Dienst jetzt **„degraded“**, alte Konfiguration antwortet weiter. Ursache unklar: neuer Container startet nicht oder verwaister Admin-Container – Container-Liste/Logs von seaweedfs-master ansehen. Fotos und Schreibschlüssel funktionieren weiterhin
- Unklar, ob Coolify/GitHub den schreibenden Schlüssel (`SERVICE_USER_S3`) statt eines nur lesenden nutzen
- Pages-CMS-Oberfläche erst nach Login prüfbar
- CSP-Konsolenmeldung (Hash `Q00BMk9…`) stammt nicht von unseren Seiten – vermutlich Browser-Erweiterung; im privaten Fenster gegenprüfen
- Aus früher: PageSpeed-API aktivieren (Leads)

## Nächste Schritte
1. „Degraded“ klären (Container-Liste + Logs seaweedfs-master; ggf. Stop → Deploy), dann prüfen: `hero.jpg` ohne Schlüssel 403, `node scripts/medien.js liste nora-solcher` mit `.env` zeigt 16 Fotos
2. `MEDIEN_ZUGANG`/`MEDIEN_GEHEIMNIS` in Coolify und GitHub-Secrets auf `SERVICE_USER_BUILD`/`SERVICE_PASSWORD_BUILD` umstellen, Website redeployen
3. Pages CMS GitHub-App installieren, auf Branch `cms-test` testen (Listen!, danach `git diff`), dann Nora einladen und Entwurf zur Freigabe zeigen

## Entscheidungen/Notizen
- **Medien:** Kundenfotos und Videos nie in Git, nur im S3-Speicher; lizenzfreie Vorlagenbilder bleiben in Git
- **CMS:** Pages CMS, weil Nora kein JSON bearbeiten kann; Fotos nicht übers CMS. Listen werden beim Speichern ersetzt → neue Listenfelder immer auch in `.pages.yml` (ggf. `hidden: true`)
- **Nora-Design (ab 2026-10-11, Vorlage repertoire):** Creme `#F6F1E9`, Sand `#ECE3D5`, Mint `#D5E8DD`/`#A9CBB8`, Salbei `#3D6651` (Text-Akzent), Braun `#3A2C24`/`#6B5242`; Fraunces + Manrope; Texte in 3. Person; Tanz läuft unter „Theater“ (Gruppe „Tanz & Choreografie“). Frühere Bühnen-Fassung (schwarz/rot, Instrument Serif) bleibt als v1 online, wird nicht mehr gepflegt
- **Videos/Hörproben:** verlinkt oder selbst gehostet unter `/<pfad>/medien/`, nie eingebettet von Drittanbietern (CSP nur eigene Domain)
- **Qualität:** Pipeline-Grenzwerte Lighthouse Leistung ≥ 80, Barrierefreiheit/Best Practices ≥ 90 (`tests/lighthouse.js`)
- **S3/SeaweedFS:** nur über `https://medien.seitenschwung.com` (keine sslip-Domains, keine Port-Mappings, kein Admin-UI); ohne Schlüssel nichts lesbar; Build nur mit lesendem Schlüssel. Live-Seite baut Coolify (dessen Variablen zählen), GitHub-Secrets nur für den Pipeline-Test
- **Schlüssel:** lokal nur in `.env` (ignoriert); Upload immer per `node scripts/medien.js sync` (startet geprüften Deploy über die Pipeline, nicht direkt den Coolify-Webhook)
- Lead-Skripte aus `vertrieb/` starten; `recherche/` und Vertriebsdaten bleiben lokal
