#!/usr/bin/env python3
"""Turn the raw/ art and music into the files game/ loads.

raw/ holds JPEG sprites drawn on white (no transparency) and MP3 music.  This
script gives every sprite a real transparent background (flood-fill the near-white
pixels connected to the border, so white *inside* a sprite survives), slices the
car sheet into two cars and the pedestrian sheet into 16 people, trims each sprite
to its own content, downscales the road and pavement tiles to 512x512 and copies
the music under game/music/.  Run it with the scrapling venv (it has Pillow).

    /root/.venvs/scrapling/bin/python3 tools/process-assets.py
"""

import os
import shutil

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
GAME = os.path.join(ROOT, "game")
SPRITES = os.path.join(GAME, "assets", "sprites")
TILES = os.path.join(GAME, "assets")
MUSIC = os.path.join(GAME, "music")

# A pixel is "near-white" (background) when every channel is at least this.  The
# corners of the sprite sheets are ~254, so 232 clears the page without touching
# anything even faintly tinted inside a sprite.
NEAR_WHITE = 232

# Target sprite sizes in the game.  Cars are drawn ~140px long at the default
# zoom; storing them ~2x that keeps them crisp.  Pedestrians are drawn ~50px
# tall; store ~2x.
CAR_WIDTH = 300
PEDESTRIAN_HEIGHT = 110

# The car sheet splits at the gap between the two cars (columns 1389-1511).
CAR_SPLIT_X = 1450


def near_white_mask(rgba, threshold=NEAR_WHITE):
    """A 1-bit mask (255 = near-white) built from the minimum channel, so a pixel
    is only background when every channel is bright."""
    r, g, b, _ = rgba.split()
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    return mn.point(lambda p: 255 if p >= threshold else 0)


def clear_background(rgba, threshold=NEAR_WHITE):
    """Flood-fill from all four corners: clear only the near-white pixels that are
    connected to the border, leaving white inside a sprite (glass, highlights)."""
    mask = near_white_mask(rgba, threshold)
    w, h = mask.size
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if mask.getpixel(xy) == 255:
            ImageDraw.floodfill(mask, xy, 128, thresh=0)
    is_bg = mask.point(lambda p: 255 if p == 128 else 0)
    r, g, b, a = rgba.split()
    # composite(image1, image2, mask) uses image1 where the mask is 255 and
    # image2 where it is 0, so put the transparent (black) side first.
    new_a = Image.composite(Image.new("L", rgba.size, 0), a, is_bg)
    return Image.merge("RGBA", (r, g, b, new_a))


def defringe(rgba, low=195, radius=1):
    """Fade the pale JPEG halo that survives the flood fill: a near-white pixel
    sitting right next to a transparent one is background bleed, not sprite, so
    clear it.  Runs a couple of passes to eat a 1-2px ring, never reaching white
    that is safely inside the sprite."""
    minch = near_white_mask(rgba, low)
    for _ in range(radius * 2):
        a = rgba.getchannel("A")
        bg = a.point(lambda p: 255 if p == 0 else 0)
        bg = bg.filter(ImageFilter.MaxFilter(3))  # 1px dilation of transparency
        pale = ImageChops.multiply(bg, minch)
        if pale.getextrema()[1] == 0:
            break
        new_a = ImageChops.subtract(a, pale)
        rgba.putalpha(new_a)
    return rgba


def trim(rgba, pad=0):
    """Crop to the sprite's opaque content (plus an optional padding)."""
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        return rgba
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(rgba.size[0], bbox[2] + pad)
    bottom = min(rgba.size[1], bbox[3] + pad)
    return rgba.crop((left, top, right, bottom))


def downscale_rgba(rgba, size):
    """LANCZOS downscale with premultiplied alpha so the transparent background
    does not bleed a pale halo into the sprite's edges."""
    r, g, b, a = rgba.split()
    r = ImageChops.multiply(r, a)
    g = ImageChops.multiply(g, a)
    b = ImageChops.multiply(b, a)
    r = r.resize(size, Image.LANCZOS)
    g = g.resize(size, Image.LANCZOS)
    b = b.resize(size, Image.LANCZOS)
    a = a.resize(size, Image.LANCZOS)
    rp, gp, bp, ap = r.load(), g.load(), b.load(), a.load()
    w, h = size
    for y in range(h):
        for x in range(w):
            av = ap[x, y]
            if av == 0:
                rp[x, y] = gp[x, y] = bp[x, y] = 0
            elif av < 255:
                rp[x, y] = min(255, rp[x, y] * 255 // av)
                gp[x, y] = min(255, gp[x, y] * 255 // av)
                bp[x, y] = min(255, bp[x, y] * 255 // av)
    return Image.merge("RGBA", (r, g, b, a))


def scale_to_width(img, width):
    h = max(1, round(img.size[1] * width / img.size[0]))
    return downscale_rgba(img, (width, h))


def scale_to_height(img, height):
    w = max(1, round(img.size[0] * height / img.size[1]))
    return downscale_rgba(img, (w, height))


def fringe_score(img):
    """How pale the sprite's outer edge is: the highest minimum-channel among
    opaque pixels that touch transparency, 0..255.  We want this low."""
    a = img.getchannel("A")
    transparent = a.point(lambda p: 255 if p == 0 else 0)
    edge = transparent.filter(ImageFilter.MaxFilter(3))  # dilate transparency 1px
    opaque = a.point(lambda p: 255 if p > 128 else 0)
    border = ImageChops.multiply(edge, opaque)  # opaque pixels next to the void
    r, g, b, _ = img.split()
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    masked = ImageChops.multiply(mn, border.point(lambda p: p // 255))
    extrema = masked.getextrema()
    return extrema[1]


def process_cars():
    img = Image.open(os.path.join(RAW, "asset-1.jpg")).convert("RGBA")
    sedan = clear_background(img.crop((0, 0, CAR_SPLIT_X, img.size[1])))
    police = clear_background(img.crop((CAR_SPLIT_X, 0, img.size[0], img.size[1])))
    sedan = defringe(trim(sedan))
    police = defringe(trim(police))
    sedan = scale_to_width(sedan, CAR_WIDTH)
    police = scale_to_width(police, CAR_WIDTH)
    sedan.save(os.path.join(SPRITES, "car-sedan.png"))
    police.save(os.path.join(SPRITES, "car-police.png"))
    return [("car-sedan.png", sedan), ("car-police.png", police)]


def process_pedestrians():
    img = Image.open(os.path.join(RAW, "asset-6.jpg")).convert("RGBA")
    img = clear_background(img)
    w, h = img.size
    cw, ch = w // 4, h // 4
    # Columns are up, right, down, left; rows are four different people.
    dirs = ["up", "right", "down", "left"]
    out = []
    for row in range(4):
        for col in range(4):
            cell = img.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            cell = defringe(trim(cell))
            cell = scale_to_height(cell, PEDESTRIAN_HEIGHT)
            name = f"person-{row}-{dirs[col]}.png"
            cell.save(os.path.join(SPRITES, name))
            out.append((name, cell))
    return out


def process_tiles():
    road = Image.open(os.path.join(RAW, "asset-3.jpg")).convert("RGB")
    pavement = Image.open(os.path.join(RAW, "asset-5.jpg")).convert("RGB")
    road = road.resize((512, 512), Image.LANCZOS)
    pavement = pavement.resize((512, 512), Image.LANCZOS)
    road.save(os.path.join(TILES, "road.png"))
    pavement.save(os.path.join(TILES, "pavement.png"))


def process_music():
    shutil.copyfile(os.path.join(RAW, "music-2.mp3"), os.path.join(MUSIC, "city-sunny-loop.mp3"))
    shutil.copyfile(os.path.join(RAW, "music-1.mp3"), os.path.join(MUSIC, "chase-pursuit-protocol.mp3"))


def main():
    os.makedirs(SPRITES, exist_ok=True)
    os.makedirs(TILES, exist_ok=True)
    os.makedirs(MUSIC, exist_ok=True)

    cars = process_cars()
    people = process_pedestrians()
    process_tiles()
    process_music()

    print("sprites:")
    for name, img in cars + people:
        print(f"  {name}  {img.size}  fringe={fringe_score(img)}")
    print("tiles: road.png, pavement.png (512x512)")
    print("music: city-sunny-loop.mp3, chase-pursuit-protocol.mp3")


if __name__ == "__main__":
    main()
