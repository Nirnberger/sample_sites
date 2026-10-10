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
   für den Web-Editor), **eigene Fotos** nach `kunden/<pfad>/images/` hochladen
   („Add file → Upload files“). Ein Foto mit gleichem Dateinamen wie in der Vorlage
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

## Sicherheit

- **Eingaben** aus den Formularen gehen nur als Umgebungsvariablen an die Skripte und werden dort
  streng geprüft (Pfad nur `a-z0-9-`, keine Spitzklammern/Steuerzeichen, Formate für PLZ,
  Telefon, E-Mail). Sie werden nie direkt in Shell-Befehle eingesetzt.
- **Inhalte:** Alle Texte werden HTML-maskiert, Roh-HTML im Impressum/Datenschutz ist
  abgeschaltet, Links nur `http(s)`, `mailto`, `tel`. SVG-Uploads werden ignoriert.
- **Server:** Content-Security-Policy (Skripte/Schriften/Bilder nur von dieser Domain),
  `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` auf **allen** Antworten
  (`nginx-sicherheit.conf`). Versteckte Dateien (`.git`, `.env`) liefern 404.
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
  Domain zusätzlich in Coolify eintragen und in `nginx.conf` einen eigenen `server`-Block
  mit `root /usr/share/nginx/html/michis-angelshop;` ergänzen. Für Live-Kunden ist das die
  bessere Lösung als ein Unterverzeichnis.
- **Nicht im Repository:** `dist/`, `public/`, Bild-Caches, `leads_*.csv`, `.lead_cache/`
  und `pitches/` (siehe `.gitignore`). Vertriebsdaten bleiben nur lokal.
- **Build lokal wie auf dem Server testen** (mit Docker):
  `docker build -t websites . && docker run --rm -p 8080:80 websites`
  → http://localhost:8080/petri-pirsch/

## Automatische Pipeline (GitHub Actions)

`.github/workflows/pipeline.yml` läuft bei jedem Push und jedem Pull Request:

1. **Docker-Image bauen** – exakt wie auf dem Server (Dockerfile, `build-all.js`, nginx).
2. **Container starten** und mit **`tests/smoke.js`** prüfen: Hub und alle Seiten inkl.
   Impressum/Datenschutz, mobil (360 px) und Desktop – Status 200, keine JavaScript-Fehler,
   keine fehlenden Dateien/Bilder, kein seitliches Scrollen, Hub-Links und Weiterleitung korrekt.
3. **Nur auf `main` und nur wenn alles grün ist:** Coolify-Deploy per Webhook auslösen.

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

### Smoke-Test lokal oder gegen die Live-Seite
```bash
npm install --no-save playwright && npx playwright install chromium
node tests/smoke.js https://sample.seitenschwung.com
```
