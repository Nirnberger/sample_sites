#!/usr/bin/env python3
"""
lead_finder.py – findet gut bewertete Unternehmen mit schwachen Websites.

Ablauf:
  1. Google Places API (New): Suche "Branche + Ort" für alle Kombinationen
  2. Filter: Bewertung, Anzahl Bewertungen, Betrieb aktiv
  3. Website-Analyse: PageSpeed Insights (mobil) + eigene HTML-Checks
  4. Score: schlechte Website × starkes Unternehmen = Priorität
  5. Ausgabe: CSV (Excel-tauglich), sortiert nach Priorität, inkl.
     konkreter Mängelliste in Klartext (direkt fürs Angebot nutzbar)

Einrichtung:
  pip install requests
  Google Cloud Console → Projekt anlegen → "Places API (New)" und
  "PageSpeed Insights API" aktivieren → API-Schlüssel erstellen
  export GOOGLE_API_KEY="dein-schluessel"        (Windows: set GOOGLE_API_KEY=...)

Beispiele:
  python lead_finder.py
  python lead_finder.py --orte "Kiel,Rendsburg" --branchen "Tischlerei,Elektriker"
  python lead_finder.py --min-rating 4.6 --min-reviews 50 --no-pagespeed

Kosten: Die Places-Textsuche mit Bewertungs-/Website-Feldern ist kostenpflichtig
(Google gewährt ein monatliches Freikontingent – aktuelle Preise in der Cloud
Console prüfen). Ergebnisse werden in .lead_cache/ zwischengespeichert, damit
wiederholte Läufe nichts doppelt kosten. Mit --max-queries klein testen!
"""

import argparse
import csv
import hashlib
import json
import math
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

import requests

# ----------------------------------------------------------------------------
# Konfiguration – nach Bedarf anpassen
# ----------------------------------------------------------------------------

BRANCHEN = [
    "Tischlerei", "Elektriker", "Dachdecker", "Malerbetrieb", "Sanitär Heizung",
    "Restaurant", "Café", "Ferienwohnung", "Hotel", "Physiotherapie",
    "Friseur", "Kosmetikstudio",
]

ORTE = [
    # Schleswig-Holstein
    "Kiel", "Rendsburg", "Eckernförde", "Neumünster", "Lübeck", "Flensburg",
    "Schleswig", "Husum", "Plön",
    # Wien (nach Bezirken, weil Google max. 60 Treffer pro Suche liefert)
    "Wien Innere Stadt", "Wien Leopoldstadt", "Wien Landstraße", "Wien Wieden",
    "Wien Margareten", "Wien Mariahilf", "Wien Neubau", "Wien Josefstadt",
    "Wien Alsergrund", "Wien Favoriten", "Wien Ottakring", "Wien Döbling",
    "Wien Floridsdorf", "Wien Donaustadt",
]

# Domains, die keine "echte" Website sind → eigener Status (oft die besten Leads)
SOCIAL_DOMAINS = (
    "facebook.com", "instagram.com", "linktr.ee", "tiktok.com", "business.site",
    "wixsite.com", "jimdosite.com", "google.com", "booking.com", "airbnb.",
    "tripadvisor.", "linkedin.com", "xing.com", "yelp.", "lieferando.",
    "treatwell.", "das-oertliche.de", "gelbeseiten.de", "herold.at",
)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
PLACES_FIELDS = ",".join([
    "places.id", "places.displayName", "places.formattedAddress",
    "places.rating", "places.userRatingCount", "places.websiteUri",
    "places.nationalPhoneNumber", "places.primaryTypeDisplayName",
    "places.googleMapsUri", "places.businessStatus", "nextPageToken",
])

CACHE_DIR = Path(".lead_cache")
CURRENT_YEAR = date.today().year

SESSION = requests.Session()
SESSION.headers["User-Agent"] = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# ----------------------------------------------------------------------------
# Cache
# ----------------------------------------------------------------------------

def _cache_path(kind, key):
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
    return CACHE_DIR / kind / f"{h}.json"


def cache_get(kind, key, max_age_days=30):
    p = _cache_path(kind, key)
    if p.exists() and (time.time() - p.stat().st_mtime) < max_age_days * 86400:
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
    return None


def cache_put(kind, key, value):
    p = _cache_path(kind, key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")

# ----------------------------------------------------------------------------
# 1. Places-Suche
# ----------------------------------------------------------------------------

def search_places(query, api_key, max_pages=3):
    cached = cache_get("places", query)
    if cached is not None:
        return cached

    results, page_token = [], None
    for _ in range(max_pages):
        body = {"textQuery": query, "languageCode": "de", "pageSize": 20}
        if page_token:
            body["pageToken"] = page_token
        r = SESSION.post(
            PLACES_URL, json=body, timeout=30,
            headers={"X-Goog-Api-Key": api_key, "X-Goog-FieldMask": PLACES_FIELDS},
        )
        if r.status_code != 200:
            print(f"  ! Places-Fehler {r.status_code} bei '{query}': {r.text[:200]}",
                  file=sys.stderr)
            break
        data = r.json()
        results.extend(data.get("places", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
        time.sleep(2)  # Token braucht kurz, bis er gültig ist

    cache_put("places", query, results)
    return results


def normalize_place(p, query):
    return {
        "place_id": p.get("id"),
        "name": (p.get("displayName") or {}).get("text", ""),
        "adresse": p.get("formattedAddress", ""),
        "telefon": p.get("nationalPhoneNumber", ""),
        "kategorie": (p.get("primaryTypeDisplayName") or {}).get("text", ""),
        "bewertung": p.get("rating"),
        "anzahl_bewertungen": p.get("userRatingCount") or 0,
        "website": p.get("websiteUri", ""),
        "maps_link": p.get("googleMapsUri", ""),
        "status": p.get("businessStatus", ""),
        "suchanfrage": query,
    }


def domain_of(url):
    host = urlparse(url if "://" in url else "http://" + url).netloc.lower()
    return host[4:] if host.startswith("www.") else host

# ----------------------------------------------------------------------------
# 2. Website-Analyse
# ----------------------------------------------------------------------------

def analyze_html(html, final_url):
    """Reine Auswertung (ohne Netzwerk) – damit testbar."""
    low = html.lower()
    res = {
        "https": final_url.lower().startswith("https://"),
        "viewport": bool(re.search(r"<meta[^>]+name\s*=\s*[\"']?viewport", low)),
        "copyright_jahr": None,
        "jquery_version": None,
        "generator": None,
        "veraltete_technik": [],
    }

    years = []
    for m in re.finditer(r"(?:©|&copy;|&#169;|copyright)([^<]{0,60})", low):
        years += [int(y) for y in re.findall(r"\b(19[89]\d|20\d{2})\b", m.group(1))]
    years = [y for y in years if y <= CURRENT_YEAR]
    if years:
        res["copyright_jahr"] = max(years)

    m = (re.search(r"jquery[.-](\d+\.\d+(?:\.\d+)?)(?:\.min)?\.js", low)
         or re.search(r"jquery(?:\.min)?\.js\?ver=(\d+\.\d+(?:\.\d+)?)", low))
    if m:
        res["jquery_version"] = m.group(1)

    m = re.search(r"<meta[^>]+name\s*=\s*[\"']generator[\"'][^>]+content\s*=\s*[\"']([^\"']+)", low)
    if m:
        res["generator"] = m.group(1)[:60]

    tech = []
    if ".swf" in low or "shockwave" in low:
        tech.append("Flash")
    if "<frameset" in low or "<frame " in low:
        tech.append("Frames")
    if "<font" in low:
        tech.append("<font>-Tags")
    if low.count("<table") >= 3 and "display:flex" not in low and "display: grid" not in low:
        tech.append("Tabellen-Layout")
    if "<marquee" in low:
        tech.append("Laufschrift")
    res["veraltete_technik"] = tech
    return res


def fetch_and_analyze(url):
    out = {"html_fehler": "", "ladezeit_s": None}
    try:
        t0 = time.time()
        r = SESSION.get(url, timeout=20, allow_redirects=True)
        out["ladezeit_s"] = round(time.time() - t0, 1)
        if r.status_code >= 400:
            out["html_fehler"] = f"HTTP {r.status_code}"
        out.update(analyze_html(r.text[:3_000_000], r.url))
    except requests.exceptions.SSLError:
        out["html_fehler"] = "SSL-Zertifikat ungültig"
        out["https"] = False
    except requests.RequestException as e:
        out["html_fehler"] = type(e).__name__
    return out


def pagespeed(url, api_key):
    empty = {"psi_performance": None, "psi_seo": None, "psi_barrierefreiheit": None,
             "psi_best_practices": None, "psi_lcp_s": None, "psi_fehler": ""}
    params = [("url", url), ("strategy", "mobile")]
    params += [("category", c) for c in ("performance", "seo", "accessibility", "best-practices")]
    if api_key:
        params.append(("key", api_key))

    err = ""
    for attempt in range(3):
        try:
            r = SESSION.get(PSI_URL, params=params, timeout=150)
            if r.status_code == 429:
                time.sleep(15 * (attempt + 1))
                err = "Rate-Limit"
                continue
            if r.status_code != 200:
                err = f"HTTP {r.status_code}"
                break
            lh = r.json()["lighthouseResult"]
            cats = lh.get("categories", {})

            def s(k):
                v = cats.get(k, {}).get("score")
                return round(v * 100) if v is not None else None

            lcp = lh.get("audits", {}).get("largest-contentful-paint", {}).get("numericValue")
            return {"psi_performance": s("performance"), "psi_seo": s("seo"),
                    "psi_barrierefreiheit": s("accessibility"),
                    "psi_best_practices": s("best-practices"),
                    "psi_lcp_s": round(lcp / 1000, 1) if lcp else None, "psi_fehler": ""}
        except (requests.RequestException, KeyError, ValueError) as e:
            err = type(e).__name__
    empty["psi_fehler"] = err
    return empty


def analyze_site(url, api_key, use_psi=True):
    key = f"{url}|psi={use_psi}"
    cached = cache_get("sites", key, max_age_days=14)
    if cached is not None:
        return cached
    res = fetch_and_analyze(url)
    if use_psi:
        res.update(pagespeed(url, api_key))
    cache_put("sites", key, res)
    return res

# ----------------------------------------------------------------------------
# 3. Scoring
# ----------------------------------------------------------------------------

def _version_tuple(v):
    try:
        return tuple(int(x) for x in v.split("."))
    except (ValueError, AttributeError):
        return ()


def score_website(a):
    """0 = top Website, 100 = dringend erneuerungsbedürftig. Plus Mängelliste."""
    score, maengel = 0.0, []

    if a.get("html_fehler"):
        score += 25
        maengel.append(f"Website-Fehler: {a['html_fehler']}")

    perf = a.get("psi_performance")
    if perf is not None:
        score += (100 - perf) * 0.25
        if perf < 50:
            maengel.append(f"Sehr langsam auf dem Handy (Google-Wert {perf}/100)")
    lcp = a.get("psi_lcp_s")
    if lcp and lcp > 4:
        score += 5
        maengel.append(f"Hauptinhalt lädt mobil erst nach ca. {lcp} s")

    if a.get("viewport") is False:
        score += 20
        maengel.append("Nicht für Smartphones optimiert")
    if a.get("https") is False:
        score += 15
        maengel.append("Keine sichere Verbindung (Browser zeigt 'Nicht sicher')")

    cy = a.get("copyright_jahr")
    if cy:
        age = CURRENT_YEAR - cy
        score += min(max(age - 1, 0), 10) * 1.5
        if age >= 3:
            maengel.append(f"Vermutlich seit ca. {cy} nicht aktualisiert")

    jq = _version_tuple(a.get("jquery_version"))
    if jq and jq < (3,):
        score += 5
        maengel.append(f"Veraltete Technik (jQuery {a['jquery_version']}, Sicherheitsrisiko)")

    seo = a.get("psi_seo")
    if seo is not None:
        score += (100 - seo) * 0.1
        if seo < 80:
            maengel.append(f"Schwache Grundlagen für Google-Auffindbarkeit (SEO {seo}/100)")

    tech = a.get("veraltete_technik") or []
    if tech:
        score += min(10, 5 * len(tech))
        maengel.append("Veraltete Bauweise: " + ", ".join(tech))

    return min(round(score), 100), maengel


def business_strength(rating, count):
    """0..1 – wie gut läuft das Geschäft (= kann/will es investieren)."""
    r = min(max(((rating or 0) - 4.0) / 1.0, 0), 1)
    c = min(math.log10(max(count, 1)) / math.log10(500), 1)
    return 0.5 * r + 0.5 * c


def priority(website_score, strength):
    return round(website_score * (0.4 + 0.6 * strength))

# ----------------------------------------------------------------------------
# Hauptprogramm
# ----------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Findet gut bewertete Unternehmen mit schwachen Websites.")
    ap.add_argument("--branchen", help="Kommagetrennt, überschreibt die Liste im Skript")
    ap.add_argument("--orte", help="Kommagetrennt, überschreibt die Liste im Skript")
    ap.add_argument("--min-rating", type=float, default=4.5)
    ap.add_argument("--min-reviews", type=int, default=30)
    ap.add_argument("--max-queries", type=int, default=0, help="Nur die ersten N Suchen (zum Testen)")
    ap.add_argument("--workers", type=int, default=4, help="Parallele Website-Analysen")
    ap.add_argument("--no-pagespeed", action="store_true", help="Nur HTML-Checks (schnell)")
    ap.add_argument("--skip-no-website", action="store_true", help="Betriebe ohne Website weglassen")
    ap.add_argument("--out", default=f"leads_{date.today().isoformat()}.csv")
    args = ap.parse_args()

    api_key = os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        sys.exit("Fehler: Umgebungsvariable GOOGLE_API_KEY ist nicht gesetzt.")

    branchen = [b.strip() for b in args.branchen.split(",")] if args.branchen else BRANCHEN
    orte = [o.strip() for o in args.orte.split(",")] if args.orte else ORTE
    queries = [f"{b} {o}" for o in orte for b in branchen]
    if args.max_queries:
        queries = queries[: args.max_queries]

    # 1) Suchen
    print(f"[1/4] {len(queries)} Suchanfragen …")
    places = {}
    for i, q in enumerate(queries, 1):
        for p in search_places(q, api_key):
            n = normalize_place(p, q)
            if n["place_id"] and n["place_id"] not in places:
                places[n["place_id"]] = n
        print(f"  {i}/{len(queries)}  {q:<40} → gesamt {len(places)}", end="\r")
    print()

    # 2) Filtern
    leads = [p for p in places.values()
             if p["status"] in ("", "OPERATIONAL")
             and (p["bewertung"] or 0) >= args.min_rating
             and p["anzahl_bewertungen"] >= args.min_reviews]
    print(f"[2/4] {len(leads)} von {len(places)} erfüllen Bewertung ≥ {args.min_rating} "
          f"und ≥ {args.min_reviews} Bewertungen")

    # Ketten erkennen: gleiche Domain an mehreren Standorten
    domain_count = {}
    for p in leads:
        if p["website"]:
            d = domain_of(p["website"])
            domain_count[d] = domain_count.get(d, 0) + 1

    to_analyze = {}
    for p in leads:
        url = p["website"]
        if not url:
            p["website_typ"] = "keine Website"
        elif any(s in domain_of(url) for s in SOCIAL_DOMAINS):
            p["website_typ"] = "nur Social Media / Plattform"
        else:
            p["website_typ"] = "eigene Website"
            to_analyze.setdefault(domain_of(url), url)
        p["standorte_gleiche_domain"] = domain_count.get(domain_of(url), 0) if url else 0

    # 3) Analysieren (pro Domain einmal)
    print(f"[3/4] Analysiere {len(to_analyze)} Websites"
          f"{' (ohne PageSpeed)' if args.no_pagespeed else ' (PageSpeed dauert ca. 20 s pro Seite)'} …")
    analyses = {}
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(analyze_site, url, api_key, not args.no_pagespeed): d
                for d, url in to_analyze.items()}
        for i, f in enumerate(as_completed(futs), 1):
            d = futs[f]
            try:
                analyses[d] = f.result()
            except Exception as e:  # eine kaputte Seite soll den Lauf nicht stoppen
                analyses[d] = {"html_fehler": type(e).__name__}
            print(f"  {i}/{len(futs)}  {d[:50]:<50}", end="\r")
    print()

    # 4) Scoren & ausgeben
    rows = []
    for p in leads:
        typ = p["website_typ"]
        if typ == "keine Website":
            if args.skip_no_website:
                continue
            ws, maengel, a = 100, ["Keine eigene Website"], {}
        elif typ.startswith("nur Social"):
            ws, maengel, a = 90, ["Nur Social-Media-/Plattform-Profil, keine eigene Website"], {}
        else:
            a = analyses.get(domain_of(p["website"]), {})
            ws, maengel = score_website(a)

        strength = business_strength(p["bewertung"], p["anzahl_bewertungen"])
        rows.append({
            "prioritaet": priority(ws, strength),
            "website_score": ws,
            "geschaeft_staerke": round(strength * 100),
            "name": p["name"],
            "kategorie": p["kategorie"],
            "bewertung": p["bewertung"],
            "anzahl_bewertungen": p["anzahl_bewertungen"],
            "website_typ": typ,
            "website": p["website"],
            "maengel": " | ".join(maengel),
            "psi_performance": a.get("psi_performance"),
            "psi_seo": a.get("psi_seo"),
            "mobil_optimiert": a.get("viewport"),
            "https": a.get("https"),
            "copyright_jahr": a.get("copyright_jahr"),
            "generator": a.get("generator"),
            "standorte_gleiche_domain": p["standorte_gleiche_domain"],
            "adresse": p["adresse"],
            "telefon": p["telefon"],
            "maps_link": p["maps_link"],
            "suchanfrage": p["suchanfrage"],
            "status_kontakt": "",   # für dein Tracking
            "notizen": "",
        })

    rows.sort(key=lambda r: r["prioritaet"], reverse=True)
    if not rows:
        print("Keine Leads gefunden – Filter lockern oder andere Suchbegriffe probieren.")
        return
    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=";")
        w.writeheader()
        w.writerows(rows)

    print(f"[4/4] {len(rows)} Leads gespeichert in {args.out}\n")
    print("Top 10:")
    for r in rows[:10]:
        print(f"  {r['prioritaet']:>3}  {r['name'][:35]:<35} {r['bewertung']}★ "
              f"({r['anzahl_bewertungen']})  {r['website_typ']}")


if __name__ == "__main__":
    main()
