# Bühnen-Vorlage

Künstlerisches Portfolio für Schauspieler:innen und Sprecher:innen – die Website als Theaterabend.
Erste Kundin: Nora Solcher – ihre erste Fassung läuft eingefroren unter `/nora-solcher/v1/` (`kunden/nora-solcher/v1.json`, auch Branch `nora-buehne-archiv`); gepflegt wird `/nora-solcher/v2/` mit `vorlagen/repertoire`.

Gleiches Datenformat wie die nüchterne `vorlagen/schauspiel` – in `sites.json` lässt sich die Vorlage
tauschen, ohne die Inhalte anzufassen. Zusätzliche, optionale Felder steuern die Inszenierung.

## Dramaturgie

| Szene | Gestaltung | Daten |
|---|---|---|
| **Ouvertüre** | schwarze Bühne, zwei Scheinwerfer (groß + klein) folgen der Maus; ruht sie 2,5 s (oder auf dem Handy), schwingen beide suchend hin und her, Porträts im Torbogen wechseln mit den Rollen, Name riesig darübergeblendet | `name`, `berufe`, `hero_rollen` (`verb`, `rolle`, `werk`, `bild`) |
| **Zuletzt** | direkt unter der Ouvertüre: neuestes Projekt groß (mit Foto), die übrigen klein daneben | `aktuell` (erster Eintrag = neuestes, `bild` optional) |
| **Prolog** | Programmheft-Papier: Leitsatz, Porträt im Bogen, Text zweispaltig mit Initiale, Pressezitat, „Applaus“ (Preise) | `prolog`, `ueber_mich`, `ueber_mich_bild`, `zitat`, `auszeichnungen` |
| **Eigenschaften** | Besetzungszettel (gezackter Rand, schräg) + Laufbänder je Gruppe | `steckbrief`, `register` (`gruppe`, `werte`) |
| **Akte** | je Vita-Bereich ein Akt mit eigener Bildsprache (`vita[].akt.stil`): | `vita[].akt` (`nr`, `titel`, `stil`, `intro`, `gehoert_zu`) |
| – `buehne` | Spielplan im Scheinwerferlicht, drehender Stempel bei `auszeichnung` | |
| – `kamera` | schlichte Karten: Sender, Jahr, Titel, Rolle, Regie | |
| – `stimme` | Audiowelle, Figuren-Register (automatisch aus den Rollen), Trackliste | |
| – `feder` | Manuskriptseite mit Schreibmaschinenschrift | |
| – `unterricht` | Angebote (nummeriert) + Erfolgshinweis, darunter Referenzen und Zitat nebeneinander | `akt.angebote`, `akt.hervorhebung`, `akt.zitat` |
| **Gesichter** | Kontaktbogen mit Bildnummern, Lightbox; Rotstift-Kreis nur bei `markiert: true` | `galerie` (`datei`, `alt`, `credit`, `markiert`) |
| **Sehen & Hören** | Eintrittskarten mit Abriss | `medien` |
| **Kontakt** | „Kontakt aufnehmen“, Agentur, Profile – darunter ein Theatervorhang | `kontakt`, `profile` |

Navigation: schmale, feste Reiterleiste oben mit den Akten und Kontakt (immer sichtbar, auf dem Handy
waagrecht wischbar, der sichtbare Abschnitt ist markiert). Ohne JavaScript ist alles sichtbar (erste Rolle steht fest). Bei „Bewegung reduzieren“ stehen Laufbänder,
Welle, Stempel und Rollenwechsel still.

Videos und Hörproben sind bewusst **verlinkt, nicht eingebettet** – keine Daten an Dritte, kein
Cookie-Banner, die Content-Security-Policy bleibt „nur eigene Domain“.

## Farbschema (coolors.co)

Optionales Feld `farbschema`: eine Palette von [coolors.co](https://coolors.co) in einem beliebigen
Export-Format einfügen – CSV, „With #“, Array, Object, Extended Array, XML oder einfach der Link
(`https://coolors.co/8c0902-e0c58f-f5f0e9-210100`). Die Reihenfolge ist egal:
dunkelste Farbe = Bühne, hellste = Programmheft-Papier, kräftigste = Vorhang (ersetzt `farben.akzent`),
übrige = Kontaktbogen-Beschriftung und Manuskript-Marker.
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
node build-all.js nora-solcher/v1
```

Einzeln: `node vorlagen/buehne/build.js kunden/nora-solcher/v1.json` (Fotos aus `images/`
neben der JSON-Datei, Ausgabe in `vorlagen/buehne/dist/`). Fehlende Fotonachweise (`credit`) und
Bilder unter 1000 px werden beim Bauen gemeldet.

Schriften (SIL Open Font License, siehe `fonts/`): Instrument Serif, JetBrains Mono, Manrope.
