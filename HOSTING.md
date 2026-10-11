# Hosting auf Coolify – alle Seiten unter einer Domain

Alle Seiten aus `sites.json` laufen in **einem** Container unter einer Domain, jede in ihrem
eigenen Unterverzeichnis:

```
https://demo.deine-domain.at/                    ← Hub mit den Beispielprojekten
https://demo.deine-domain.at/petri-pirsch/
https://demo.deine-domain.at/kante-klinge/
https://demo.deine-domain.at/cafe-sonnenschein/  ← Kundenseite
https://demo.deine-domain.at/kaffeehaus-wolke/   ← zweite Seite mit derselben Vorlage
```

Ablauf: `git push` → Coolify bekommt einen Webhook → baut das Docker-Image (`build-all.js`
erzeugt alle Seiten inkl. WebP-Bildern) → tauscht den Container ohne Ausfallzeit aus.

## Einmalig einrichten

### 1. Git-Repository anlegen
Ein **privates** Repository bei GitHub, GitLab oder Gitea erstellen (leer, ohne README) und
den lokalen Stand hochladen:

```bash
git remote add origin git@github.com:<benutzer>/websites.git
git push -u origin main
```

### 2. DNS
Beim Domain-Anbieter einen A-Eintrag anlegen: `demo.deine-domain.at` → IP des Coolify-Servers.

### 3. Coolify-Ressource anlegen
1. **Projects → (Projekt) → + New → Resource**
2. Quelle wählen:
   - **GitHub:** „Private Repository (with GitHub App)“ – die GitHub App einmalig unter
     *Sources* einrichten. Webhooks für automatische Deploys werden dann selbst angelegt.
   - **GitLab/Gitea/andere:** „Private Repository (with Deploy Key)“ – den angezeigten
     öffentlichen Schlüssel im Repo als *Deploy Key* (nur lesen) eintragen.
3. Repository und Branch `main` auswählen.
4. **Build Pack:** `Dockerfile` (Dockerfile liegt im Wurzelverzeichnis).
5. **Ports Exposes:** `80`
6. **Domains:** `https://demo.deine-domain.at` – Coolify holt automatisch ein
   Let's-Encrypt-Zertifikat.
7. Optional unter **Environment Variables:** `BASIS_URL` = `https://demo.deine-domain.at`
   und „Build Variable“ anhaken. Dann bekommen alle Seiten korrekte Canonical- und
   Open-Graph-Links.
8. **Deploy** klicken.

### 4. Automatische Updates
- **GitHub App:** automatisch aktiv („Auto Deploy“ unter *General* ist standardmäßig an).
- **Deploy Key:** unter *Webhooks* die angezeigte URL samt Secret im Git-Anbieter als
  Push-Webhook eintragen.

Ab jetzt reicht `git push` – nach 1–3 Minuten ist alles live.

## Seiten im Browser anlegen und löschen

Beliebig viele Seiten können parallel laufen – auch mehrere auf derselben Vorlage
(z. B. `/cafe-sonnenschein/` und `/kaffeehaus-wolke/`). Jede Seite hat einen eigenen Ordner
`kunden/<pfad>/`, eigene Inhalte, eigene Fotos und einen eigenen Bild-Cache.

### Neue Seite
1. **GitHub → Actions → „Neue Seite anlegen“ → Run workflow** – Formular ausfüllen
   (Pfad, Vorlage, Name, Adresse, Land, Telefon, optional E-Mail, Inhaber, Google-Bewertung, Hub).
2. Der Workflow legt `kunden/<pfad>/` an, trägt die Seite in `sites.json` ein und öffnet einen
   **Pull Request** mit Checkliste. Die Prüf-Pipeline läuft automatisch.
3. Im Pull Request im Browser nachbessern: JSON-Datei bearbeiten (Stift-Symbol oder Taste `.`
   für den Web-Editor). **Eigene Fotos** nicht ins Repository, sondern in den Objektspeicher
   (siehe „Kundenfotos und Medien“ unten). Ein Foto mit gleichem Dateinamen wie in der Vorlage
   (z. B. `hero.jpg`) ersetzt das Vorlagenbild, alles andere kommt weiter aus der Vorlage.
   Erlaubt sind nur JPG, PNG und WebP.
4. **Merge** → nach der grünen Pipeline live unter `/<pfad>/`.

Bewusst entfernt werden beim Anlegen die **erfundenen Bewertungen und Team-Mitglieder** der
Vorlage – erfundene Bewertungen unter dem Namen eines echten Betriebs wären unzulässig.

### Seite löschen
**GitHub → Actions → „Seite löschen“ → Run workflow**, Pfad eingeben und zur Bestätigung noch
einmal eintippen → Pull Request → **Merge**. Die vier Beispielseiten der Vorlagen lassen sich so
nicht löschen.

### Einmalig einrichten
- **Settings → Actions → General → Workflow permissions:** „Allow GitHub Actions to create and
  approve pull requests“ anhaken.
- **Settings → Branches → Add branch ruleset** (oder „Branch protection rule“) für `main`:
  „Require a pull request before merging“ und „Require status checks to pass“ mit dem Check
  **„Build, Docker & Smoke-Test“**. Dann geht nichts mehr ungeprüft live.
- **Coolify-Previews** (falls aktiviert): nur für Pull Requests aus diesem Repository, nie für
  Forks – sonst würde fremder Code auf deinem Server gebaut.

### Lokal (optional)
```bash
PFAD=cafe-test VORLAGE=cafe NAME="Café Test" ADRESSE="Gasse 1, 1010 Wien" LAND=Österreich \
  TELEFON="01 1234567" node scripts/neue-seite.js
PFAD=cafe-test BESTAETIGUNG=cafe-test node scripts/seite-loeschen.js
```

## Kundenfotos und Medien (Objektspeicher)

Kundenfotos (`kunden/<pfad>/images/`) und Medien wie Showreels oder Hörproben
(`kunden/<pfad>/medien/`) kommen **nie ins Git-Repository** (Größe, Bildrechte – alles in `main`
geht live). Sie liegen in einem S3-kompatiblen Objektspeicher:

```
<bucket>/<pfad>/images/hero.jpg        →  kunden/<pfad>/images/hero.jpg  →  responsive AVIF/WebP
<bucket>/<pfad>/medien/showreel.mp4    →  kunden/<pfad>/medien/…         →  /<pfad>/medien/showreel.mp4
```

`build-all.js` gleicht vor dem Bauen automatisch ab, wenn `MEDIEN_ENDPUNKT` gesetzt ist (nur neue
oder geänderte Dateien werden geladen). Ohne Zugangsdaten werden Kundenseiten mit den Vorlagenbildern
bzw. Platzhaltern gebaut – der Build bricht nicht ab.

### Einmalig einrichten
1. **Speicher anlegen** – z. B. in Coolify als Dienst. Hinweis: MinIO veröffentlicht die freie
   Version seit 2025 nur noch als Quellcode (keine neuen Images/Binärdateien mehr). Gleichwertig und
   aktiv gepflegt: **Garage** oder **SeaweedFS** (selbst gehostet) oder **Hetzner Object Storage**.
   Der Code spricht reines S3 (Signatur V4, Pfad-Adressierung) und funktioniert mit allen.
2. **Erreichbarkeit:** Der S3-Endpunkt muss für den Build erreichbar sein – auf dem Coolify-Server
   (Deploy) und, damit die Pipeline Kundenseiten mit Fotos testet, für GitHub Actions. Am einfachsten
   eine eigene Subdomain mit HTTPS (z. B. `medien.seitenschwung.com`); S3 ist ohne Schlüssel nicht lesbar.
3. **Zwei Schlüssel anlegen:** einen **nur lesenden** für Builds und einen **schreibenden** zum Hochladen.
4. **Bucket anlegen:** `node scripts/medien.js bucket` (mit dem schreibenden Schlüssel).
5. **Build-Variablen** (nur lesender Schlüssel) in Coolify bei der Ressource unter *Environment
   Variables* als „Build Variable“ und in GitHub als Secrets:
   `MEDIEN_ENDPUNKT`, `MEDIEN_ZUGANG`, `MEDIEN_GEHEIMNIS` (optional `MEDIEN_BUCKET`, Standard
   `kunden-medien`). Sie gelten nur in der Build-Stufe des Dockerfiles; das ausgelieferte
   nginx-Image enthält sie nicht.

### Fotos hochladen
Fotos in `kunden/<pfad>/images/` (bzw. Medien in `kunden/<pfad>/medien/`) legen, dann **ein Befehl**:
```bash
export MEDIEN_ENDPUNKT=https://medien.seitenschwung.com MEDIEN_ZUGANG=… MEDIEN_GEHEIMNIS=…
node scripts/medien.js sync                     # neue/geänderte Dateien aller Kundenseiten hochladen + Pipeline starten
```
`sync` lädt nur Neues bzw. Geändertes hoch und startet danach die Pipeline „Prüfen & Deployen“ auf `main`
(baut mit den Fotos, testet, deployt nur bei Erfolg). Ist nichts neu, passiert nichts. Für den
Pipeline-Start braucht es ein GitHub-Token: angemeldetes `gh` (`gh auth login`) oder `GITHUB_TOKEN`
(Fine-grained Token nur für dieses Repository, Recht „Actions: Read and write“). Ohne Token werden die
Fotos trotzdem hochgeladen; die Pipeline dann manuell starten (Actions → Run workflow).
Gelöschte Fotos werden im Speicher nicht automatisch entfernt.

Einzelbefehle:
```bash
node scripts/medien.js sync nora-solcher        # nur dieser Kundenordner (kunden/nora-solcher/, gilt für v1 und v2)
node scripts/medien.js hochladen nora-solcher   # nur hochladen, ohne Pipeline-Start
node scripts/medien.js liste nora-solcher
node scripts/medien.js holen                    # Speicher → lokale Ordner (alle Kundenseiten)
``` Erlaubt: JPG, PNG, WebP (Fotos) sowie MP4, WebM, MP3, M4A, OGG/Opus, VTT, PDF (Medien).

## Inhalte pflegen ohne JSON (Pages CMS)

Kund:innen bearbeiten ihre Texte in Formularen auf **https://app.pagescms.org** statt in JSON.
Die Formulare stehen in `.pages.yml` (deutsche Feldnamen, Auswahllisten, Prüfung von Links und
E-Mail-Adressen). Jede gespeicherte Änderung ist ein Commit auf `main` → Pipeline prüft (Schema,
Smoke-Test) → Coolify deployt. Ist eine Eingabe fehlerhaft, bleibt die alte Seite online.

### Einmalig einrichten (Philipp)
1. Auf https://app.pagescms.org mit GitHub anmelden und die **Pages CMS GitHub App** für das
   Repository `sample_sites` installieren (nur dieses Repository auswählen).
2. Repository in Pages CMS öffnen – die Menüpunkte aus `.pages.yml` erscheinen links
   („Website Nora Solcher“ → Startseite, Über mich, Neuigkeiten, Vita …).
3. **Settings → Collaborators → Invite:** Nora per E-Mail einladen. Sie braucht **kein
   GitHub-Konto**; sie meldet sich per Link aus der E-Mail an und sieht nur die Formulare.

### Gut zu wissen
- **Fotos** werden nicht im CMS hochgeladen (Kundenfotos gehören nicht ins Repository). Neue Fotos
  per `node scripts/medien.js hochladen <pfad>` in den Speicher legen und den Dateinamen in
  `.pages.yml` bei den Foto-Auswahllisten ergänzen.
- Mit `settings.content.merge` bleiben Felder erhalten, die nicht im Formular stehen. **Listen werden
  beim Speichern aber vollständig ersetzt** – neue Felder in Listeneinträgen daher immer auch in
  `.pages.yml` aufnehmen (notfalls mit `hidden: true`), sonst gehen sie beim ersten Speichern verloren.
  Leere Felder entfernt Pages CMS beim Speichern; die Vorlagen kommen damit zurecht.
- Eingeladene Personen sehen alle Menüpunkte dieses Repositorys. Bei mehreren Kund:innen deshalb
  je Kunde ein eigenes Repository oder Pages CMS selbst hosten (Open Source, z. B. auf Coolify).
- Pages CMS ist ein externer Dienst: Beim Bearbeiten laufen die Inhalte über dessen Server.

## Sicherheit

- **Eingaben** aus den Formularen gehen nur als Umgebungsvariablen an die Skripte und werden dort
  bereinigt: Pfad nur `a-z0-9-` (sonst aus dem Namen gebildet), Spitzklammern/Steuerzeichen
  entfernt, ungültige PLZ/Telefon/E-Mail werden weggelassen und im Pull Request aufgelistet.
  Nur der Name ist Pflicht. Eingaben werden nie direkt in Shell-Befehle eingesetzt.
- **Inhalte:** Alle Texte werden HTML-maskiert, Roh-HTML im Impressum/Datenschutz ist
  abgeschaltet, Links nur `http(s)`, `mailto`, `tel`. SVG-Uploads werden ignoriert.
- **Server:** Content-Security-Policy (Skripte/Schriften/Bilder nur von dieser Domain),
  `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` auf **allen** Antworten
  (`hosting/nginx-sicherheit.conf`). Versteckte Dateien (`.git`, `.env`) liefern 404.
- Der **Smoke-Test** prüft das alles bei jedem Lauf mit (CSP-Verstöße, Header, interne Dateien).

## Gut zu wissen

- **Die Startseite `/` ist ein Hub** mit Karten zu den Beispielprojekten (erzeugt von
  `hub.js`). Gezeigt werden **nur Einträge mit `"hub"`-Block** in `sites.json` – Kunden-Demos
  ohne diesen Block erscheinen dort nicht. Ihre Pfade sind aber erratbar, für Demos daher
  ruhig etwas Eindeutiges wählen, z. B. `michis-angelshop-x7k2`.
- **Hub anpassen** über den Block `"hub"` oben in `sites.json`: `titel`, `untertitel`,
  `intro`, `kontakt_email` (zeigt einen Anfrage-Knopf) und `noindex` (Standard `true` =
  für Suchmaschinen gesperrt; auf `false` setzen, wenn der Hub bei Google erscheinen soll).
  Pro Seite: `hub.branche`, `hub.stil`, `hub.beschreibung`, `hub.merkmale`. Das Kartenbild
  ist automatisch das Hero-Bild der Seite.
- **robots.txt** wird automatisch erzeugt: Seiten mit `"demo_modus": true` sind für
  Suchmaschinen gesperrt (zusätzlich `noindex` im HTML).
- **Eigene Domain für einen Kunden** (z. B. `michis-angelshop.at`) ist später möglich:
  Domain zusätzlich in Coolify eintragen und in `hosting/nginx.conf` einen eigenen `server`-Block
  mit `root /usr/share/nginx/html/michis-angelshop;` ergänzen. Für Live-Kunden ist das die
  bessere Lösung als ein Unterverzeichnis.
- **Nicht im Repository:** `dist/`, `public/`, Bild-Caches, Vertriebsdaten in `vertrieb/`
  (`leads_*.csv`, `.lead_cache/`, `pitches/`) und `recherche/` (siehe `.gitignore`). Diese Daten bleiben nur lokal.
- **Build lokal wie auf dem Server testen** (mit Docker):
  `docker build -t websites . && docker run --rm -p 8080:80 websites`
  → http://localhost:8080/petri-pirsch/

## Automatische Pipeline (GitHub Actions)

`.github/workflows/pipeline.yml` läuft bei jedem Push und jedem Pull Request:

1. **Inhalte prüfen** – `tests/inhalte.js` prüft jede Inhaltsdatei gegen das Schema ihrer Vorlage
   (`vorlagen/<name>/schema.json` → `schemas/`) und nennt Fehler mit Pfad, z. B.
   „vita[0].eintraege[1].jahr: erwartet Text, gefunden Zahl“.
2. **Docker-Image bauen** – exakt wie auf dem Server (Dockerfile, `build-all.js`, nginx), inkl.
   Kundenfotos aus dem Objektspeicher, falls die `MEDIEN_*`-Secrets gesetzt sind.
3. **Container starten** und mit **`tests/smoke.js`** prüfen: Hub und alle Seiten inkl.
   Impressum/Datenschutz, mobil (360 px) und Desktop – Status 200, keine JavaScript-Fehler,
   keine fehlenden Dateien/Bilder, kein seitliches Scrollen, Hub-Links und Weiterleitung korrekt.
4. **Lighthouse** (`tests/lighthouse.js`, Mobil-Profil): Leistung ≥ 80, Barrierefreiheit ≥ 90,
   Best Practices ≥ 90 je Seite; SEO wird nur angezeigt (Demo-Seiten sind absichtlich „noindex“).
   Bei Unterschreitung nennt der Test die größten Bremsen; die HTML-Berichte liegen 14 Tage als
   Artefakt „lighthouse-berichte“ beim Lauf.
5. **Nur auf `main` und nur wenn alles grün ist:** Coolify-Deploy per Webhook auslösen.

Bei Pull Requests wird nur geprüft, nicht deployt. Die fertig gebauten Seiten liegen 7 Tage als
Artefakt „website-build“ beim Lauf.

### Einrichten (einmalig)
1. **Coolify → Keys & Tokens → API tokens:** Token mit Recht **deploy** erstellen, kopieren.
2. **Coolify → Ressource → Webhooks:** die **Deploy Webhook**-URL kopieren
   (Form: `https://coolify.seitenschwung.com/api/v1/deploy?uuid=…&force=false`).
3. **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret:**
   - `COOLIFY_WEBHOOK` = URL aus Schritt 2
   - `COOLIFY_TOKEN` = Token aus Schritt 1
4. **Coolify → Ressource → Advanced:** **Auto Deploy ausschalten** – sonst deployt Coolify
   zusätzlich ungeprüft bei jedem Push.

Fehlen die Secrets, läuft nur die Prüfung (mit Warnung), es wird nichts deployt.

### Coolify nur im Tailnet (nicht öffentlich erreichbar)
Der GitHub-Runner tritt für den Deploy kurz als kurzlebiges Gerät (`tag:ci`) dem Tailnet bei,
ruft den Webhook auf und verschwindet danach automatisch.
1. **Tailscale-Admin → Access controls:** Tag anlegen und `tag:ci` **nur** den Coolify-Port erlauben
   (Server-IP/Port anpassen; die erste Regel erhält deinen eigenen Vollzugriff):
   ```json
   "tagOwners": { "tag:ci": ["autogroup:admin"] },
   "grants": [
     { "src": ["autogroup:member"], "dst": ["*"], "ip": ["*"] },
     { "src": ["tag:ci"], "dst": ["100.x.y.z"], "ip": ["tcp:8000"] }
   ]
   ```
   Steht dort noch die Standardregel „alles für alle“ (`"src": ["*"]`), diese ersetzen – sonst
   kommt der Runner an alle Geräte im Tailnet.
2. **Tailscale-Admin → Settings → OAuth clients → Generate:** Recht **Devices → Core: Write**
   (Auth Keys: Write), Tag `tag:ci`. Client-ID und Secret kopieren.
3. **GitHub-Secrets:** `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`.
4. **`COOLIFY_WEBHOOK`** mit der Tailnet-Adresse, unter der du Coolify im Browser öffnest,
   z. B. `http://100.x.y.z:8000/api/v1/deploy?uuid=…&force=false`.

### Smoke-Test lokal oder gegen die Live-Seite
```bash
npm install --no-save playwright && npx playwright install chromium
node tests/smoke.js https://sample.seitenschwung.com
```
