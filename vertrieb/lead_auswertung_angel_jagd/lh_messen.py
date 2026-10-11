"""Misst Performance/SEO/LCP lokal mit Lighthouse (Mobil-Profil) für die Kandidaten-Websites."""
import csv, json, subprocess, sys, os
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from zuordnung import ausschluss
ROH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'leads_wien_angel_jagd_roh.csv')
ERG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lh_ergebnisse.json')
erg = json.load(open(ERG)) if os.path.exists(ERG) else {}
rows = list(csv.DictReader(open(ROH, encoding='utf-8-sig'), delimiter=';'))
urls = sorted({r['website'] for r in rows if r['website_typ'] == 'eigene Website' and not ausschluss(r['name'])})
offen = [u for u in urls if u not in erg]
print(f"{len(urls)} Websites, {len(offen)} offen", flush=True)
CHROME = '/home/claude/.cache/ms-playwright/chromium-1134/chrome-linux/chrome'
def messen(u):
    out = f"lh_{abs(hash(u))}.json"
    try:
        subprocess.run(['timeout', '150', 'npx', '--yes', 'lighthouse@11.7.1', u, '--quiet',
            '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --no-zygote',
            '--only-categories=performance,seo', '--output=json', f'--output-path={out}', '--max-wait-for-load=45000'],
            env={**os.environ, 'CHROME_PATH': CHROME}, capture_output=True, timeout=170)
        d = json.load(open(out)); os.remove(out)
        c = d['categories']
        sc = lambda k: round(c[k]['score'] * 100) if c.get(k, {}).get('score') is not None else None
        lcp = d['audits'].get('largest-contentful-paint', {}).get('numericValue')
        fehler = d.get('runtimeError', {}).get('code', '') if d.get('runtimeError') else ''
        return u, {'psi_performance': sc('performance'), 'psi_seo': sc('seo'), 'psi_lcp_s': round(lcp / 1000, 1) if lcp else None, 'lh_fehler': fehler}
    except Exception as e:
        return u, {'psi_performance': None, 'psi_seo': None, 'psi_lcp_s': None, 'lh_fehler': type(e).__name__}
with ThreadPoolExecutor(3) as ex:
    for i, (u, r) in enumerate(ex.map(messen, offen), 1):
        erg[u] = r
        json.dump(erg, open(ERG, 'w'), indent=1)
        print(f"{i}/{len(offen)} {u[:45]:45} perf={r['psi_performance']} seo={r['psi_seo']} lcp={r['psi_lcp_s']} {r['lh_fehler']}", flush=True)
print("FERTIG", flush=True)
