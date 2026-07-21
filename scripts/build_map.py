#!/usr/bin/env python3
"""Build data/world-map.json from a public-domain world GeoJSON (Natural Earth derived).

Projects country outlines to a 1000×500 equirectangular canvas, simplifies them,
and writes compact SVG path strings plus per-country bounding boxes.

Usage:
  python3 scripts/build_map.py [path/to/countries.geo.json]
If no local file is given, reads scripts/countries.geo.json (downloaded separately).
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1000.0, 500.0

# Countries that must never be dropped by simplification (small but needed).
KEEP = {'BRB', 'JAM', 'ISL', 'BEL', 'IRL', 'TWN', 'NZL', 'PRT', 'GUY', 'KOR', 'GBR', 'NLD', 'CHE', 'DNK'}

MIN_RING_AREA = 5.0      # px² — drop specks
MIN_POINT_DIST = 1.1     # px — thin dense outlines


def project(lng, lat):
    return ((lng + 180.0) / 360.0 * W, (90.0 - lat) / 180.0 * H)


def ring_area(pts):
    a = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def thin(pts):
    out = [pts[0]]
    for p in pts[1:]:
        dx, dy = p[0] - out[-1][0], p[1] - out[-1][1]
        if dx * dx + dy * dy >= MIN_POINT_DIST ** 2:
            out.append(p)
    return out


def ring_to_path(pts):
    pts = thin(pts)
    if len(pts) < 4:
        return None
    def f(v):
        s = f'{v:.1f}'
        return s[:-2] if s.endswith('.0') else s
    d = f'M{f(pts[0][0])} {f(pts[0][1])}'
    for x, y in pts[1:]:
        d += f'L{f(x)} {f(y)}'
    return d + 'Z'


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'scripts', 'countries.geo.json')
    with open(src) as fh:
        geo = json.load(fh)

    countries = []
    for feat in geo['features']:
        props = feat.get('properties', {})
        iso3 = feat.get('id') or props.get('ISO_A3') or props.get('iso_a3') or ''
        name = props.get('name') or props.get('NAME') or iso3
        geom = feat.get('geometry') or {}
        polys = []
        if geom.get('type') == 'Polygon':
            polys = [geom['coordinates']]
        elif geom.get('type') == 'MultiPolygon':
            polys = geom['coordinates']
        else:
            continue

        keep_all = iso3 in KEEP
        paths = []
        bbox = [1e9, 1e9, -1e9, -1e9]
        for poly in polys:
            outer = poly[0]  # ignore holes at this scale
            pts = [project(lng, lat) for lng, lat, *rest in outer]
            area = ring_area(pts)
            if area < MIN_RING_AREA and not (keep_all and area >= 0.4):
                continue
            d = ring_to_path(pts)
            if not d:
                # tiny but must-keep: render a small diamond at centroid
                if keep_all:
                    cx = sum(p[0] for p in pts) / len(pts)
                    cy = sum(p[1] for p in pts) / len(pts)
                    d = f'M{cx:.1f} {cy - 1.6:.1f}L{cx + 1.6:.1f} {cy:.1f}L{cx:.1f} {cy + 1.6:.1f}L{cx - 1.6:.1f} {cy:.1f}Z'
                else:
                    continue
            paths.append(d)
            for x, y in pts:
                bbox[0] = min(bbox[0], x); bbox[1] = min(bbox[1], y)
                bbox[2] = max(bbox[2], x); bbox[3] = max(bbox[3], y)

        if not paths:
            continue
        countries.append({
            'iso3': iso3,
            'name': name,
            'd': ''.join(paths),
            'bbox': [round(v, 1) for v in bbox],
        })

    # Synthesize small diamond markers for encyclopedia countries missing from
    # the source (microstates like Barbados get dropped from most world files).
    have = {c['iso3'] for c in countries}
    try:
        with open(os.path.join(ROOT, 'data', 'countries.json')) as fh:
            for c in json.load(fh):
                iso3 = c.get('iso3')
                if not iso3 or iso3 in have:
                    continue
                x, y = project(c['lng'], c['lat'])
                r = 2.2
                countries.append({
                    'iso3': iso3,
                    'name': c['name'],
                    'd': f'M{x:.1f} {y - r:.1f}L{x + r:.1f} {y:.1f}L{x:.1f} {y + r:.1f}L{x - r:.1f} {y:.1f}Z',
                    'bbox': [round(x - r, 1), round(y - r, 1), round(x + r, 1), round(y + r, 1)],
                })
                have.add(iso3)
                print(f'  + synthesized marker for {c["name"]} ({iso3})')
    except FileNotFoundError:
        pass

    out = {'w': W, 'h': H, 'countries': countries}
    dst = os.path.join(ROOT, 'data', 'world-map.json')
    with open(dst, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    size = os.path.getsize(dst) / 1024
    print(f'Wrote {dst}: {len(countries)} countries, {size:.0f} KB')


if __name__ == '__main__':
    main()
