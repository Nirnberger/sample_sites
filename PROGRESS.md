# PROGRESS – Gemeinsames (Hosting, Pipeline, Vorlagen, Vertrieb)

Projektarbeit steht in der PROGRESS.md des Kundenordners: `kunden/nora-solcher/PROGRESS.md`, `kunden/gruppe42/PROGRESS.md`.

## Erledigt
- **2026-10-09/10:** Vorlagen Salon, Barber, Café, Angel & Jagd mit Coolify-Hosting; Hub-Startseite, CI/CD (GitHub Actions, Smoke-Test, Deploy über Tailscale/Webhook), Seiten per Workflow anlegen/löschen; Fortschritts-Doku (`/progress`, diese Datei)
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
- **2026-10-11:** Farbschema von coolors.co (Feld `farbschema`, jedes Export-Format oder Link) für buehne/repertoire, im CMS für v1 und v2. Farb-Labor unter `…/#farben`: Vorschau nur im eigenen Tab, minimierbar, Vorschau-Link teilbar, kein Speichern/Senden. Build und Labor nutzen `lib/farbschema.js`
- **2026-10-11:** SeaweedFS „degraded“ behoben (Philipp); Speicher erreichbar, Noras Fotos mit Schlüssel lesbar
- **2026-10-11:** Cache-Fix: buehne/repertoire binden Skripte mit `?v=<Prüfsumme>` ein (nginx cacht JS 7 Tage). Alles gepusht, Pipeline grün, live geprüft
- **2026-10-11:** Abgesicherte Compose-Datei `hosting/seaweedfs.yml` (kein anonymer Zugriff, kein Admin-UI, nur lesender Schlüssel `build`) – lokal getestet: ohne Schlüssel 403, `build` liest/listet, darf nicht schreiben
- **2026-10-11:** Pipeline `paths-ignore`: Änderungen nur an `**.md`, `.claude/`, `.vscode/`, `.pages.yml`, `vertrieb/`, `hosting/seaweedfs.yml` starten keinen Lauf/Deploy (`254b36f`)
- **2026-10-11:** Remote Control (Handy) für diese Session an, neue Sessions verbinden sich automatisch
- **2026-10-11:** Farb-Labor: Rollen beeinflussen sich nicht mehr gegenseitig – Klick auf Palettenfarbe tauscht nicht mehr, Rollen-Farbwähler ändert die Palette nicht mehr, feste Rollen werden in der Vorlage nicht mehr nachgeregelt (repertoire: Flächen/Akzent, buehne: Papier 2); Labor zeigt stattdessen Kontrastwarnungen (Schrift/Hintergrund, Schrift/Flächen, Akzent/Hintergrund).
- **2026-10-11:** Farb-Labor/buehne: Rollen „Bühne“ (dunkle Szenen) und „Schrift“ getrennt (fünfte feste Rolle `Bühne`, optional – ohne sie gilt die Schrift auch für die Bühne; Link `r:` mit 5 Farben, alte 4er-Links gehen weiter). Labor startet mit den Farben der Seite (Farbschema bzw. Standardfarben der Vorlage, Attribut `data-farben-start`), Knopf „Zurücksetzen“; bei festen Rollen ein Palettenfeld je Rolle (v1: 5), Felder fest an ihre Rolle gebunden; repertoire mit 5. Rolle „Abschnitte“ (`--sand`, optional), damit beide Vorlagen 5 Farben haben. Standardfarben v2 per `farbschema`: Hintergrund `#F6F1E9`, Abschnitte `#ECE3D5`, Schrift `#502D2B`, Akzent `#3D6651`, Flächen `#E7DEDD`

## Offen
- Falls in den Branch-Regeln „Build, Docker & Smoke-Test“ Pflicht-Check ist: reine Doku-PRs warten dann ewig (wegen `paths-ignore`) – prüfen, ggf. auf Skip-Job umbauen
- Mac: Claude-App (und Docker Desktop) in die Anmeldeobjekte eintragen, damit Handy-Anbindung nach Neustart von selbst klappt
- Gleiches Cache-Problem in salon/barber/cafe/angel-jagd (`js/main.js` ohne Versionsnummer, 7 Tage Cache) – Fix wie bei repertoire anbieten
- Workflow/Skript „Seite löschen“ akzeptiert keine Pfade mit Unterordner (`nora-solcher/v1`) – nur von Hand in `sites.json`
- **SeaweedFS: einzelne Dateien weiter ohne Schlüssel lesbar** (Stand 2026-10-11: `…/kunden-medien/nora-solcher/images/hero.jpg` → 200, Bucket-Liste → 403). „Degraded“ ist gelöst – prüfen, ob `hosting/seaweedfs.yml` wirklich aktiv ist oder der Bucket eine öffentliche Lese-Regel hat
- Unklar, ob Coolify/GitHub den schreibenden Schlüssel (`SERVICE_USER_S3`) statt eines nur lesenden nutzen
- CSP-Konsolenmeldung (Hash `Q00BMk9…`) stammt nicht von unseren Seiten – vermutlich Browser-Erweiterung; im privaten Fenster gegenprüfen
- Aus früher: PageSpeed-API aktivieren (Leads)

## Nächste Schritte
1. SeaweedFS anonymes Lesen abstellen (aktive Konfiguration/Bucket-Regel prüfen, Ziel: `hero.jpg` ohne Schlüssel → 403), dann `MEDIEN_ZUGANG`/`MEDIEN_GEHEIMNIS` in Coolify und GitHub auf den lesenden Schlüssel `build` umstellen

## Entscheidungen/Notizen
- **Medien:** Kundenfotos und Videos nie in Git, nur im S3-Speicher; lizenzfreie Vorlagenbilder bleiben in Git
- **Farbschema:** Vorschau nur im Browser (`#farben`), dauerhaft nur über CMS (Login + Pipeline) – bewusst kein Schreibzugang auf der Website. Rollen automatisch: hellste = Hintergrund, dunkelste = Schrift, kräftigste = Akzent; Kontraste werden nachgeregelt Von Hand verteilte Rollen (Labor-Export als Objekt) haben Vorrang: keine Rolle wird wegen einer anderen nachgeregelt, das Labor warnt unter 4,5:1. Ausnahme buehne: Akzent-Varianten auf Bühne/Papier (`--rot-hell`/`--rot-dunkel`, `--kodak`) bleiben lesbar angepasst
- **Videos/Hörproben:** verlinkt oder selbst gehostet unter `/<pfad>/medien/`, nie eingebettet von Drittanbietern (CSP nur eigene Domain)
- **Pipeline-Ausnahmen:** nur Dateien in `paths-ignore`, die weder Build, Image noch Tests lesen
- **Texte:** keine Gedankenstriche als Pause/Verbindung in Fließtexten (wirkt KI-typisch); erlaubt in Titeln, Spannen, Namen
- **Qualität:** Pipeline-Grenzwerte Lighthouse Leistung ≥ 80, Barrierefreiheit/Best Practices ≥ 90 (`tests/lighthouse.js`)
- **S3/SeaweedFS:** nur über `https://medien.seitenschwung.com` (keine sslip-Domains, keine Port-Mappings, kein Admin-UI); ohne Schlüssel nichts lesbar; Build nur mit lesendem Schlüssel. Live-Seite baut Coolify (dessen Variablen zählen), GitHub-Secrets nur für den Pipeline-Test
- **Schlüssel:** lokal nur in `.env` (ignoriert); Upload immer per `node scripts/medien.js sync` (startet geprüften Deploy über die Pipeline, nicht direkt den Coolify-Webhook)
- Lead-Skripte aus `vertrieb/` starten; `recherche/` und Vertriebsdaten bleiben lokal
