#!/usr/bin/env python3
"""
Screenshot audit for rehanbutt.com.

Captures every page in the sitemap, full height, at mobile and desktop widths,
and builds a viewer for reviewing them: pages grouped by layout, captures
switchable by version, and notes pinned onto the screenshots.

    python3 _tools/screenshot-audit.py                  # capture HEAD, then the data and the page
    python3 _tools/screenshot-audit.py --only /photography/   # recapture just those paths
    python3 _tools/screenshot-audit.py --no-capture     # rebuild the data and the page only

Outputs, all beside this script:
    screenshots/versions/<sha>/   one folder per capture: desktop/, mobile/, manifest.json
    screenshot-audit.json         the dataset
    screenshot-atlas.html         the viewer

Captures are named for the commit the site was built from, so build first:
    bundle exec jekyll build && python3 _tools/screenshot-audit.py

One-time setup, as capture needs a browser:
    pip install playwright pillow && python3 -m playwright install chromium

How a page is shot
------------------
Desktop is 1440 wide at 1x; mobile is 390 wide at 2x with touch, so mobile-only
script behaves as it would on a phone. Each page loads with the Konami easter
egg already unlocked (it adds elements to every page), Math.random seeded so
shuffles repeat between captures, and analytics blocked. The page is scrolled
top to bottom so lazy and scroll-triggered content loads, then shot in 4000px
slices that are joined into one image: a single full-page capture repeats or
truncates past Chromium's ~16k px texture limit, and several pages are taller.

Notes, hidden pages and view settings live in the viewer's browser storage, not
in these files. Export notes from the viewer before moving or deleting it.
"""

import argparse
import functools
import http.server
import io
import json
import pathlib
import re
import subprocess
import sys
import threading
from datetime import datetime, timezone

from cascade import HERE, ROOT, SITE

SHOTS = HERE / "screenshots" / "versions"
TEMPLATE = HERE / "screenshot-atlas.template.html"
CHUNK = 4000
SIZES = {
    "desktop": dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1),
    "mobile": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                   is_mobile=True, has_touch=True),
}
# Runs before any page script: unlock Konami the way the site remembers it, and
# make Math.random repeatable.
INIT_SCRIPT = """
try {
  localStorage.setItem('eggKey', 'true');
  localStorage.setItem('behindTheScenesEasterEgg', '2026-01-01T00:00:00.000Z');
} catch (e) {}
let s = 42;
Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
"""
BLOCKED = re.compile(r"google-analytics\.com|googletagmanager\.com|doubleclick\.net")


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args]).decode().strip()


def slug(path):
    return path.strip("/").replace("/", "__") or "home"


def sitemap_paths():
    xml = (SITE / "sitemap.xml").read_text()
    paths = [m or "/" for m in re.findall(r"<loc>https?://[^/<]+([^<]*)</loc>", xml)]
    return [p for p in paths if not p.endswith(".pdf")]


class SiteHandler(http.server.SimpleHTTPRequestHandler):
    """Serves _site the way GitHub Pages does: /about finds about.html."""

    def translate_path(self, path):
        p = pathlib.Path(super().translate_path(path))
        if not p.exists() and p.with_name(p.name + ".html").exists():
            return str(p.with_name(p.name + ".html"))
        return str(p)

    def log_message(self, *args):
        pass


def serve_site():
    handler = functools.partial(SiteHandler, directory=str(SITE))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}"


def settle(page):
    """Load everything a reader would see by the time they reached the bottom."""
    page.evaluate("document.querySelectorAll('img[loading=\"lazy\"]').forEach(i => i.loading = 'eager')")
    vh = page.viewport_size["height"]
    y = 0
    for _ in range(400):
        if y > page.evaluate("document.scrollingElement.scrollHeight"):
            break
        page.evaluate(f"window.scrollTo(0, {y})")
        page.wait_for_timeout(120)
        y += vh
    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    page.evaluate("""async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(i => !i.complete).map(i =>
        new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 10000); })));
    }""")
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(1500)
    page.evaluate("document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} })")
    page.wait_for_timeout(300)


def shoot_full(page, out):
    """Full-height PNG in CHUNK-tall slices, joined."""
    from PIL import Image
    height = page.evaluate("Math.ceil(Math.max(document.scrollingElement.scrollHeight, document.body.scrollHeight))")
    width = page.viewport_size["width"]
    tiles = []
    for y in range(0, height, CHUNK):
        png = page.screenshot(full_page=True, clip={"x": 0, "y": y, "width": width, "height": min(CHUNK, height - y)})
        tiles.append(Image.open(io.BytesIO(png)).convert("RGB"))
    image = Image.new("RGB", (tiles[0].width, sum(t.height for t in tiles)), "white")
    top = 0
    for t in tiles:
        image.paste(t, (0, top))
        top += t.height
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    return height


def capture(sha, branch, only):
    try:
        from playwright.sync_api import sync_playwright
        import PIL  # noqa: F401
    except ImportError:
        sys.exit("capture needs Playwright and Pillow:\n"
                 "    pip install playwright pillow && python3 -m playwright install chromium")
    if not (SITE / "sitemap.xml").exists():
        sys.exit("no _site/sitemap.xml — run `bundle exec jekyll build` first")

    paths = sitemap_paths()
    if only:
        paths = [p for p in paths if only in p]
    folder = SHOTS / sha
    manifest_path = folder / "manifest.json"
    # --only updates its pages inside an existing capture instead of replacing it.
    previous = json.loads(manifest_path.read_text()) if only and manifest_path.exists() else {}
    entries = {(e["slug"], e["size"]): e for e in previous.get("entries", [])}

    server, base = serve_site()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for size, options in SIZES.items():
                ctx = browser.new_context(**options, color_scheme="light")
                ctx.add_init_script(INIT_SCRIPT)
                ctx.route(BLOCKED, lambda route: route.abort())
                for path in paths:
                    page = ctx.new_page()
                    entry = {"path": path, "slug": slug(path), "size": size}
                    try:
                        res = page.goto(base + path, wait_until="load", timeout=60000)
                        settle(page)
                        entry["status"] = res.status if res else None
                        entry["height"] = shoot_full(page, folder / size / f"{slug(path)}.png")
                        entry["konami"] = page.evaluate("localStorage.getItem('eggKey') === 'true'")
                        print(f"{size:7} {path}  {entry['height']}px")
                    except Exception as e:
                        entry["error"] = str(e)
                        print(f"{size:7} {path}  FAILED: {e}")
                    entries[(entry["slug"], size)] = entry
                    page.close()
                ctx.close()
            browser.close()
    finally:
        server.shutdown()

    manifest = {"sha": sha, "branch": branch, "captured": datetime.now(timezone.utc).isoformat(),
                "entries": list(entries.values())}
    folder.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=1))
    failed = [e for e in manifest["entries"] if e.get("error") or e.get("status") != 200 or not e.get("konami")]
    print(f"\ncaptured {len(paths)} pages × {len(SIZES)} sizes into {folder.relative_to(ROOT)}")
    if failed:
        print(f"check these: {', '.join(e['size'] + ' ' + e['path'] for e in failed)}")


def project_layouts():
    layouts = {}
    for f in (ROOT / "_projects").iterdir():
        if f.suffix not in (".md", ".markdown", ".html"):
            continue
        front = f.read_text().split("---")[1]
        m = re.search(r"^layout:\s*(\S+)", front, re.M)
        layouts["/" + f.stem] = m and m.group(1)
    return layouts


def build(out):
    """The dataset: every capture, and the latest capture's pages grouped for review."""
    versions = []
    for mf in SHOTS.glob("*/manifest.json"):
        manifest = json.loads(mf.read_text())
        sha = mf.parent.name
        subject, date = git("log", "-1", "--format=%s%x1f%cI", sha).split("\x1f")
        versions.append({"sha": sha, "branch": manifest.get("branch"), "subject": subject, "date": date,
                         "entries": manifest["entries"]})
    if not versions:
        sys.exit(f"no captures in {SHOTS.relative_to(ROOT)} — run without --no-capture first")
    versions.sort(key=lambda v: v["date"])

    # Every page any capture has, in the order of the fullest one: an --only
    # capture shouldn't shrink the viewer to its few pages.
    fullest = max(versions, key=lambda v: len(v["entries"]))
    paths = list(dict.fromkeys(e["path"] for v in [fullest, *versions] for e in v["entries"]))
    layouts = project_layouts()
    projects = [p for p in paths if p in layouts]
    photos = [p for p in paths if p.startswith("/photography/")]
    collections = [p for p in paths if p.startswith("/resources/collection/")]
    articles = [p for p in paths if p.startswith("/posts/")]
    main = [p for p in paths if p not in layouts and p not in photos + collections + articles]

    def section(name, pages, prefix="/"):
        return {"name": name, "prefix": prefix, "pages": [slug(p) for p in pages]}

    data = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "image_root": SHOTS.relative_to(HERE).as_posix(),
        "versions": [{k: v[k] for k in ("sha", "branch", "subject", "date")} for v in versions],
        "heights": {v["sha"]: {f"{e['slug']}|{e['size']}": e.get("height") for e in v["entries"] if "height" in e}
                    for v in versions},
        "pages": [{"path": p, "slug": slug(p)} for p in paths],
        # Rows to compare like with like.
        "groups": [
            section("Main pages", main),
            section("Photo pages", photos, "/photography/"),
            section("Projects with hero", [p for p in projects if layouts[p] == "post-hero"]),
            section("Projects without hero", [p for p in projects if layouts[p] != "post-hero"]),
            section("Resource collections", collections, "/resources/collection/"),
        ],
        # Every page once, for the big pairs and the All pages tree.
        "categories": [
            section("Main pages", main),
            section("Articles", articles, "/posts/"),
            section("Projects", sorted(projects)),
            section("Photography", photos, "/photography/"),
            section("Resource collections", collections, "/resources/collection/"),
        ],
    }
    out.write_text(json.dumps(data, indent=1))
    return data


def build_html(json_path, html_path, template=TEMPLATE):
    if not template.exists():
        print(f"no template at {template} — skipping the page")
        return None
    data = json_path.read_text().replace("</script>", "<\\/script>")
    page = template.read_text().replace("__DATA__", data)
    if "__DATA__" in page:
        sys.exit("template still contains __DATA__ after substitution")
    html_path.write_text(page)
    return html_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Screenshot audit for rehanbutt.com")
    ap.add_argument("--out", default=str(HERE / "screenshot-audit.json"))
    ap.add_argument("--html", default=str(HERE / "screenshot-atlas.html"))
    ap.add_argument("--no-capture", action="store_true", help="rebuild the data and the page from existing captures")
    ap.add_argument("--no-html", action="store_true")
    ap.add_argument("--only", help="only capture paths containing this text")
    ap.add_argument("--sha", help="label the capture with this commit instead of HEAD")
    args = ap.parse_args()

    if not args.no_capture:
        sha = args.sha or git("rev-parse", "--short", "HEAD")
        if not args.sha and git("status", "--porcelain", "--untracked-files=no"):
            print(f"note: uncommitted changes are in this capture; it is still labelled {sha}\n")
        capture(sha, git("rev-parse", "--abbrev-ref", "HEAD"), args.only)

    d = build(pathlib.Path(args.out))
    print(f"versions            : {', '.join(v['sha'] for v in d['versions'])}")
    print(f"pages               : {len(d['pages'])}")
    for g in d["groups"]:
        print(f"  {g['name']:<20}: {len(g['pages'])}")
    print(f"\nwrote {args.out}")
    if not args.no_html:
        made = build_html(pathlib.Path(args.out), pathlib.Path(args.html))
        if made:
            print(f"wrote {made}  ({made.stat().st_size:,} bytes)")
