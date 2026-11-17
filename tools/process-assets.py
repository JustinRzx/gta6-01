#!/usr/bin/env python3
"""Turn the raw art and music into the files the game loads.

Runs with Pillow (no numpy): /root/.venvs/scrapling/bin/python3 tools/process-assets.py

Inputs (raw/):
  asset-1.jpg  two cars side by side, both facing left -> two sprites
  asset-3.jpg  seamless asphalt road tile            -> game/assets/road.png  (512x512)
  asset-5.jpg  seamless pavement tile               -> game/assets/pavement.png (512x512)
  asset-6.jpg  4x4 sheet of pedestrians             -> 16 sprites (up/right/down/left columns)
  music-1.mp3  chase loop                           -> game/music/chase-pursuit-protocol.mp3
  music-2.mp3  city loop                            -> game/music/city-sunny-loop.mp3

asset-4.jpg is a side-view turn-around and is deliberately left out of the game.

The JPEGs have no alpha: they were drawn on white. We flood-fill the near-white pixels
connected to the border and clear only those, so white inside a sprite (glass, highlights)
survives, then trim each sprite to its own content.
"""
import os
import shutil
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, 'raw')
GAME = os.path.join(ROOT, 'game')
ASSETS = os.path.join(GAME, 'assets')
SPRITES = os.path.join(ASSETS, 'sprites')
MUSIC = os.path.join(GAME, 'music')

# Background pixels are near-white; the flood fill clears everything within this per-channel
# tolerance of the corner colour that is connected to the border.
BG_THRESH = 20
FILL = (255, 0, 255, 255)  # magic key colour, replaced by transparent afterwards


def clear_background(im):
    """Return an RGBA copy with the near-white border region made transparent."""
    rgba = im.convert('RGBA')
    # Flood from the four corners (and a few extra border points so any corner JPEG noise does not
    # leave a whole edge unflooded): only near-white pixels connected to the border are cleared.
    w, h = rgba.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2)]
    for xy in seeds:
        ImageDraw.floodfill(rgba, xy, FILL, thresh=BG_THRESH)
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            if px[x, y][:3] == FILL[:3]:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def trim_to_content(im, pad=6):
    """Crop to the non-transparent bounding box plus a little padding."""
    bbox = im.getbbox()
    if bbox is None:
        return im
    left, top, right, bottom = bbox
    w, h = im.size
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(w, right + pad)
    bottom = min(h, bottom + pad)
    return im.crop((left, top, right, bottom))


def downscale_to(im, max_dim):
    """Shrink so the longest side is max_dim, keeping aspect; enough for how small it is drawn."""
    w, h = im.size
    longest = max(w, h)
    if longest <= max_dim:
        return im
    scale = max_dim / longest
    return im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def save_spritesheet_slices(sheet_path, cols, rows, name_fn):
    im = Image.open(sheet_path).convert('RGB')
    w, h = im.size
    cw, ch = w // cols, h // rows
    out = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            cleared = clear_background(cell)
            trimmed = downscale_to(trim_to_content(cleared), 128)
            path = os.path.join(SPRITES, name_fn(r, c))
            trimmed.save(path)
            out.append((name_fn(r, c), trimmed.size))
    return out


def main():
    os.makedirs(SPRITES, exist_ok=True)
    os.makedirs(MUSIC, exist_ok=True)

    # --- the two cars -----------------------------------------------------
    cars = Image.open(os.path.join(RAW, 'asset-1.jpg')).convert('RGB')
    w, h = cars.size
    sedan = clear_background(cars.crop((0, 0, w // 2, h)))
    police = clear_background(cars.crop((w // 2, 0, w, h)))
    sedan_sprite = downscale_to(trim_to_content(sedan), 384)
    police_sprite = downscale_to(trim_to_content(police), 384)
    sedan_sprite.save(os.path.join(SPRITES, 'car-sedan.png'))
    police_sprite.save(os.path.join(SPRITES, 'car-police.png'))

    # --- the two tiles ----------------------------------------------------
    road = Image.open(os.path.join(RAW, 'asset-3.jpg')).convert('RGB')
    pavement = Image.open(os.path.join(RAW, 'asset-5.jpg')).convert('RGB')
    road.resize((512, 512), Image.LANCZOS).save(os.path.join(ASSETS, 'road.png'))
    pavement.resize((512, 512), Image.LANCZOS).save(os.path.join(ASSETS, 'pavement.png'))

    # --- the sixteen pedestrians ------------------------------------------
    # Columns are up, right, down, left; rows are four different people.
    dirs = ['up', 'right', 'down', 'left']
    peds = save_spritesheet_slices(
        os.path.join(RAW, 'asset-6.jpg'), 4, 4,
        lambda r, c: 'ped-%d-%s.png' % (r, dirs[c]),
    )

    # --- the music --------------------------------------------------------
    shutil.copyfile(os.path.join(RAW, 'music-1.mp3'), os.path.join(MUSIC, 'chase-pursuit-protocol.mp3'))
    shutil.copyfile(os.path.join(RAW, 'music-2.mp3'), os.path.join(MUSIC, 'city-sunny-loop.mp3'))

    print('car-sedan.png', sedan_sprite.size)
    print('car-police.png', police_sprite.size)
    print('road.png 512x512, pavement.png 512x512')
    for name, size in peds:
        print(name, size)


if __name__ == '__main__':
    main()
