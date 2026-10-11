# Salon-Vorlage „elegant & modern“

Wiederverwendbare Website-Vorlage für Friseursalons in Deutschland und Österreich.
Alle Inhalte stehen in **einer** Datei (`salon.json`), das Build-Skript erzeugt daraus eine
fertige, statische Website in `dist/`: reines HTML/CSS, etwa 5 KB JavaScript, keine Cookies,
kein Tracking, **keine externen Requests** (also kein Cookie-Banner nötig).

## Voraussetzungen

- **Node.js 18 oder neuer**, ohne npm-Pakete
- **cwebp** (empfohlen), damit die Bilder automatisch in mehreren Größen als WebP erzeugt werden:
  - Ubuntu/Debian: `sudo apt-get install webp`
  - macOS: `brew install webp`
  - Windows: [libwebp herunterladen](https://developers.google.com/speed/webp/download), den `bin`-Ordner zum PATH hinzufügen

  Ohne cwebp funktioniert der Build trotzdem. Die Bilder werden dann aber unverändert kopiert
  (keine Größenvarianten, schlechtere Ladezeit). Das Skript weist darauf hin.

## Neuen Salon anlegen in 5 Schritten

1. **Ordner kopieren:** Kopiere den ganzen Ordner `vorlagen/salon/`, zum Beispiel als `vorlagen/salon-mueller/`.
2. **Bilder austauschen:** Lege die Fotos des Salons in `images/` (JPG, PNG oder WebP, gern in voller Größe).
   Nicht mehr benötigte Beispielbilder kannst du löschen.
3. **`salon.json` ausfüllen:** Name, Kontakt, Öffnungszeiten, Preise, Team, Bewertungen, Bilddateinamen,
   Impressum und Datenschutz. Für eine Demo `"demo_modus": true` setzen.
4. **Bauen:** `node build.js` (oder `npm run build`)
5. **Prüfen und hochladen:** `dist/index.html` im Browser öffnen. Dann den **Inhalt** von `dist/`
   auf den Webspace laden (siehe unten).

Das Skript meldet am Ende Hinweise, zum Beispiel fehlende Bilder, nicht erkannte Öffnungszeiten
oder ein leeres Impressum. Diese Hinweise vor dem Livegang abarbeiten.

Du kannst auch mehrere Salons in einem Ordner pflegen: `node build.js salons/mueller.json`.
Bilder werden aber immer aus `images/` gelesen.

## Build ausführen

```bash
node build.js
```

Der erste Build dauert ein paar Sekunden, weil alle Bildgrößen erzeugt werden. Danach liegen
die Bilder in `.bildcache/` und der Build ist fast sofort fertig. `dist/` wird bei jedem Build
komplett neu geschrieben, dort also nichts von Hand ändern.

Ergebnis in `dist/`:

```
dist/
├── index.html          Onepager (alle Inhalte direkt im HTML, CSS inline)
├── impressum.html
├── datenschutz.html
├── img/                WebP in 480, 800, 1200, 1600, 2000 px Breite
├── fonts/              Cormorant Garamond + Manrope (WOFF2, lokal)
├── js/main.js          Menü, Tabs, Lightbox, „Heute geöffnet“, Einblenden
├── favicon.svg         wird aus Initial + Akzentfarbe erzeugt
├── robots.txt          im Demo-Modus: alles gesperrt
└── sitemap.xml         nur live und mit website_url
```

## `dist/` hochladen

Die Website ist rein statisch und läuft auf jedem Webspace (Strato, IONOS, all-inkl, World4You, Netlify …):

- **FTP/SFTP:** Den *Inhalt* von `dist/` in das Hauptverzeichnis der Domain hochladen,
  sodass `index.html` direkt im Wurzelordner liegt.
- **Netlify / Cloudflare Pages:** Den Ordner `dist/` per Drag & Drop hochladen.
- Für eine Demo reicht auch eine Subdomain oder ein Unterordner (alle Pfade sind relativ).

**Vor dem Livegang:**
- `"demo_modus": false` setzen. Dann verschwinden der Demo-Streifen und das `noindex`.
- `"website_url": "https://www.salon-domain.de"` eintragen (für Canonical-Link, Open-Graph-Bild und Sitemap).
- Echte Fotos statt Stockfotos verwenden (siehe unten), Impressum und Datenschutz prüfen lassen.
- Neu bauen und hochladen.

## Felder in `salon.json`

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `demo_modus` | | `true` = Streifen „Entwurf für …“ + `noindex`. `false` = live |
| `ersteller` | | Dein Name für den Demo-Streifen |
| `website_url` | live | z. B. `https://www.atelier-haarwerk.de` (ohne `/` am Ende) |
| `name` | ✔ | Salonname, erscheint auch als Schriftzug, wenn kein Logo da ist |
| `branche` | | Standard `Friseur`. Ergibt z. B. „Friseur in Kiel“ (oder `Barbershop`, `Friseursalon` …) |
| `slogan`, `kurzbeschreibung` | | Hero-Text. Die Kurzbeschreibung ist gleichzeitig die Meta-Description (max. 160 Zeichen) |
| `logo` | | Dateiname in `images/` (SVG ideal), leer = Name als Schriftzug |
| `farben.akzent` | | Hex-Farbe, Standard `#B08D57` (Bronze) |
| `farben.akzent_dunkel` | | optional. Wenn leer, wird sie automatisch so abgedunkelt, dass der Kontrast den Barrierefreiheits-Vorgaben entspricht |
| `kontakt.telefon` | ✔ | z. B. `0431 123 45 67`. Wird automatisch zu `tel:+49431…` (bzw. `+43` für Österreich) |
| `kontakt.email`, `kontakt.whatsapp` | | optional. Für WhatsApp die Handynummer eintragen |
| `kontakt.adresse` | ✔ | `strasse`, `plz`, `ort`, `land` (`Deutschland`, `Österreich` oder `Schweiz`) |
| `buchung_url` | | Treatwell/Booksy/Planity/Shore-Link. **Leer = alle Buchungs-Buttons werden zu „Jetzt anrufen“** |
| `oeffnungszeiten` | | Liste mit `tag` + `zeiten`. Erlaubt: `"09:00–18:00"`, `"9-18 Uhr"`, `"09:00–13:00, 14:00–18:00"`, `"geschlossen"` |
| `leistungen` | | Kategorien (`kategorie`) mit `eintraege`: `name`, `preis` (Text, z. B. `"ab 45 €"`), optional `beschreibung`, `dauer` |
| `preis_hinweis` | | Text unter der Preisliste. Fehlt das Feld, erscheint ein Standardtext. `""` blendet ihn aus |
| `hero_bild`, `ueber_uns_bild` | | `{ "datei": "…", "alt": "…" }`, optional `"fokus": "center 30%"` für den Bildausschnitt |
| `ueber_uns_titel`, `ueber_uns_text`, `ueber_uns_punkte` | | Absätze mit Leerzeile (`\n\n`) trennen. Punkte = kurze Liste |
| `team` | | `name`, `rolle`, `text`, `foto` (optional, sonst elegante Initialen-Kachel) |
| `google_bewertung`, `google_anzahl`, `google_link` | | z. B. `4.9`, `127`, Link zum Google-Profil |
| `bewertungen` | | 3–6 Einträge: `autor`, `sterne`, `text` |
| `galerie` | | Liste `{ "datei", "alt" }`. Antippen öffnet die Lightbox |
| `social.instagram`, `social.facebook` | | volle URLs, leer = kein Icon |
| `bildnachweise` | | Für jedes Unsplash-Foto: `datei`, `fotograf`, `unsplash_link` |
| `impressum`, `datenschutz` | ✔ live | Markdown (`## Überschrift`, `**fett**`, `[Link](https://…)`, `- Liste`) oder HTML |
| `anfahrt_hinweis` | | z. B. „Parkplätze im Hof · Bus 41, Haltestelle Knooper Weg“ |
| `kontakt_titel`, `leistungen_titel`, `team_titel`, `galerie_titel`, `preisspanne` | | optionale Feinheiten (Überschriften bzw. `"€€"` für die strukturierten Daten) |

**Fehlende Inhalte werden automatisch ausgeblendet:** Wenn `team`, `galerie`, `bewertungen`,
`leistungen` oder der Über-uns-Text fehlt, verschwindet die ganze Sektion samt Menüpunkt.
Hell und getönt hinterlegte Sektionen wechseln sich trotzdem immer ab.
Fehlt eine Bilddatei, zeigt die Seite eine neutrale Fläche mit dem Hinweis „Foto folgt“.

## Bilder

- **Formate:** JPG, PNG, WebP (SVG fürs Logo). Am besten in voller Kameraauflösung ablegen,
  das Skript verkleinert selbst auf höchstens 2000 px.
- **Empfohlene Motive:** Hero hochkant oder quadratisch (wird im Bogenrahmen 4:5 angezeigt),
  Über uns 4:5, Galerie 4:5, Teamfotos 3:4.
- Liegt das Hauptmotiv nicht in der Mitte, hilft `"fokus": "center 25%"` (CSS `object-position`).
- **Ohne cwebp** kannst du Bilder vorher selbst verkleinern und als WebP speichern, z. B. mit
  [squoosh.app](https://squoosh.app) (läuft im Browser): Breite ca. 1600 px, Qualität ca. 75.

### Unsplash-Fotos und eigene Fotos

Die Beispieldaten nutzen lokal gespeicherte Fotos von Unsplash (kein Hotlinking). Jedes Foto steht in
`bildnachweise`, und die Seite zeigt automatisch einen dezenten Nachweis im Footer
(„Fotos: Name / Unsplash“) und eine Liste im Impressum. Fotos ohne Eintrag in `bildnachweise`
gelten als eigene Fotos des Salons und bekommen keinen Nachweis.

**Unsplash-Bild durch ein eigenes Foto ersetzen:**
1. Eigenes Foto in `images/` legen, z. B. `salon-innen.jpg`.
2. In `salon.json` beim betreffenden Bild `"datei"` auf `salon-innen.jpg` ändern und den `alt`-Text anpassen.
3. Den passenden Eintrag aus `bildnachweise` löschen. Wird ein Foto nicht mehr verwendet,
   erscheint es ohnehin nicht mehr im Nachweis.
4. `node build.js`

**Neues Unsplash-Foto hinzufügen:** Foto auf unsplash.com herunterladen und in `images/` speichern.
Dann in `bildnachweise` Datei, Fotograf und Link zur Fotoseite eintragen. Passende Suchbegriffe:
„hair salon interior“, „hairdresser at work“, „hair styling“, „salon chair“, „hair care products“.
Gut passen helle Bilder mit natürlichem Licht und warmen Tönen, ohne gestellte Posen.

**Regeln, die das Skript durchsetzt bzw. die du beachten solltest:**
- **Im Team-Bereich niemals Stockfotos.** Steht ein Teamfoto in `bildnachweise`, lehnt das Skript
  es ab und zeigt die Initialen-Kachel.
- Stockfotos dürfen nicht so wirken, als zeigten sie den echten Salon oder echte Mitarbeiter.
  Im Demo-Modus steht unter der Galerie deshalb automatisch der Hinweis „Beispielfotos …“, solange
  dort Unsplash-Bilder sind. Für den Livegang die Galerie möglichst mit echten Salonfotos füllen.

## Bewertungen: nur echte

Für echte Salons nur **echte Bewertungen** verwenden (z. B. wörtlich aus dem Google-Profil,
Vorname + Initial). Erfundene Bewertungen sind in Deutschland und Österreich wettbewerbswidrig.
Die Bewertungen im Beispiel „Atelier Haarwerk“ sind fiktiv, ebenso wie der ganze Salon.
Telefonnummern und E-Mail im Beispiel sind absichtlich ungültig.

## Impressum und Datenschutz

Die Texte im Beispiel sind **Muster ohne Gewähr, keine Rechtsberatung**. Für Deutschland gilt
§ 5 DDG, für Österreich § 5 ECG und § 25 MedienG (andere Pflichtangaben, z. B. Firmenbuch,
Gewerbebehörde, Kammer, Offenlegung). Die zuständige Datenschutz-Aufsichtsbehörde hängt vom
Bundesland ab, in Österreich ist es die Datenschutzbehörde (DSB). Lass die Texte für den
Livegang vom Salon bzw. einem Generator wie e-recht24 oder der WKO erstellen und prüfen.

## Datenschutz-Technik (warum kein Cookie-Banner nötig ist)

- Schriften liegen lokal in `fonts/`, keine Google-Fonts-Einbindung.
- Keine eingebettete Google-Karte. Der Button „Route planen“ ist ein normaler Link zu Google Maps.
- Kein Analytics, keine Cookies, kein `localStorage`.
- Buchung, WhatsApp und Instagram sind reine Links. Daten fließen erst nach einem Klick.

## Qualität (gemessen mit Lighthouse 12, live gebaut)

| Seite | Performance | Barrierefreiheit | Best Practices | SEO |
|---|---|---|---|---|
| Startseite mobil | 99 | 100 | 100 | 100 |
| Startseite Desktop | 100 | 100 | 100 | 100 |
| Impressum / Datenschutz mobil | 100 | 100 | 100 | 100 |

Im **Demo-Modus** fällt der SEO-Wert absichtlich ab, weil die Seite per `noindex` für
Suchmaschinen gesperrt ist.

Außerdem umgesetzt: getestet ab 360 px Breite ohne horizontales Scrollen, mit Tastatur bedienbar
(Skip-Link, sichtbarer Fokus, Tabs mit Pfeiltasten, Lightbox mit Esc/Pfeiltasten), `prefers-reduced-motion`
wird respektiert, strukturierte Daten als schema.org `HairSalon` (Adresse, Öffnungszeiten,
Bewertung, Telefon) sowie Open-Graph-Tags. Alles wird aus `salon.json` erzeugt.

## Projektstruktur

```
vorlagen/salon/
├── salon.json               Inhalte des Salons (das Einzige, was pro Salon geändert wird)
├── images/                  Fotos des Salons bzw. Beispielfotos
├── build.js                 Build-Skript (Node, ohne Abhängigkeiten)
├── src/
│   ├── templates/
│   │   ├── seite.js         Gerüst: <head>, Kopfzeile, Fußzeile, Demo-Streifen
│   │   ├── abschnitte.js    Hero, Leistungen, Über uns, Team, Galerie, Bewertungen, Zeiten, Kontakt
│   │   └── icons.js         Linien-Icons (SVG)
│   ├── lib/helfer.js        Markdown, Farbkontrast, Bildgrößen, Telefon, Öffnungszeiten
│   ├── css/style.css        gesamtes Design (wird inline ins HTML geschrieben)
│   └── js/main.js           das bisschen JavaScript
├── fonts/                   WOFF2 + Lizenzen (SIL Open Font License)
├── .bildcache/              automatisch erzeugt, kann jederzeit gelöscht werden
└── dist/                    Ergebnis (wird bei jedem Build neu erzeugt)
```

Design-Anpassungen für alle Salons (Abstände, Schriftgrößen, Farben) erfolgen in
`src/css/style.css`. Grundfarben stehen oben unter `:root`.
