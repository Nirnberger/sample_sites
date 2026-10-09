# Shop-Vorlage „Angel & Jagd“

Vierte Vorlage neben Salon, Barber und Café: eine moderne Seite für **Angel- und Jagdgeschäfte**
(passt auch für Outdoor-, Fahrrad-, Garten- oder Tierbedarf) mit **Sortiment, Filter, Suche und Merkzettel**.
Gleiche Technik wie die anderen Vorlagen: statisch, ohne Cookies, ohne externe Requests.
Inhalte in **`shop.json`**, Build mit `node build.js` → `dist/`.

## Wie der „Store“ funktioniert (Click & Collect)

1. Kunde stöbert im Sortiment, filtert nach Kategorie oder sucht (auch direkt aus dem Hero).
2. Mit **„Merken“** landen Artikel auf dem Merkzettel (Menge änderbar, Summe wird berechnet).
3. **„Per WhatsApp anfragen“** oder **„Per E-Mail anfragen“** erzeugt eine fertige Nachricht:
   Artikelliste, Mengen, Preise, Name des Kunden.
4. Der Laden legt die Ware zurück, bezahlt wird bei Abholung.

**Warum kein Online-Checkout?** Ein echter Shop mit Bezahlung bräuchte Zahlungsanbieter, AGB,
Widerrufsbelehrung, Versandbedingungen und Bestell-Button nach Vorgabe. Waffen, Munition und bestimmte
Messer dürfen ohnehin nur gegen Altersnachweis bzw. Erlaubnis abgegeben werden. Click & Collect ist für
kleine Läden rechtlich und organisatorisch viel einfacher. Ein echter Checkout (z. B. Shopify Buy Button,
Snipcart oder Stripe Payment Links) lässt sich später ergänzen.

Der Merkzettel liegt nur im Arbeitsspeicher (kein Cookie, kein localStorage) und ist nach dem Schließen
der Seite leer. Ohne JavaScript bleibt das Sortiment vollständig sichtbar, nur Filter und Merken fehlen.

## Felder in `shop.json`

Alle Felder der Salon-Vorlage gelten weiter (siehe `../salon-vorlage/README.md`), dazu `highlights`
aus der Café-Vorlage (siehe `../cafe-vorlage/README.md`). Neu:

| Feld | Beschreibung |
|---|---|
| `produkte[]` | `name`, `kategorie`, `preis` (Zahl, z. B. `89.9` → „89,90 €“, oder Text „ab 20 €“), optional `preis_alt` (zeigt „Angebot“ und Streichpreis), `beschreibung`, `marke`, `einheit` („Stück“), `bild` (Pfad in `images/`, z. B. `produkte/rute.jpg`), `bild_alt`, `neu: true` |
| `produkte[].lager` | `"auf Lager"` (grün), `"wenige"` (orange), `"bestellbar"` („Lieferbar in 2–4 Tagen“) oder eigener Text |
| `produkte[].nur_vor_ort` | `true` = Hinweis „Abgabe nur im Laden gegen Vorlage von Jagdschein bzw. WBK“. Eigener Text über `hinweis`, z. B. „Abgabe nur an Personen ab 18 Jahren“. Ohne Bild erscheint ein Schild-Symbol |
| `shop.kategorien` | Reihenfolge der Filter-Knöpfe. Fehlt das Feld, wird die Reihenfolge aus den Produkten übernommen |
| `shop.titel`, `shop.intro`, `shop.eyebrow`, `shop.nav`, `shop.hinweis`, `shop.hero_knopf`, `shop.suche_platzhalter` | Texte des Shop-Bereichs |
| `bereiche[]` | Große Einstiegskarten unter dem Hero: `titel`, `text`, `bild`, `filter` (Kategorie, die beim Klick gefiltert wird), `link_text` |
| `leistungen` | Hier als **Service** genutzt (Angelkarten, Werkstatt, Frischköder) |
| `schema_typ` | Standard `SportingGoodsStore` |

Ist `produkte` leer, verschwindet der Shop und die Seite funktioniert wie eine normale Firmenseite.

## Hinweise für echte Kunden

- **Echte Produktfotos** verwenden. Die Unsplash-Fotos im Beispiel zeigen nicht die genannten Artikel.
  Keine Fotos mit fremden Markenlogos zu Produkten mit anderem Namen.
- **Waffenhandel:** Im Impressum die Erlaubnis nach § 21 WaffG und die erteilende Behörde eintragen
  (Platzhalter ist vorbereitet). Munition und erlaubnispflichtige Artikel immer mit `nur_vor_ort: true`.
- **Preise** sind Endpreise inkl. MwSt. Bei grundpreispflichtigen Artikeln (z. B. Futter oder Köder
  nach Gewicht) den Grundpreis in `beschreibung` oder `einheit` angeben.
- 30–60 Artikel laufen problemlos. Für Hunderte Artikel lieber ein echtes Shopsystem nutzen.
- Lokal testen: Beim Öffnen per Doppelklick (`file://`) blockiert der Browser die vorab geladene Schrift
  (nur eine Konsolenmeldung). Auf dem Webspace tritt das nicht auf.

## Beispielinhalt

„Petri & Pirsch“ in Rendsburg ist komplett **fiktiv**. Fotos von Unsplash (Nachweise in `shop.json`,
erscheinen automatisch in Fußzeile und Impressum). Schrift: Archivo (SIL Open Font License, siehe `fonts/`).
