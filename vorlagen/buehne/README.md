# Bühnen-Vorlage

Künstlerisches Portfolio für Schauspieler:innen und Sprecher:innen – die Website als Theaterabend.
Erste Kundin: Nora Solcher – ihre erste Fassung läuft eingefroren unter `/nora-solcher/v1/` (`kunden/nora-solcher/v1.json`, auch Branch `nora-buehne-archiv`); gepflegt wird `/nora-solcher/v2/` mit `vorlagen/repertoire`.

Gleiches Datenformat wie die nüchterne `vorlagen/schauspiel` – in `sites.json` lässt sich die Vorlage
tauschen, ohne die Inhalte anzufassen. Zusätzliche, optionale Felder steuern die Inszenierung.

## Dramaturgie

| Szene | Gestaltung | Daten |
|---|---|---|
| **Ouvertüre** | schwarze Bühne, Scheinwerfer folgt der Maus (auf dem Handy wandert er), Porträts im Torbogen wechseln mit den Rollen, Name riesig darübergeblendet | `name`, `berufe`, `hero_rollen` (`verb`, `rolle`, `werk`, `bild`) |
| **Prolog** | Programmheft-Papier: Leitsatz, Porträt im Bogen, Text zweispaltig mit Initiale, Pressezitat, „Applaus“ (Preise), „Zuletzt“ | `prolog`, `ueber_mich`, `ueber_mich_bild`, `zitat`, `auszeichnungen`, `aktuell` |
| **Eigenschaften** | Besetzungszettel (gezackter Rand, schräg) + Laufbänder je Gruppe | `steckbrief`, `register` (`gruppe`, `werte`) |
| **Akte** | je Vita-Bereich ein Akt mit eigener Bildsprache (`vita[].akt.stil`): | `vita[].akt` (`nr`, `titel`, `stil`, `intro`, `gehoert_zu`) |
| – `buehne` | Spielplan im Scheinwerferlicht, drehender Stempel bei `auszeichnung` | |
| – `kamera` | Filmklappen (Produktion, Rolle, Regie, Sender, Jahr) | |
| – `stimme` | Audiowelle, Figuren-Register (automatisch aus den Rollen), Trackliste | |
| – `feder` | Manuskriptseite mit Schreibmaschinenschrift | |
| **Gesichter** | Kontaktbogen mit Bildnummern und Rotstift-Kreisen, Lightbox | `galerie` (`datei`, `alt`, `credit`, `markiert`) |
| **Sehen & Hören** | Eintrittskarten mit Abriss | `medien` |
| **Kontakt** | „Besetzung anfragen“, Agentur, Profile – darunter ein Theatervorhang | `kontakt`, `profile` |

Navigation: Knopf „Programm“ öffnet ein Programmheft-Inhaltsverzeichnis. Ohne JavaScript ist alles
sichtbar (Menü steht oben, erste Rolle steht fest). Bei „Bewegung reduzieren“ stehen Laufbänder,
Welle, Stempel und Rollenwechsel still.

Videos und Hörproben sind bewusst **verlinkt, nicht eingebettet** – keine Daten an Dritte, kein
Cookie-Banner, die Content-Security-Policy bleibt „nur eigene Domain“.

## Bauen

```bash
node build-all.js nora-solcher/v1
```

Einzeln: `node vorlagen/buehne/build.js kunden/nora-solcher/v1.json` (Fotos aus `images/`
neben der JSON-Datei, Ausgabe in `vorlagen/buehne/dist/`). Fehlende Fotonachweise (`credit`) und
Bilder unter 1000 px werden beim Bauen gemeldet.

Schriften (SIL Open Font License, siehe `fonts/`): Instrument Serif, JetBrains Mono, Manrope.
