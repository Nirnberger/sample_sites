# Repertoire-Vorlage

Ruhiges, mehrseitiges Portfolio für Künstler:innen mit mehreren Arbeitsfeldern (Schauspiel, Film,
Audio, Text, Unterricht …). Hell und gedeckt: Creme/Beige, Braun, Pastell-Mint; Fraunces + Manrope.
Erste Kundin: Nora Solcher (`kunden/nora-solcher/schauspiel.json`, unter `/nora-solcher/v2/`).

## Seiten

| Datei | Inhalt | Daten |
|---|---|---|
| `index.html` | Einstieg mit Foto, Neuigkeiten, Kacheln zu allen Bereichen, Biografie mit Zitat und Auszeichnungen, Fotogalerie | `hero_*`, `aktuell`, `bereiche`, `ueber_mich*`, `zitat`, `auszeichnungen`, `galerie` |
| `<id>.html` je Bereich | Kopf mit Einleitung und Foto, Listen der Arbeiten, optional Angebote, Zitat, Medien-Links, Szenenfotos | `bereiche[]` |
| `kontakt.html` | Management, Anliegen-Karten mit passendem E-Mail-Weg, Casting-Angaben, Profile | `kontakt`, `steckbrief`, `profile` |
| `impressum.html`, `datenschutz.html` | Markdown; Bildnachweise automatisch | `impressum`, `datenschutz` |

Das Menü zeigt alle Bereiche in ihrer Reihenfolge aus `bereiche` und steht immer sichtbar oben
(auf dem Handy als waagerechte Leiste unter dem Namen), daneben der Knopf „Kontakt“.

## Bereiche

`bereiche[]`: `id` (wird zu `<id>.html`), `titel` (Menü), `untertitel`, `teaser` (Startseite),
`intro`, `bild`, `gruppen[]`, optional `hinweis`, `angebote_titel`, `angebote[]`, `hervorhebung`,
`zitat`, `fotos[]`, `medien[]`.

Jede Gruppe hat `titel`, `darstellung` und `eintraege` (`jahr`, `titel`, `rolle`, `regie`, `ort`,
`text`, `auszeichnung`):
- `liste` – tabellarisch: Jahr | Titel + Rolle | Regie + Ort
- `projekte` – große Karten mit allen Eckdaten, zusätzlich `art`, `rollentyp`, `ausstrahlung`
  (gedacht für Film/Fernsehen, wo es auf wenige, klar erkennbare Produktionen ankommt)

Anliegen auf der Kontaktseite (`kontakt.anliegen[]`): `weg` = `agentur` oder `direkt`
(`kontakt.email_direkt`; solange leer, gehen alle Anfragen an das Management – der Build warnt).

Videos und Hörproben sind **verlinkt, nicht eingebettet** (keine Daten an Dritte, CSP „nur eigene Domain“).
Kaum JavaScript: nur Lightbox für Fotos; keine Animationen.

## Farbschema (coolors.co)

Optionales Feld `farbschema`: eine Palette von [coolors.co](https://coolors.co) in einem beliebigen
Export-Format einfügen – CSV, „With #“, Array, Object, Extended Array, XML oder einfach der Link
(`https://coolors.co/8c0902-e0c58f-f5f0e9-210100`). Die Reihenfolge ist egal:
hellste Farbe = Hintergrund, dunkelste = Schrift und Fuß, kräftigste = Akzent (Überschriften-Kicker,
Links, Hover), übrige hellste = Flächen (Zitat, Marken, Kontakt-Band).
Text- und Akzentfarben werden automatisch nachgedunkelt bzw. aufgehellt, bis der Kontrast reicht
(WCAG AA). Leer = Standardfarben. Code: `lib/farbschema.js` (läuft beim Bauen und im Browser).

**Farb-Labor:** Seite mit `#farben` am Ende der Adresse öffnen (z. B. `…/nora-solcher/v2/#farben`) –
Palette einfügen, „Anwenden“, die ganze Seite zeigt sofort die Farben. Reine Vorschau in diesem
Browser-Tab: nichts wird gesendet oder gespeichert, Besucher ohne `#farben` laden das Skript gar nicht.
„Vorschau-Link kopieren“ erzeugt `…#farben=8c0902-e0c58f-…` zum Weitergeben. Dauerhaft wird ein
Schema nur über das CMS gesetzt (Anmeldung über GitHub, Pipeline prüft vor dem Deploy). Sicherheit:
aus der Eingabe werden nur Hex-Werte übernommen, die Oberfläche entsteht ohne `innerHTML`/`eval`,
die Content-Security-Policy bleibt unverändert.

## Bauen

```bash
node build-all.js nora-solcher/v2
```

Einzeln: `node vorlagen/repertoire/build.js kunden/nora-solcher/schauspiel.json` (Ausgabe in
`vorlagen/repertoire/dist/`). Schema: `schemas/repertoire.schema.json`.
