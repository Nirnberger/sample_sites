# Barber-Vorlage „bodenständig“

Schwester-Vorlage zu `../salon-vorlage/`, für Barbershops. Gleiche Technik und gleiche Felder,
anderer Auftritt:

- **Look:** warmes Papier statt Weiß, Rost-Akzent (`#A8502E`), Oswald (schmale Plakatschrift) + Source Sans 3,
  eckige Kästen mit kräftigem Rand und Versatz-Schatten, Barber-Pole-Streifen oben
- **Hero:** Foto über die ganze Breite mit Text darüber (statt Bogenrahmen daneben)
- **Preise:** als „Preistafel“ in einem Kasten, Kategorien als Knöpfe
- **Ansprache:** durchgehend „du“ (Standardtexte im Template, Datenschutz-Muster in `barber.json`)

Alles Weitere (Felder, Bilder, Bildnachweise, Hochladen, Rechtliches) steht in
`../salon-vorlage/README.md` und gilt hier genauso. Einziger Unterschied: Die Inhalte stehen in
**`barber.json`** statt `salon.json`.

## Kurzfassung

1. Ordner kopieren, z. B. `barber-mueller/`
2. Fotos in `images/`, Inhalte in `barber.json`
3. `node build.js` → fertige Seite in `dist/`

Neues Unsplash-Foto: Datei in `images/` legen und in `bildnachweise` eintragen. Passende Suchbegriffe:
„barber cutting hair“, „beard trim“, „straight razor shave“, „barber tools“, „vintage barber chair“.
Gut passen warme, eher dunkle Bilder mit Holz, Ziegel und Werkzeug. Fotos mit fremden Logos oder
Ladennamen nicht verwenden.

## Beispielinhalt

„Kante & Klinge“ in Flensburg ist komplett **fiktiv**: Name, Team, Bewertungen, Telefonnummern.
Für echte Läden nur echte Bewertungen verwenden.

Fotos im Beispiel (alle Unsplash): Agustin Fernandez, Ten, Victor Sirbu, Mr Shave, František Čaník,
Arthur Humeau, Fito García, Nate Johnston.

Schriften: Oswald und Source Sans 3, beide SIL Open Font License (siehe `fonts/`).
