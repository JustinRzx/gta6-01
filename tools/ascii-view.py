#!/usr/bin/env python3
"""Print a coarse ASCII view of a screenshot so scenes can be inspected in a terminal."""
import sys
from PIL import Image

path = sys.argv[1]
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 110
im = Image.open(path).convert('RGB')
W, H = im.size
rows = max(8, round(cols * H / W * 0.5))
px = im.load()

def classify(r, g, b):
    v = (r + g + b) / 3
    if v < 46: return ' '
    if r > 210 and g > 210 and b > 210: return '#'
    if r > 190 and g > 150 and b < 130: return 'Y'
    if g > 90 and r < 120 and b < 120 and g > b: return 'g'
    if r > 150 and g < 100 and b < 100: return 'R'
    if b > 150 and r < 110 and g < 160: return 'B'
    if v > 150: return '.'
    if v > 100: return '+'
    if v > 68: return '-'
    return ' '

for ry in range(rows):
    out = []
    for cx in range(cols):
        x0 = cx * W // cols
        x1 = (cx + 1) * W // cols
        y0 = ry * H // rows
        y1 = (ry + 1) * H // rows
        rs = gs = bs = n = 0
        for y in range(y0, y1, 2):
            for x in range(x0, x1, 2):
                r, g, b = px[x, y]
                rs += r; gs += g; bs += b; n += 1
        out.append(classify(rs // n, gs // n, bs // n))
    print(''.join(out))
