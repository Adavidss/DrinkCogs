#!/usr/bin/env python3
"""Generate DrinkCogs PNG icons (cog ring + bottle on amber) with Pillow.

Outputs into assets/icons/:
  icon-512.png, icon-192.png, icon-maskable-512.png, apple-touch-icon.png (180)
Run:  python3 scripts/make_icons.py
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'icons')

INK = (255, 247, 236, 255)          # warm white
GRAD_TOP = (192, 122, 40)
GRAD_BOT = (122, 67, 14)

SS = 4  # supersampling factor


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_rect_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def gradient_bg(size):
    img = Image.new('RGBA', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(GRAD_TOP, GRAD_BOT, y / size) + (255,))
    return img


def rot(px, py, cx, cy, deg):
    r = math.radians(deg)
    dx, dy = px - cx, py - cy
    return (cx + dx * math.cos(r) - dy * math.sin(r),
            cy + dx * math.sin(r) + dy * math.cos(r))


def draw_mark(d, cx, cy, scale):
    """Draw cog + bottle centered at (cx, cy); scale 1.0 == 64px design grid."""
    def S(v):
        return v * scale

    # cog teeth: rounded rects rotated around center (design grid: x 29.2 y 3.4 w 5.6 h 8.6)
    for ang in range(0, 360, 45):
        # tooth as polygon (approximate rounded ends with a plain rect at supersampled res)
        x0, y0, x1, y1 = 29.2, 3.4, 34.8, 12.0
        pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        pts = [rot(cx + S(p[0] - 32), cy + S(p[1] - 32), cx, cy, ang) for p in pts]
        d.polygon(pts, fill=INK)

    # ring
    r_out = S(22.6 + 2.3)
    r_in = S(22.6 - 2.3)
    d.ellipse([cx - r_out, cy - r_out, cx + r_out, cy + r_out], fill=INK)
    # punch the middle back out with background-ish transparency: draw later — instead draw inner ellipse with bg
    return r_in


def compose(size, maskable=False, rounded=True):
    ss = size * SS
    img = gradient_bg(ss)

    d = ImageDraw.Draw(img)
    cx = cy = ss / 2
    scale = (ss / 64) * (0.66 if maskable else 1.0)

    r_in = draw_mark(d, cx, cy, scale)

    # re-fill ring interior with the gradient (so ring reads as a stroke)
    interior = gradient_bg(ss)
    mask = Image.new('L', (ss, ss), 0)
    ImageDraw.Draw(mask).ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], fill=255)
    img.paste(interior, (0, 0), mask)

    # bottle (design grid coords, centered at 32)
    def P(x, y):
        return (cx + (x - 32) * scale, cy + (y - 32) * scale)

    d2 = ImageDraw.Draw(img)

    def rr(x0, y0, x1, y1, rad):
        d2.rounded_rectangle([P(x0, y0), P(x1, y1)], radius=rad * scale, fill=INK)

    rr(29.1, 18.6, 34.9, 26.4, 1.0)                        # neck
    d2.polygon([P(29.1, 24.6), P(24.2, 31.9), P(39.8, 31.9), P(34.9, 24.6)], fill=INK)  # shoulders
    rr(24.2, 28.4, 39.8, 45.9, 3.0)                        # body

    if rounded and not maskable:
        m = rounded_rect_mask(ss, int(ss * 14.5 / 64))
        img.putalpha(m)

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path, 'PNG')
    print(f'  wrote {name} ({img.size[0]}×{img.size[1]})')


def main():
    os.makedirs(OUT, exist_ok=True)
    save(compose(512), 'icon-512.png')
    save(compose(192), 'icon-192.png')
    save(compose(512, maskable=True, rounded=False), 'icon-maskable-512.png')
    save(compose(180, rounded=False), 'apple-touch-icon.png')
    print('Done.')


if __name__ == '__main__':
    main()
