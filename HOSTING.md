# Hosting auf Coolify – alle Seiten unter einer Domain

Alle Seiten aus `sites.json` laufen in **einem** Container unter einer Domain, jede in ihrem
eigenen Unterverzeichnis:

```
https://demo.deine-domain.at/                    ← Hub mit den Beispielprojekten
https://demo.deine-domain.at/petri-pirsch/
https://demo.deine-domain.at/kante-klinge/
https://demo.deine-domain.at/michis-angelshop/   ← neue Kundenseite
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

## Neue Kundenseite hinzufügen

```bash
mkdir -p kunden/michis-angelshop/images
cp angel-jagd-vorlage/shop.json kunden/michis-angelshop/shop.json
# Inhalte anpassen, Fotos nach kunden/michis-angelshop/images/
```

In `sites.json` eintragen:

```json
{ "pfad": "michis-angelshop", "vorlage": "angel-jagd-vorlage",
  "daten": "kunden/michis-angelshop/shop.json", "bilder": "kunden/michis-angelshop/images" }
```

Lokal prüfen und hochladen:

```bash
node build-all.js michis-angelshop     # baut nur diese Seite nach public/michis-angelshop/
git add kunden/michis-angelshop sites.json
git commit -m "Demo für Michi's Angelshop"
git push
```

Eine Seite entfernen: Eintrag aus `sites.json` löschen und pushen.

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
