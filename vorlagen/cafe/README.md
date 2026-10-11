# Café-Vorlage „hell & herzlich“

Dritte Vorlage neben `../salon/` und `../barber/`, für **Cafés, Frühstückslokale,
Bistros, Imbisse und Eiscafés**. Gleiche Technik (statisch, ohne Cookies, ohne externe Requests),
Inhalte in **`cafe.json`**, Build mit `node build.js` → `dist/`.

## Warum diese Branche? (Auswertung `leads_kiel.csv`)

| Suchanfrage | Leads | davon Priorität ≥ 70 | ohne eigene Website |
|---|---|---|---|
| Friseur | 50 | 18 | 12 (+ Social) → Salon- & Barber-Vorlage |
| **Café** | 41 | **8** | 3 + 5 nur Social Media |
| **Restaurant** | 47 | **6** | 1 + 5 nur Social Media |
| Kosmetikstudio | 39 | 3 | nur Social Media |
| Handwerk, Physio, Hotel … | 62 | 0 | haben fast alle eine Website |

Café und Restaurant zusammen ergeben **14 Top-Leads** (Prio ≥ 60), mehr als Friseur (13 Salon + 5 Barber).
Die Restaurant-Treffer sind fast alle lockere Gastronomie (Kumpir, orientalisch, Bistro), deshalb deckt
eine Café/Bistro-Vorlage beide ab. Typischer Mangel: nur Instagram-/Plattform-Profil, keine eigene Seite.

## Was anders ist

- **Look:** Cremeweiß, tiefes Grün (`#2F6B57`), Fraunces (weiche Serife) + Figtree, runde Formen,
  Pillen-Buttons, Bogen-Foto im Hero
- **Live-Status im Hero:** „Jetzt geöffnet · bis 17 Uhr“ direkt auf dem Foto, aus den Öffnungszeiten berechnet
- **Highlights** unter dem Hero (max. 4), z. B. „Frühstück bis 15 Uhr“, „Hunde willkommen“
- **Speisekarte** statt Preisliste, mit **Merkmalen** pro Gericht (`vegan`, `vegetarisch`, `hausgemacht`, `neu` sind farbig)
- **Reservieren / Bestellen** statt Termin buchen; schema.org-Typ einstellbar
- Team-Bereich bleibt möglich, ist im Beispiel aber leer (bei Cafés selten gefragt)

## Zusätzliche Felder in `cafe.json`

Alle Felder der Salon-Vorlage gelten weiter (siehe `../salon/README.md`). Neu:

| Feld | Beschreibung |
|---|---|
| `buchung_url`, `buchung_text` | Reservierungslink (OpenTable, Quandoo, resmio …) und Button-Text, Standard „Tisch reservieren“. Leer = „Jetzt anrufen“ |
| `bestell_url`, `bestell_text` | Lieferando/Wolt/eigener Shop. Erscheint als zweiter Hero-Button bzw. in der mobilen Leiste |
| `highlights` | Liste `{ "icon", "titel", "text" }`. Icons: `sonne`, `kuchen`, `blatt`, `pfote`, `tasse`, `wlan`, `tuete` |
| `leistungen[].eintraege[].merkmale` | z. B. `["vegan", "hausgemacht"]` |
| `leistungen_nav`, `leistungen_titel` | Menüpunkt und Überschrift, Standard „Speisekarte“ / „Was es bei uns gibt“ |
| `schema_typ` | `CafeOrCoffeeShop` (Standard), `Restaurant`, `Bakery`, `IceCreamShop`, `FastFoodRestaurant` |
| `kueche` | Für die strukturierten Daten, z. B. „Türkisch, Kumpir“ |

**Für ein Restaurant/Imbiss** einfach `branche`, `schema_typ`, Kategorien und `highlights` anpassen.
Farbe über `farben.akzent` (z. B. Terrakotta `#B5532F` für orientalische Küche).

## Beispielinhalt

„Café Feldliebe“ in Kiel ist komplett **fiktiv** (Name, Inhaberin, Bewertungen, Nummern).
Fotos (Unsplash): Toa Heftiba, Clifford, tabitha turner, Ali Inay, Vishal Chokkala, Lee Campbell,
Klara Kulikova, Nathan Dumlao. Schriften: Fraunces und Figtree, SIL Open Font License.

Passende Unsplash-Suchbegriffe: „cozy cafe interior“, „breakfast table cafe“, „latte art“, „cake slice“,
„barista“. Gastro-Fotos mit fremden Logos, Speisekarten oder Ladennamen vermeiden.
