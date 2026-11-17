#!/usr/bin/env python3
"""Turn raw/ art and music into the files the game loads under game/.

The sprite sheets (cars, pedestrians) were drawn on white and stored as JPEG, so
they have no alpha. This script flood-fills from the border, clearing only the
near-white pixels connected to it (white inside a sprite -- glass, a police
door -- survives), then slices and trims each sprite to its own content.

The two tiles are full-bleed and only need downscaling; the music is copied and
renamed. asset-4 (a side-view turn-around) is wrong for a top-down game and is
deliberately ignored.
"""

import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
GAME = os.path.join(ROOT, "game")
SPRITES = os.path.join(GAME, "assets", "sprites")
TILES = os.path.join(GAME, "assets")
MUSIC = os.path.join(GAME, "music")

TILE_SIZE = 512


def near_white(pixel):
    """True for the neutral, near-white paper background the sprites were drawn on.

    Deliberately tight and neutral-only so that off-white sprite content (the
    police cruiser's cream door panels, a pale sedan's body) survives untouched.
    """
    r, g, b = pixel[0], pixel[1], pixel[2]
    return r >= 245 and g >= 245 and b >= 245 and max(r, g, b) - min(r, g, b) <= 10


def clear_background(rgba):
    """Flood-fill from every border pixel, clearing near-white pixels connected to it.

    Returns the same image with those pixels set to fully transparent.
    """
    width, height = rgba.size
    pixels = rgba.load()
    seen = bytearray(width * height)
    stack = []

    def seed(x, y):
        idx = y * width + x
        if not seen[idx] and near_white(pixels[x, y]):
            seen[idx] = 1
            stack.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    while stack:
        x, y = stack.pop()
        pixels[x, y] = (0, 0, 0, 0)
        if x > 0:
            nx = x - 1
            idx = y * width + nx
            if not seen[idx] and near_white(pixels[nx, y]):
                seen[idx] = 1
                stack.append((nx, y))
        if x < width - 1:
            nx = x + 1
            idx = y * width + nx
            if not seen[idx] and near_white(pixels[nx, y]):
                seen[idx] = 1
                stack.append((nx, y))
        if y > 0:
            ny = y - 1
            idx = ny * width + x
            if not seen[idx] and near_white(pixels[x, ny]):
                seen[idx] = 1
                stack.append((x, ny))
        if y < height - 1:
            ny = y + 1
            idx = ny * width + x
            if not seen[idx] and near_white(pixels[x, ny]):
                seen[idx] = 1
                stack.append((x, ny))

    return rgba


def defringe(image):
    """Fade the 1px halo the JPEG left where a sprite meets the white paper.

    Only neutral, bright pixels that touch a transparent pixel are treated as
    fringe; saturated sprite colours (a pale sedan's body, the cruiser's cream
    door panels) and white content inside a sprite are left alone. At the game's
    downscale this halo would otherwise read as a pale outline.
    """
    width, height = image.size
    pixels = image.load()
    # First pass: find the opaque pixels that border transparency.
    fringe = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            if pixels[x, y][3] == 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < width and 0 <= yy < height and pixels[xx, yy][3] == 0:
                    fringe[y * width + x] = 1
                    break
    # Second pass: fade neutral, bright fringe pixels toward transparency.
    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if not fringe[idx]:
                continue
            r, g, b, a = pixels[x, y]
            if max(r, g, b) - min(r, g, b) > 24:
                continue
            brightness = (r + g + b) // 3
            if brightness < 200:
                continue
            # 255 -> fully transparent, 200 -> unchanged.
            keep = (brightness - 200) / 55.0
            pixels[x, y] = (r, g, b, int(a * (1.0 - keep)))
    return image


def trim_to_content(image):
    """Crop away fully-transparent rows and columns around a sprite."""
    bbox = image.getbbox()
    if bbox is None:
        return image
    return image.crop(bbox)


def slice_cars():
    image = Image.open(os.path.join(RAW, "asset-1.jpg")).convert("RGBA")
    clear_background(image)
    defringe(image)
    width, _ = image.size
    # Two cars side by side, drawn facing left, with white space between them.
    half = width // 2
    sedan = trim_to_content(image.crop((0, 0, half, image.size[1])))
    police = trim_to_content(image.crop((half, 0, width, image.size[1])))
    sedan.save(os.path.join(SPRITES, "car-sedan.png"))
    police.save(os.path.join(SPRITES, "car-police.png"))
    return sedan.size, police.size


def slice_pedestrians():
    image = Image.open(os.path.join(RAW, "asset-6.jpg")).convert("RGBA")
    clear_background(image)
    defringe(image)
    width, height = image.size
    cell = width // 4  # 4x4 sheet: four people (rows), four orientations (columns)
    # Columns are up, right, down, left in that order; rows are four people.
    dirs = ("up", "right", "down", "left")
    sizes = []
    for person in range(4):
        for col, facing in enumerate(dirs):
            left = col * cell
            top = person * cell
            sprite = trim_to_content(image.crop((left, top, left + cell, top + cell)))
            name = "ped-%d-%s.png" % (person, facing)
            sprite.save(os.path.join(SPRITES, name))
            sizes.append(sprite.size)
    return sizes


def downscale_tile(source, target):
    image = Image.open(os.path.join(RAW, source)).convert("RGB")
    image = image.resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)
    image.save(os.path.join(TILES, target), optimize=True)


def main():
    os.makedirs(SPRITES, exist_ok=True)
    os.makedirs(MUSIC, exist_ok=True)

    sedan_size, police_size = slice_cars()
    ped_sizes = slice_pedestrians()

    downscale_tile("asset-3.jpg", "road.png")
    downscale_tile("asset-5.jpg", "pavement.png")

    # music-1 is the chase loop, music-2 the calm city loop; music-3 (an earlier
    # chase take) is optional and skipped.
    shutil.copyfile(os.path.join(RAW, "music-1.mp3"), os.path.join(MUSIC, "chase-pursuit-protocol.mp3"))
    shutil.copyfile(os.path.join(RAW, "music-2.mp3"), os.path.join(MUSIC, "city-sunny-loop.mp3"))

    print("car-sedan.png", sedan_size)
    print("car-police.png", police_size)
    for name, size in zip(
        ("ped-%d-%s" % (p, d) for p in range(4) for d in ("up", "right", "down", "left")),
        ped_sizes,
    ):
        print("%s.png" % name, size)
    print("road.png", TILE_SIZE, TILE_SIZE)
    print("pavement.png", TILE_SIZE, TILE_SIZE)
    print("chase-pursuit-protocol.mp3", os.path.getsize(os.path.join(MUSIC, "chase-pursuit-protocol.mp3")))
    print("city-sunny-loop.mp3", os.path.getsize(os.path.join(MUSIC, "city-sunny-loop.mp3")))


if __name__ == "__main__":
    main()
