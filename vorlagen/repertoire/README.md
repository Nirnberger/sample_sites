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

## Bauen

```bash
node build-all.js nora-solcher/v2
```

Einzeln: `node vorlagen/repertoire/build.js kunden/nora-solcher/schauspiel.json` (Ausgabe in
`vorlagen/repertoire/dist/`). Schema: `schemas/repertoire.schema.json`.
