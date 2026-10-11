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

## Offen
- Noras Entwurf (Demo-Modus, noindex) wartet auf ihre Freigabe: Fotorechte/Credits, Texte, Impressum-Anschrift, ggf. Größe 163/165 cm, bessere „Hertopia“-Fotos (nur 960 px)
- **SeaweedFS liefert Dateien ohne Schlüssel aus** (`…/kunden-medien/nora-solcher/images/hero.jpg` → 200; Liste gesperrt): läuft noch mit Originalvorlage (`"anonymous": Read`, Admin-Dienst). Eigene Compose-Datei (ohne anonymous/Admin, zusätzlicher nur lesender Schlüssel `build`) noch nicht übernommen
- Unklar, ob Coolify/GitHub den schreibenden Schlüssel (`SERVICE_USER_S3`) statt eines nur lesenden nutzen
- Pages-CMS-Oberfläche erst nach Login prüfbar
- CSP-Konsolenmeldung (Hash `Q00BMk9…`) stammt nicht von unseren Seiten – vermutlich Browser-Erweiterung; im privaten Fenster gegenprüfen
- Aus früher: PageSpeed-API aktivieren (Leads)

## Nächste Schritte
1. SeaweedFS absichern: Edit Compose File → eigene Datei (ohne anonymous, mit `build`-Identität) → Restart; prüfen, dass `hero.jpg` ohne Schlüssel 403 liefert
2. `MEDIEN_ZUGANG`/`MEDIEN_GEHEIMNIS` in Coolify und GitHub-Secrets auf `SERVICE_USER_BUILD`/`SERVICE_PASSWORD_BUILD` umstellen, Website redeployen
3. Pages CMS GitHub-App installieren, auf Branch `cms-test` testen (Listen!, danach `git diff`), dann Nora einladen und Entwurf zur Freigabe zeigen

## Entscheidungen/Notizen
- **Medien:** Kundenfotos und Videos nie in Git, nur im S3-Speicher; lizenzfreie Vorlagenbilder bleiben in Git
- **CMS:** Pages CMS, weil Nora kein JSON bearbeiten kann; Fotos nicht übers CMS. Listen werden beim Speichern ersetzt → neue Listenfelder immer auch in `.pages.yml` (ggf. `hidden: true`)
- **Nora-Design:** Bühnenschwarz `#100E0D`, Papier `#EDE5D6`, Vorhangrot aus `farben.akzent`; Instrument Serif + JetBrains Mono + Manrope (selbst gehostet); Texte in 3. Person. `vorlagen/schauspiel/` bleibt als nüchterne Alternative (Tausch in `sites.json`)
- **Videos/Hörproben:** verlinkt oder selbst gehostet unter `/<pfad>/medien/`, nie eingebettet von Drittanbietern (CSP nur eigene Domain)
- **Qualität:** Pipeline-Grenzwerte Lighthouse Leistung ≥ 80, Barrierefreiheit/Best Practices ≥ 90 (`tests/lighthouse.js`)
- **S3/SeaweedFS:** nur über `https://medien.seitenschwung.com` (keine sslip-Domains, keine Port-Mappings, kein Admin-UI); ohne Schlüssel nichts lesbar; Build nur mit lesendem Schlüssel. Live-Seite baut Coolify (dessen Variablen zählen), GitHub-Secrets nur für den Pipeline-Test
- Lead-Skripte aus `vertrieb/` starten; `recherche/` und Vertriebsdaten bleiben lokal
