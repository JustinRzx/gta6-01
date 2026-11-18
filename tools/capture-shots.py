#!/usr/bin/env python3
"""Capture the four ?shot=... scenes at 1280x720 into screenshots/ (JPEG, under
256 KiB each) by loading each page in headless Chromium and waiting for the game
to set window.__shotReady.  Run with the scrapling venv (it has Playwright):

    /root/.venvs/scrapling/bin/python3 tools/capture-shots.py
"""

import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:8899/index.html"
SHOTS = json.load(open(os.path.join(ROOT, "shots.json")))
OUT = os.path.join(ROOT, "screenshots")

MAX_BYTES = 256 * 1024


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        errors = []
        page.on("console", lambda m: errors.append(f"[console.{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))

        for entry in SHOTS:
            errors.clear()
            url = BASE + entry["query"]
            page.goto(url, wait_until="load")
            try:
                page.wait_for_function("window.__shotReady === true", timeout=20000)
            except Exception as e:
                print(f"{entry['name']}: TIMEOUT waiting for shotReady ({e})")
            if errors:
                print(f"{entry['name']} console errors:")
                for e in errors:
                    print("   ", e)
            path = os.path.join(OUT, entry["name"])
            quality = 82
            while True:
                page.screenshot(path=path, type="jpeg", quality=quality)
                size = os.path.getsize(path)
                if size <= MAX_BYTES or quality <= 45:
                    break
                quality -= 8
            print(f"{entry['name']}: {size} bytes (quality {quality})")

        browser.close()


if __name__ == "__main__":
    main()
