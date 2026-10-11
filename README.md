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
│   ├── repertoire/     mehrseitiges Künstler-Portfolio mit Bereichsseiten (Nora Solcher)
│   ├── schauspiel/     nüchternes Schauspiel-Portfolio (gleiches Datenformat wie buehne)
│   └── beratung/       Beratung, Training, Coaching mit Workshop-Seiten (Gruppe 42)
├── lib/                gemeinsamer Code aller Vorlagen: helfer.js, bilder.js (WebP + AVIF),
│                       schema.js (Inhaltsprüfung), s3.js + medien.js (Objektspeicher)
├── schemas/            JSON-Schemas der Inhalte (Betrieb, Portfolio) – auch für VS Code
├── kunden/             Kundenseiten – je Ordner eine JSON-Datei; Fotos/Medien im Objektspeicher
├── hosting/            nginx.conf, nginx-sicherheit.conf (vom Dockerfile kopiert)
├── scripts/            neue-seite.js, seite-loeschen.js (auch als GitHub-Workflows), medien.js
├── tests/              inhalte.js (Schema), smoke.js (alle Seiten mobil + Desktop), lighthouse.js
├── .github/workflows/  Pipeline (Prüfen, Build, Test, Lighthouse, Deploy), Seite anlegen/löschen
├── .pages.yml          Formulare für Pages CMS (Kund:innen pflegen Inhalte ohne JSON)
│
├── vertrieb/           Lead-Skripte; Leads (CSV), Cache und Pitches nur lokal
├── recherche/          Kundenrecherche (Fotos, Quellen) – nur lokal
│
├── public/             Build-Ergebnis (wird erzeugt, nicht im Repo)
└── .bildcache/         Bild-Cache (WebP/AVIF nach Prüfsumme, wird erzeugt, nicht im Repo)
```

Doku: `HOSTING.md` (Hosting, Workflows, Pipeline), `vorlagen/<name>/README.md` (Felder der Vorlage),
`PROGRESS.md` (Arbeitsstand), `CLAUDE.md` (Arbeitsregeln).

## Lokal ansehen

```bash
node build-all.js
cd public && python3 -m http.server 8000
```

Dann http://localhost:8000/ öffnen. Für verkleinerte Bilder `cwebp` und `avifenc` installieren
(`brew install webp libavif` bzw. `apt-get install webp libavif-bin`), sonst werden die Originale kopiert.
Kundenfotos holt der Build aus dem Objektspeicher, wenn `MEDIEN_ENDPUNKT` usw. gesetzt sind (siehe HOSTING.md).
