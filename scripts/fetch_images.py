#!/usr/bin/env python3
"""Fetch real bottle photos for the DrinkCogs database.

Sources, in priority order:
  1. data/image-overrides.json  — hand-curated {bottleId: imageUrl} (always wins)
  2. Wikimedia Commons          — freely licensed media, reliably the right product

Open Food Facts is available behind --allow-off but is OFF by default: in a
100-bottle run only ~38% of its matches were the correct product (it returned
Jim Beam for Buffalo Trace, a packet of cookies for Del Maguey Vida). Anything
it returns MUST be eyeballed before shipping.

Downloads to assets/bottles/<id>.jpg (max height 720px, JPEG q82; PNG kept if
transparent) and writes data/images.json:
  {bottleId: {"file": "assets/bottles/<id>.jpg", "w": W, "h": H,
              "source": "off|commons|manual", "credit": "...", "license": "..."}}

The app falls back to procedural SVG art for any bottle without an entry, so
partial coverage is safe. Re-running only fetches missing bottles unless
--refresh is given. Add fixes to image-overrides.json and re-run.
"""

import io
import json
import pathlib
import re
import sys
import time
import ssl
import urllib.parse
import urllib.request

from PIL import Image

try:
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # fall back to system trust store
    SSL_CTX = ssl.create_default_context()

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'assets' / 'bottles'
MANIFEST = ROOT / 'data' / 'images.json'
OVERRIDES = ROOT / 'data' / 'image-overrides.json'

UA = {'User-Agent': 'DrinkCogs/1.0 (personal static encyclopedia; github.com/Adavidss/DrinkCogs)'}
MAX_H = 720

STOP = {'the', 'of', 'de', 'la', 'a', 'and', '&', 'year', 'years', 'old', 'yr'}


def norm_tokens(s):
    return {t for t in re.split(r'[^a-z0-9]+', s.lower()) if t and t not in STOP}


def fetch_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=SSL_CTX) as r:
        return json.load(r)


def fetch_bytes(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40, context=SSL_CTX) as r:
        return r.read()


def off_search(bottle):
    """Open Food Facts search-a-licious; returns (image_url, credit) or None."""
    q = urllib.parse.quote_plus(bottle['name'])
    url = f'https://search.openfoodfacts.org/search?q={q}&page_size=10'
    try:
        data = fetch_json(url)
    except Exception:
        return None
    want = norm_tokens(bottle['name']) | norm_tokens(bottle.get('brand') or '')
    best = None
    for p in data.get('hits', []):
        img = p.get('image_front_url')
        name = p.get('product_name') or ''
        if not img or not name:
            continue
        # Skip non-Latin market labels (Cyrillic etc.) — wrong-region bottle shots.
        if sum(ord(c) > 0x250 for c in name) > len(name) * 0.3:
            continue
        brands = p.get('brands') or []
        if isinstance(brands, str):
            brands = [brands]
        have = norm_tokens(name) | norm_tokens(' '.join(brands))
        overlap = len(want & have)
        if overlap >= max(2, len(want) // 3) and (best is None or overlap > best[0]):
            best = (overlap, img)
    if best:
        return best[1].replace('.400.jpg', '.full.jpg'), 'Open Food Facts contributors (ODbL/CC-BY-SA)'
    return None


def commons_search(bottle):
    """Wikimedia Commons file search; returns (image_url, credit) or None."""
    q = urllib.parse.quote(f"{bottle['name']} bottle")
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           f'&generator=search&gsrsearch={q}&gsrnamespace=6&gsrlimit=8'
           '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=800')
    try:
        data = fetch_json(url)
    except Exception:
        return None
    pages = (data.get('query') or {}).get('pages') or {}
    want = norm_tokens(bottle['name'])
    best = None
    for p in pages.values():
        info = (p.get('imageinfo') or [None])[0]
        if not info:
            continue
        title = p.get('title', '')
        if not re.search(r'\.(jpe?g|png)$', title, re.I):
            continue
        have = norm_tokens(title)
        overlap = len(want & have)
        h, w = info.get('height', 1), info.get('width', 1)
        portraitish = h >= w * 0.8  # bottles are tall; avoid wide bar-scene shots
        if overlap >= 2 and portraitish:
            meta = info.get('extmetadata') or {}
            lic = (meta.get('LicenseShortName') or {}).get('value', 'See Commons')
            artist = re.sub(r'<[^>]+>', '', (meta.get('Artist') or {}).get('value', '')).strip()
            score = overlap + (1 if h > 500 else 0)
            if best is None or score > best[0]:
                best = (score, info.get('thumburl') or info['url'],
                        f'{artist or "Wikimedia Commons"} ({lic})')
    if best:
        return best[1], best[2]
    return None


def wikipedia_image(bottle):
    """Wikipedia lead image via REST summary; returns (image_url, credit) or None.
    Brand articles often carry a bottle photo; logos get culled at eyeball time."""
    for title in [bottle['name'], bottle.get('shortName'), bottle.get('brand')]:
        if not title:
            continue
        url = ('https://en.wikipedia.org/api/rest_v1/page/summary/'
               + urllib.parse.quote(title.replace(' ', '_')) + '?redirect=true')
        try:
            d = fetch_json(url)
        except Exception:
            continue
        img = (d.get('originalimage') or d.get('thumbnail') or {}).get('source')
        if d.get('type') == 'standard' and img and re.search(r'\.(jpe?g|png)', img, re.I):
            return img, f"Wikipedia — {d.get('title', title)} (see article for license)"
    return None


def save_image(bottle_id, raw):
    img = Image.open(io.BytesIO(raw))
    img.load()
    has_alpha = img.mode in ('RGBA', 'LA') and img.getextrema()[-1][0] < 255
    if img.height > MAX_H:
        img = img.resize((round(img.width * MAX_H / img.height), MAX_H), Image.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if has_alpha:
        path = OUT_DIR / f'{bottle_id}.png'
        img.save(path, 'PNG', optimize=True)
    else:
        path = OUT_DIR / f'{bottle_id}.jpg'
        img.convert('RGB').save(path, 'JPEG', quality=82, optimize=True, progressive=True)
    return path, img.width, img.height


def main():
    refresh = '--refresh' in sys.argv
    allow_off = '--allow-off' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('-')]
    bottles = json.loads((ROOT / 'data' / 'bottles.json').read_text())
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

    hits = misses = skipped = 0
    for b in bottles:
        bid = b['id']
        if only and bid not in only:
            continue
        if bid in manifest and not refresh and bid not in overrides:
            skipped += 1
            continue
        found = None
        if bid in overrides and overrides[bid]:
            found = (overrides[bid], 'Manual curation — see source site', 'manual')
        else:
            r = commons_search(b)
            if r:
                found = (r[0], r[1], 'commons')
            if not found:
                r = wikipedia_image(b)
                if r:
                    found = (r[0], r[1], 'wikipedia')
            if not found and allow_off:
                r = off_search(b)
                if r:
                    found = (r[0], r[1], 'off')
        if not found:
            misses += 1
            print(f'  MISS {bid}')
            continue
        url, credit, source = found
        try:
            path, w, h = save_image(bid, fetch_bytes(url))
            manifest[bid] = {'file': f'assets/bottles/{path.name}', 'w': w, 'h': h,
                             'source': source, 'credit': credit, 'url': url}
            hits += 1
            print(f'  OK   {bid}  ({source}, {w}x{h})')
        except Exception as e:
            misses += 1
            print(f'  FAIL {bid}: {e}')
        time.sleep(0.6)  # be polite to the APIs

    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False, sort_keys=True) + '\n')
    print(f'\n{hits} fetched, {misses} missing, {skipped} already present '
          f'→ {len(manifest)}/{len(bottles)} bottles have photos.')


if __name__ == '__main__':
    main()
