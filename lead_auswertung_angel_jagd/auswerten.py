"""Erstellt die finale Lead-Tabelle (Wien & Umgebung, Angel/Jagd/Waffen).

Website-Score: score_website() aus lead_finder.py, mit lokal gemessenen Lighthouse-Werten
statt der (nicht aktivierten) PageSpeed-API.
Zusage-Score (0–100): Wie wahrscheinlich sagt der Betrieb zu UND profitiert davon?
  = 0.55 × Website-Bedarf + 0.35 × Geschäftsstärke
  + Aufhänger-Bonus (keine Website, Sicherheitswarnung, Seite nicht erreichbar)
  − Abzüge (Angelteich/Verein, sehr wenige Bewertungen, reiner Online-Händler)
"""
import csv
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lead_finder as lf  # nur lesend genutzt: score_website, cache_get, business_strength
from zuordnung import ausschluss, segment, PRUEFEN

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # lead_finder-Cache liegt relativ dazu
ROH = "leads_wien_angel_jagd_roh.csv"
ZIEL = "leads_wien_angel_jagd.csv"
LH = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "lh_ergebnisse.json")))

rows = list(csv.DictReader(open(ROH, encoding="utf-8-sig"), delimiter=";"))


def ort(adresse):
    m = re.search(r"\b(\d{4})\s+([^,]+)", adresse or "")
    return f"{m.group(1)} {m.group(2).strip()}" if m else ""


def aufhaenger(typ, maengel, bewertung, anzahl):
    b = str(bewertung).replace(".", ",")
    if typ == "keine Website":
        return (f"{b}★ bei {anzahl} Google-Bewertungen, aber keine eigene Website: Wer bei Google sucht, "
                "sieht nur Adresse und Telefonnummer – kein Sortiment, keine Angebote.")
    if typ.startswith("nur Social"):
        return f"{b}★ bei {anzahl} Bewertungen, aber nur eine Facebook-/Plattform-Seite statt eigener Website mit Sortiment."
    teile = []
    if "SSL" in maengel or "Nicht sicher" in maengel:
        teile.append("Browser zeigt beim Aufruf „Nicht sicher“ – viele Besucher brechen da ab")
    if re.search(r"ConnectionError|Timeout|HTTP 5", maengel):
        teile.append("Website ist derzeit nicht erreichbar")
    if "Smartphone" in maengel:
        teile.append("Seite ist nicht fürs Handy gebaut")
    m = re.search(r"Google-Wert (\d+)", maengel)
    if m:
        teile.append(f"lädt am Handy sehr langsam (Google-Wert {m.group(1)}/100)")
    j = re.search(r"seit ca\. (\d{4})", maengel)
    if j:
        teile.append(f"wirkt seit ca. {j.group(1)} nicht mehr gepflegt")
    if "Veraltete Bauweise" in maengel or "jQuery" in maengel:
        teile.append("technisch veraltet gebaut")
    if not teile:
        return "Kleinere Schwächen – eher Shop-Erweiterung (Sortiment, Merkzettel) als kompletten Neubau anbieten."
    s = "; ".join(teile)
    return s[0].upper() + s[1:] + "."


leads, raus = [], []
gesehen = set()
for r in rows:
    grund = ausschluss(r["name"])
    if grund:
        raus.append((r["name"], grund))
        continue
    seg = segment(r["name"], r["suchanfrage"])
    typ = r["website_typ"]
    lh_fehler = ""
    if typ == "keine Website":
        ws, maengel = 100, ["Keine eigene Website"]
    elif typ.startswith("nur Social"):
        ws, maengel = 90, ["Nur Social-Media-/Plattform-Profil, keine eigene Website"]
    else:
        a = lf.cache_get("sites", f"{r['website']}|psi=True", max_age_days=30) or {}
        lh = LH.get(r["website"], {})
        a = {**a, **{k: v for k, v in lh.items() if k.startswith("psi_")}}
        lh_fehler = lh.get("lh_fehler", "")
        ws, maengel = lf.score_website(a)
    staerke = round(lf.business_strength(float(r["bewertung"] or 0), int(r["anzahl_bewertungen"] or 0)) * 100)

    if ws < 20:
        raus.append((r["name"], f"Website bereits ordentlich (Score {ws})"))
        continue
    key = (r["name"], r["adresse"])
    if key in gesehen:
        continue
    gesehen.add(key)

    m_text = " | ".join(maengel)
    score = 0.55 * ws + 0.35 * staerke
    if typ == "keine Website":
        score += 8
    if re.search(r"SSL|Nicht sicher|ConnectionError|Timeout", m_text):
        score += 8
    if seg == "Angelteich / Revier":
        score -= 22
    if int(r["anzahl_bewertungen"] or 0) < 10:
        score -= 8
    if re.search(r"online", r["name"], re.I):
        score -= 15

    notiz = PRUEFEN.get(next((k for k in PRUEFEN if r["name"].startswith(k)), ""), "")
    if seg == "Angelteich / Revier":
        notiz = "Angelteich – oft Verein oder Pächter. Entscheider klären; passt eher zur Café-/Service-Vorlage (Tageskarten, Öffnungszeiten)."
    if re.search(r"HTTP (403|429)", m_text):
        notiz = (notiz + " " if notiz else "") + "Website blockiert automatische Abrufe – Mängel manuell im Browser prüfen."

    leads.append({
        "zusage_score": max(0, min(100, round(score))),
        "name": r["name"],
        "segment": seg,
        "ort": ort(r["adresse"]),
        "bewertung": r["bewertung"],
        "anzahl_bewertungen": r["anzahl_bewertungen"],
        "website_typ": typ,
        "website": r["website"],
        "aufhaenger_fuer_pitch": aufhaenger(typ, m_text, r["bewertung"], r["anzahl_bewertungen"]),
        "maengel": m_text,
        "website_score": ws,
        "geschaeft_staerke": staerke,
        "telefon": r["telefon"],
        "adresse": r["adresse"],
        "maps_link": r["maps_link"],
        "passende_vorlage": "cafe-vorlage (Service)" if seg == "Angelteich / Revier" else "angel-jagd-vorlage",
        "hinweis": notiz,
        "status_kontakt": "",
        "notizen": "",
    })

leads.sort(key=lambda z: (-z["zusage_score"], -int(z["anzahl_bewertungen"])))
felder = ["rang"] + list(leads[0].keys())
with open(ZIEL, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=felder, delimiter=";")
    w.writeheader()
    for i, z in enumerate(leads, 1):
        w.writerow({"rang": i, **z})

print(f"{len(rows)} Roh-Treffer → {len(leads)} Leads in {ZIEL}, {len(raus)} aussortiert\n")
for i, z in enumerate(leads, 1):
    print(f"{i:>2}. [{z['zusage_score']:>3}] {z['name'][:36]:36} {z['segment'][:22]:22} {z['ort'][:24]:24} "
          f"{z['bewertung']}★({z['anzahl_bewertungen']:>3}) ws{z['website_score']:>3} {z['website_typ'][:14]}")
print("\nAussortiert wegen guter Website:")
for n, g in raus:
    if g.startswith("Website bereits"):
        print(f"  – {n}: {g}")
