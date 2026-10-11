"""Manuelle Zuordnung der 105 Roh-Treffer (Wien & Umgebung, Angel/Jagd/Waffen).
Schlüssel: Anfang des Namens. Wert: (Segment, Ausschlussgrund oder "")."""

AUSSCHLUSS = {
    # Ketten / Filialisten / große Marken
    "Anglertreff": "Kette mit mehreren Filialen",
    "Eduard Kettner": "Kette (Kettner)",
    "Fishermans Partner": "Kette (Fishermans Partner)",
    "Waffen Lehner - FP": "gehört zu Fishermans Partner",
    "Joh. Springer": "Großer Traditionsbetrieb mit professioneller Website",
    "Action Wien": "Discounter-Kette",
    "GLOCK": "Hersteller",
    "STEYR ARMS": "Hersteller",
    "Austria Arms": "Großhändler/Importeur",
    "Ing. Fritsch Trade": "Großhändler/Importeur (Austria Arms)",
    "Brownells Austria": "Internationale Versandhandelskette",
    "COP Austria": "Filiale eines deutschen Versandhändlers",
    "Novritsch": "Airsoft-Marke",
    # fachfremd
    "Maxs Paintball": "Paintball/Airsoft", "Airsofter.at": "Airsoft", "SCHUNKO": "Softair-Händler",
    "Fighter's World": "Kampfsportbedarf", "TheMerchant": "Militär-/Bekleidung", "Army Liq.": "Army-Shop (Bekleidung)",
    "JB Racketservice": "Tennis/Racket", "Atelier Engel": "Bekleidung", "Rarehuntershop": "Sammelartikel/Spielwaren",
    "مسمكة": "Fischhändler/Restaurant", "Genuss Hafenrichter": "Fischhändler", "Biofisch": "Fischhändler",
    "Eishken": "Fisch-Großhandel", "Fische Kaisermühlen": "Fischhändler", "Fisch & Feinkost": "Fischhändler",
    "fischgenuss": "Fischhändler", "Alles für die Fisch": "Fischhändler (Markt)", "Karpfenkönig": "Fischhändler (Markt)",
    "Floridsdorfer Markt": "Markt", "1. Wiener Fischereimuseum": "Museum", "Aquahof": "Fischzucht",
    "Betashop.at": "vermutlich Aquaristik (Betta-Fische) – prüfen",
    # Vereine / Schießstände
    "HSV Wien": "Schützenverein", "SKS - Stammersdorfer": "Schützenverein", "EUROSHOOTERS": "Schützenverein",
    "Sportfischereiverein": "Verein", "Legalwaffenunion": "Verein/Schießstand", "Shooters Hall": "Schießstand",
    "RangeIsClear": "Schießstand", "Mario´s Shooting World": "Schießstand",
    # zu weit weg
    "Florin AngelSport": "Oberpullendorf (Burgenland) – außerhalb Wien-Umgebung",
    "Andreas KIESER": "Waldviertel – außerhalb Wien-Umgebung",
}

ANGELTEICH = ("Lainzer Teich", "Pepi's Märchenteich", "Minichlacke", "Relax Fischerparadies", "Revier Zierteich")

# Segment für alle übrigen: aus der Suchanfrage
def segment(name, suchanfrage):
    if name.startswith(ANGELTEICH):
        return "Angelteich / Revier"
    q = suchanfrage.lower()
    if q.startswith(("angelgeschäft", "fischereibedarf")):
        return "Angelgeschäft"
    if q.startswith("büchsenmacher"):
        return "Büchsenmacher / Waffen"
    return "Jagd & Waffen"


def ausschluss(name):
    for k, grund in AUSSCHLUSS.items():
        if name.startswith(k):
            return grund
    return ""


PRUEFEN = {
    "LuckyDelta": "Google führt den Betrieb als „Autowerkstatt“ – laut Name CZ-Waffenspezialist, Kategorie prüfen",
    "Wu's Hotspot": "Nur Facebook-Seite – vor dem Besuch prüfen, ob noch aktiv",
}
