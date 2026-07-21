#!/usr/bin/env python3
"""DrinkCogs data pipeline: merge shard files and validate the whole database.

  data/bottles/*.json    -> data/bottles.json    (compact, what the app loads)
  data/producers/*.json  -> data/producers.json

Run after any data edit:  python3 scripts/build_data.py
Exits non-zero on errors; warnings don't block.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

KEBAB = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')

CATEGORIES = {
    'whiskey': {'bourbon', 'rye', 'american', 'scotch', 'irish', 'japanese', 'canadian', 'world'},
    'rum': set(), 'gin': set(),
    'vodka': {'aquavit'},
    'agave': {'tequila', 'mezcal'},
    'brandy': {'cognac', 'armagnac', 'calvados', 'other'},
    'liqueur': {'herbal', 'amaro', 'orange', 'floral', 'cherry', 'coffee', 'anise', 'other'},
    'wine': {'red', 'white', 'rose', 'champagne', 'sparkling', 'fortified'},
    'beer': {'lager', 'pale-ale', 'ipa', 'stout-porter', 'belgian-trappist', 'sour-wild', 'other'},
    'sake': set(), 'soju': set(), 'cider': set(), 'rtd': set(),
}
AVAILABILITY = {'widely-available', 'seasonal', 'allocated', 'limited', 'rare', 'discontinued'}
SHAPES = {'whiskey', 'square', 'decanter', 'wine-bordeaux', 'wine-burgundy', 'champagne',
          'apothecary', 'tall', 'cognac', 'beer', 'belgian', 'sake', 'can'}
FLAVOR_KEYS = ['sweetness', 'oak', 'smoke', 'fruit', 'vanilla', 'chocolate', 'coffee', 'nut',
               'herbal', 'earthy', 'spice', 'pepper', 'caramel', 'honey', 'leather', 'citrus',
               'floral', 'body', 'finish', 'complexity']
PRODUCER_TYPES = {'distillery', 'brewery', 'winery', 'producer', 'blender', 'brand'}
TIMELINE_TYPES = {'release', 'change', 'award', 'discontinued', 'reintroduced', 'milestone', 'packaging'}

BOTTLE_REQUIRED = ['id', 'name', 'shortName', 'brand', 'producerId', 'category', 'countryId',
                   'abv', 'sizeMl', 'availability', 'color', 'shape', 'description', 'flavor']

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def load(path):
    with open(path) as fh:
        return json.load(fh)


def merge_shards(folder):
    items, seen_files = [], []
    for path in sorted(glob.glob(os.path.join(DATA, folder, '*.json'))):
        seen_files.append(os.path.basename(path))
        try:
            arr = load(path)
        except json.JSONDecodeError as e:
            err(f'{folder}/{os.path.basename(path)}: invalid JSON — {e}')
            continue
        if not isinstance(arr, list):
            err(f'{folder}/{os.path.basename(path)}: expected a JSON array')
            continue
        items.extend(arr)
    return items, seen_files


def main():
    bottles, bfiles = merge_shards('bottles')
    producers, pfiles = merge_shards('producers')
    countries = load(os.path.join(DATA, 'countries.json'))
    regions = load(os.path.join(DATA, 'regions.json'))
    categories = load(os.path.join(DATA, 'categories.json'))
    cocktails = load(os.path.join(DATA, 'cocktails.json'))
    flavors = load(os.path.join(DATA, 'flavors.json'))

    country_ids = {c['id'] for c in countries}
    region_ids = {r['id'] for r in regions}
    region_by_id = {r['id']: r for r in regions}
    cocktail_ids = {c['id'] for c in cocktails}
    producer_ids = {p['id'] for p in producers}
    bottle_ids = [b.get('id') for b in bottles]
    bottle_id_set = set(bottle_ids)

    # ---- bottles ----
    seen = set()
    for b in bottles:
        bid = b.get('id', '<missing id>')
        tag = f'bottle {bid}'
        if bid in seen:
            err(f'{tag}: duplicate id')
        seen.add(bid)
        if not KEBAB.match(str(bid)):
            err(f'{tag}: id not kebab-case')
        for k in BOTTLE_REQUIRED:
            if b.get(k) in (None, '', []) and k not in ('abv',):
                if k == 'flavor' or b.get(k) is None:
                    err(f'{tag}: missing required field "{k}"')
        cat = b.get('category')
        if cat not in CATEGORIES:
            err(f'{tag}: unknown category "{cat}"')
        else:
            sub = b.get('subcategory')
            if sub is not None and CATEGORIES[cat] and sub not in CATEGORIES[cat]:
                err(f'{tag}: unknown subcategory "{sub}" for {cat}')
        if b.get('producerId') not in producer_ids:
            err(f'{tag}: unknown producerId "{b.get("producerId")}"')
        if b.get('countryId') not in country_ids:
            err(f'{tag}: unknown countryId "{b.get("countryId")}"')
        rid = b.get('regionId')
        if rid is not None:
            if rid not in region_ids:
                err(f'{tag}: unknown regionId "{rid}"')
            elif region_by_id[rid]['countryId'] != b.get('countryId'):
                warn(f'{tag}: region {rid} is not in country {b.get("countryId")}')
        if b.get('availability') not in AVAILABILITY:
            err(f'{tag}: bad availability "{b.get("availability")}"')
        if b.get('shape') not in SHAPES:
            err(f'{tag}: bad shape "{b.get("shape")}"')
        fl = b.get('flavor') or {}
        missing = [k for k in FLAVOR_KEYS if k not in fl]
        if missing:
            err(f'{tag}: flavor missing keys {missing}')
        for k, v in fl.items():
            if k not in FLAVOR_KEYS:
                warn(f'{tag}: unknown flavor key "{k}"')
            elif not isinstance(v, int) or not (0 <= v <= 10):
                err(f'{tag}: flavor.{k} must be int 0–10 (got {v!r})')
        abv, proof = b.get('abv'), b.get('proof')
        if abv is not None and proof is not None and abs(proof - abv * 2) > 1.01:
            warn(f'{tag}: proof {proof} ≠ abv×2 ({abv * 2})')
        if abv is not None and not (0 < abv <= 80):
            warn(f'{tag}: suspicious abv {abv}')
        for rel in b.get('relatedIds') or []:
            if rel not in bottle_id_set:
                err(f'{tag}: relatedIds references unknown bottle "{rel}"')
        for cid in b.get('cocktailIds') or []:
            if cid not in cocktail_ids:
                err(f'{tag}: cocktailIds references unknown cocktail "{cid}"')
        for t in b.get('timeline') or []:
            if t.get('type') not in TIMELINE_TYPES:
                warn(f'{tag}: timeline type "{t.get("type")}" not standard')
        mb = b.get('mashBill')
        if mb:
            total = sum(mb.values())
            if not (95 <= total <= 105):
                warn(f'{tag}: mashBill sums to {total}')
        if not re.match(r'^#[0-9a-fA-F]{6}$', str(b.get('color') or '')):
            err(f'{tag}: color must be #rrggbb')
        gc = b.get('glassColor')
        if gc is not None and not re.match(r'^#[0-9a-fA-F]{6}$', str(gc)):
            err(f'{tag}: glassColor must be #rrggbb or null')

    # ---- producers ----
    pseen = set()
    for p in producers:
        pid = p.get('id', '<missing id>')
        tag = f'producer {pid}'
        if pid in pseen:
            err(f'{tag}: duplicate id')
        pseen.add(pid)
        if p.get('type') not in PRODUCER_TYPES:
            err(f'{tag}: bad type "{p.get("type")}"')
        if p.get('countryId') not in country_ids:
            err(f'{tag}: unknown countryId "{p.get("countryId")}"')
        rid = p.get('regionId')
        if rid is not None and rid not in region_ids:
            err(f'{tag}: unknown regionId "{rid}"')
        for sid in p.get('signatureBottleIds') or []:
            if sid not in bottle_id_set:
                err(f'{tag}: signatureBottleIds references unknown bottle "{sid}"')

    orphans = [pid for pid in producer_ids if not any(b.get('producerId') == pid for b in bottles)]
    for o in orphans:
        warn(f'producer {o}: has no bottles')

    # ---- cocktails ----
    for c in cocktails:
        for sid in c.get('suitedBottleIds') or []:
            if sid not in bottle_id_set:
                err(f'cocktail {c.get("id")}: suitedBottleIds references unknown bottle "{sid}"')

    # ---- categories ----
    for c in categories:
        if c.get('category') not in CATEGORIES:
            err(f'category {c.get("id")}: unknown category "{c.get("category")}"')

    # ---- report ----
    print(f'Merged {len(bottles)} bottles from {len(bfiles)} files; {len(producers)} producers from {len(pfiles)} files.')
    print(f'Reference data: {len(countries)} countries, {len(regions)} regions, {len(categories)} category pages, '
          f'{len(cocktails)} cocktails, {len(flavors)} flavor dims.')
    for w in warnings:
        print(f'  WARN  {w}')
    for e in errors:
        print(f'  ERROR {e}')
    print(f'{len(errors)} errors, {len(warnings)} warnings.')

    if errors:
        print('NOT writing combined files — fix errors first.')
        sys.exit(1)

    with open(os.path.join(DATA, 'bottles.json'), 'w') as fh:
        json.dump(bottles, fh, separators=(',', ':'), ensure_ascii=False)
    with open(os.path.join(DATA, 'producers.json'), 'w') as fh:
        json.dump(producers, fh, separators=(',', ':'), ensure_ascii=False)
    b_kb = os.path.getsize(os.path.join(DATA, 'bottles.json')) / 1024
    p_kb = os.path.getsize(os.path.join(DATA, 'producers.json')) / 1024
    print(f'Wrote data/bottles.json ({b_kb:.0f} KB) and data/producers.json ({p_kb:.0f} KB).')


if __name__ == '__main__':
    main()
