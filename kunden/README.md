# Kunden-Seiten

Je Seite ein Ordner `kunden/<pfad>/` mit der Inhaltsdatei der Vorlage (z. B. `cafe.json`).
Eigene Fotos (`images/`, ersetzen gleichnamige Vorlagenbilder) und Medien (`medien/`, z. B. Showreels)
liegen **nicht in Git**, sondern im Objektspeicher – `node scripts/medien.js hochladen <pfad>` bzw.
`holen`. Der Build holt sie automatisch, wenn die Zugangsdaten gesetzt sind.

Anlegen und löschen am einfachsten im Browser: **GitHub → Actions → „Neue Seite anlegen“ /
„Seite löschen“**. Details in `../HOSTING.md`.
