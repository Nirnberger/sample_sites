# Websites für lokale Betriebe

Statische Website-Vorlagen und Kundenseiten, gebaut mit Node (ohne npm-Abhängigkeiten), ausgeliefert
mit nginx über Coolify. Live: https://sample.seitenschwung.com

## Ordner

```
workspace/
├── sites.json          welche Seite unter welchem Pfad mit welcher Vorlage läuft
├── build-all.js        baut alle Seiten nach public/   →  node build-all.js [pfad]
├── hub.js              Startseite (/) mit den Beispielprojekten
├── Dockerfile          Build + Auslieferung (Coolify erwartet ihn hier)
│
├── vorlagen/           Website-Vorlagen – je Ordner build.js, src/, fonts/, images/, Beispiel-JSON
│   ├── salon/          Friseursalons
│   ├── barber/         Barbershops
│   ├── cafe/           Cafés, Bistros, Imbisse
│   ├── angel-jagd/     Fachhandel mit Sortiment und Merkzettel
│   ├── buehne/         künstlerisches Schauspiel-Portfolio („Website als Theaterabend“)
│   └── schauspiel/     nüchternes Schauspiel-Portfolio (gleiches Datenformat wie buehne)
├── kunden/             Kundenseiten – je Ordner eine JSON-Datei + images/ (überlagern Vorlagenbilder)
├── hosting/            nginx.conf, nginx-sicherheit.conf (vom Dockerfile kopiert)
├── scripts/            neue-seite.js, seite-loeschen.js (auch als GitHub-Workflows)
├── tests/              smoke.js – prüft alle Seiten mobil + Desktop
├── .github/workflows/  Pipeline (Build, Test, Deploy), Seite anlegen/löschen
│
├── vertrieb/           Lead-Skripte; Leads (CSV), Cache und Pitches nur lokal
├── recherche/          Kundenrecherche (Fotos, Quellen) – nur lokal
│
├── public/             Build-Ergebnis (wird erzeugt, nicht im Repo)
└── .bildcache/         WebP-Cache je Seite (wird erzeugt, nicht im Repo)
```

Doku: `HOSTING.md` (Hosting, Workflows, Pipeline), `vorlagen/<name>/README.md` (Felder der Vorlage),
`PROGRESS.md` (Arbeitsstand), `CLAUDE.md` (Arbeitsregeln).

## Lokal ansehen

```bash
node build-all.js
cd public && python3 -m http.server 8000
```

Dann http://localhost:8000/ öffnen. Für verkleinerte WebP-Bilder `cwebp` installieren (`brew install webp`
bzw. `apt-get install webp`), sonst werden die Originalbilder kopiert.
