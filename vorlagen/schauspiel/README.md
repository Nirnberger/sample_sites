# Schauspiel-Vorlage

Portfolio-Website für Schauspieler:innen und Sprecher:innen – ruhig, editorial, fotozentriert.
Erste Kundin: Nora Solcher (`kunden/nora-solcher/`, live unter `/nora-solcher/`).

## Aufbau

- **Hero:** Vollbild-Foto, Name, Berufe, Knöpfe „Showreel ansehen“ (erstes Video aus `medien`) und „Kontakt“
- **Aktuell:** Karten mit Neuigkeiten (erste Karte groß, optional mit Bild)
- **Über mich:** Porträt, Text (erster Absatz groß), Kennzahlen, Auszeichnungen
- **Vita:** Reiter je Bereich (Theater, Film & Fernsehen, Hörspiel …), ohne JavaScript alle untereinander
- **Fotos:** Raster mit Großansicht (Lightbox), Fotograf:in auf jedem Bild
- **Showreel & Stimme:** Links zu Videos und Hörproben – bewusst **nicht eingebettet** (keine Daten an
  Dritte, kein Cookie-Banner, Content-Security-Policy bleibt „nur eigene Domain“)
- **Profil:** Steckbrief (Spielalter, Größe, Sprachen, Dialekte, Fähigkeiten …)
- **Kontakt:** Agentur, Profile (Filmmakers, Crew United, Instagram …)
- Impressum und Datenschutz; Bildnachweise werden im Impressum automatisch aufgelistet

Leere Bereiche werden samt Menüeintrag ausgeblendet.

## Inhalte

Alles steht in der JSON-Datei der Kundin (Beispiel: `kunden/nora-solcher/schauspiel.json`),
Fotos liegen daneben in `images/`. Jedes Bild braucht ein `credit` (Fotograf:in) – fehlt es,
warnt der Build. Bilder unter 1000 px Breite werden ebenfalls gemeldet.

| Feld | Inhalt |
|---|---|
| `name`, `berufe`, `slogan`, `kurzbeschreibung` | Name, Berufe, Titelzusatz, Meta-Beschreibung |
| `hero_bild`, `hero_zeile` | Startbild (Querformat, `fokus` = object-position), Unterzeile |
| `ueber_mich`, `ueber_mich_bild`, `ueber_mich_fakten` | Text (Absätze durch Leerzeile), Porträt, Kennzahlen |
| `aktuell` | `label`, `titel`, `text`, optional `bild` |
| `vita` | Bereiche mit `kategorie` und `eintraege` (`jahr`, `titel`, `rolle`, `regie`, `ort`) |
| `auszeichnungen`, `steckbrief` | Listen mit `jahr`/`titel`/`text` bzw. `label`/`wert` |
| `medien` | `titel`, `text`, `url` (https), `art` = `video` oder `audio` |
| `galerie` | `datei`, `alt`, `credit` |
| `kontakt` | `text`, `agentur` (`name`, `person`, `telefon`, `email`, `website`), `email_direkt` |
| `profile` | `name`, `url` (https) |
| `farben.akzent` | Akzentfarbe (Kontrast wird automatisch angepasst) |
| `impressum`, `datenschutz` | Markdown |
| `demo_modus` | `true` = Entwurfsstreifen + noindex |

## Bauen

```bash
node build-all.js nora-solcher
```

Ergebnis in `public/nora-solcher/`. Einzeln: `node vorlagen/schauspiel/build.js kunden/nora-solcher/schauspiel.json`
(nimmt die Fotos aus `images/` neben der JSON-Datei, schreibt nach `vorlagen/schauspiel/dist/`).
Schriften: Fraunces und Manrope (SIL Open Font License, siehe `fonts/`).
