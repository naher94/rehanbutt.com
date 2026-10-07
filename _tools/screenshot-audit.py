#!/usr/bin/env python3
"""
Screenshot audit for rehanbutt.com.

Captures every page in the sitemap, full height, at mobile, tablet and desktop widths,
and builds a viewer for reviewing them: pages grouped by layout, captures
switchable by version, and notes pinned onto the screenshots.

    python3 _tools/screenshot-audit.py                  # capture HEAD, then the data and the page
    python3 _tools/screenshot-audit.py --only /photography/   # recapture just those paths
    python3 _tools/screenshot-audit.py --no-capture     # rebuild the data and the page only
    python3 _tools/screenshot-audit.py --sizes tablet   # add just one size to HEAD's capture
    python3 _tools/screenshot-audit.py --workers 1      # one page at a time, if parallel runs get flaky
    python3 _tools/screenshot-audit.py --no-capture --sha 37f13b9 --name "Before Scaffold"   # name a version
    python3 _tools/screenshot-audit.py --diffs                      # prepare the atlas's Compare to data (a capture does this too)
    python3 _tools/screenshot-audit.py --diff 3e2102f                         # diff every page against HEAD
    python3 _tools/screenshot-audit.py --diff 3e2102f e2e1364                 # or any two captures

Outputs, all beside this script:
    screenshots/versions/<sha>/   one folder per capture: desktop/, tablet/, mobile/, manifest.json
    screenshot-audit.json         the dataset
    screenshot-atlas.html         the viewer
    screenshots/diffs/<a>..<b>/   with --diff: changed-region overlays for each page that differs
    screenshot-diff.html          with --diff: changed pages ranked by how much moved

Captures are named for the commit the site was built from, so build first:
    bundle exec jekyll build && python3 _tools/screenshot-audit.py

One-time setup, as capture needs a browser:
    pip install playwright pillow && python3 -m playwright install chromium

How a page is shot
------------------
Desktop is 1440 wide at 1x; tablet is 820 wide and mobile 390 wide, both at 2x with touch, so touch-only
script behaves as it would on a phone. Each page loads with the Konami easter
egg already unlocked (it adds elements to every page), Math.random seeded so
shuffles repeat between captures, and analytics blocked. The page is scrolled
top to bottom so lazy and scroll-triggered content loads, then shot in 4000px
slices that are joined into one image: a single full-page capture repeats or
truncates past Chromium's ~16k px texture limit, and several pages are taller.

Most of that is waiting, so pages are shot by several workers at once, each its
own process with its own browser: about 12 minutes one at a time on this site,
a fraction of that with the default 4.

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

from cascade import HERE, ROOT, SITE as DEFAULT_SITE

SITE = DEFAULT_SITE  # --site points this at another build

SHOTS = HERE / "screenshots" / "versions"
TEMPLATE = HERE / "screenshot-atlas.template.html"
DIFFS = HERE / "screenshots" / "diffs"
DIFF_TEMPLATE = HERE / "screenshot-diff.template.html"
CHUNK = 4000
SIZES = {
    "desktop": dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1),
    "mobile": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                   is_mobile=True, has_touch=True),
    # iPad Air portrait; sits in the md band (768-1023), where layouts change.
    "tablet": dict(viewport={"width": 820, "height": 1180}, device_scale_factor=2,
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
STYLED = "[...document.styleSheets].some(s => (s.href || '').endsWith('/css/rehan.css') && s.cssRules.length > 0)"
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
        page = p.with_name(p.name + ".html")
        # /photography is photography.html even though a photography/ folder of
        # gallery pages sits beside it; only a folder with its own index wins.
        if page.exists() and not (p / "index.html").exists():
            return str(page)
        return str(p)

    def log_message(self, *args):
        pass


class SiteServer(http.server.ThreadingHTTPServer):
    # The default backlog of 5 drops connections when several browsers start at
    # once, and a dropped stylesheet shoots the page unstyled.
    request_queue_size = 128
    daemon_threads = True


def serve_site():
    handler = functools.partial(SiteHandler, directory=str(SITE))
    server = SiteServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}"


def settle(page):
    """Load everything a reader would see by the time they reached the bottom."""
    page.evaluate("document.querySelectorAll('img[loading=\"lazy\"]').forEach(i => i.loading = 'eager')")
    vh = page.viewport_size["height"]
    height = lambda: page.evaluate("document.scrollingElement.scrollHeight")
    # Images without set dimensions grow the page as they arrive, so one pass can
    # measure a page that is still loading (it cut four photo pages in half when
    # several browsers started at once). Repeat until a pass leaves the height alone.
    for _ in range(5):
        before = height()
        y = 0
        while y <= height() and y < 400 * vh:
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
        if height() == before:
            break
    # Looping videos would otherwise land on a different frame every capture and
    # read as a change in every diff; park each on its first frame.
    page.evaluate("""async () => {
      await Promise.all([...document.querySelectorAll('video')].map(v => new Promise(done => {
        v.autoplay = false; v.loop = false; v.pause();
        if (v.readyState < 1 || v.currentTime === 0) return done();
        v.onseeked = done; v.currentTime = 0;
        setTimeout(done, 3000);
      })));
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


# Each worker process keeps one browser and one context per size for its whole
# life. Playwright's sync API can't be shared across threads, hence processes.
_worker = {}


def _start_worker(base, folder):
    from multiprocessing.util import Finalize
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    browser = pw.chromium.launch()
    contexts = {}
    for size, options in SIZES.items():
        ctx = browser.new_context(**options, color_scheme="light")
        ctx.add_init_script(INIT_SCRIPT)
        ctx.route(BLOCKED, lambda route: route.abort())
        contexts[size] = ctx
    _worker.update(base=base, folder=folder, contexts=contexts)
    Finalize(None, lambda: (browser.close(), pw.stop()), exitpriority=10)


def _shoot(job):
    size, path = job
    page = _worker["contexts"][size].new_page()
    entry = {"path": path, "slug": slug(path), "size": size}
    try:
        # A page whose stylesheet didn't arrive is reloaded rather than shot.
        for attempt in range(3):
            res = page.goto(_worker["base"] + path, wait_until="load", timeout=60000)
            if page.evaluate(STYLED):
                break
        else:
            raise RuntimeError("rehan.css didn't load after 3 tries")
        settle(page)
        entry["status"] = res.status if res else None
        entry["height"] = shoot_full(page, _worker["folder"] / size / f"{slug(path)}.png")
        entry["konami"] = page.evaluate("localStorage.getItem('eggKey') === 'true'")
    except Exception as e:
        entry["error"] = str(e)
    finally:
        page.close()
    return entry


def capture(sha, branch, only, workers, name=None, sizes=None):
    try:
        import playwright  # noqa: F401
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
    # --only and --sizes update their share of an existing capture instead of replacing it.
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    previous = existing if only or sizes else {}
    entries = {(e["slug"], e["size"]): e for e in previous.get("entries", [])}

    jobs = [(size, path) for size in (sizes or SIZES) for path in paths]
    workers = max(1, min(workers, len(jobs)))
    started = datetime.now(timezone.utc)
    server, base = serve_site()
    try:
        if workers == 1:
            _start_worker(base, folder)
            results = map(_shoot, jobs)
            pool = None
        else:
            import multiprocessing
            pool = multiprocessing.get_context("spawn").Pool(workers, _start_worker, (base, folder))
            results = pool.imap_unordered(_shoot, jobs)
        for n, entry in enumerate(results, 1):
            entries[(entry["slug"], entry["size"])] = entry
            result = f"{entry['height']}px" if "height" in entry else f"FAILED: {entry.get('error')}"
            print(f"[{n:>3}/{len(jobs)}] {entry['size']:7} {entry['path']}  {result}", flush=True)
        if pool:
            pool.close()
            pool.join()
    finally:
        server.shutdown()

    manifest = {"sha": sha, "branch": branch, "captured": datetime.now(timezone.utc).isoformat(),
                "entries": list(entries.values())}
    # A recapture keeps the version's name unless a new one is given.
    if name or existing.get("name"):
        manifest["name"] = name or existing["name"]
    folder.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=1))
    failed = [e for e in manifest["entries"] if e.get("error") or e.get("status") != 200 or not e.get("konami")]
    minutes = (datetime.now(timezone.utc) - started).total_seconds() / 60
    print(f"\ncaptured {len(paths)} pages × {len(sizes or SIZES)} sizes into {folder.relative_to(ROOT)}"
          f" in {minutes:.1f} min with {workers} worker{'s' if workers > 1 else ''}")
    if failed:
        print(f"check these: {', '.join(e['size'] + ' ' + e['path'] for e in failed)}")


def _rows(path):
    """The image as an array plus one hash per pixel row."""
    import numpy as np
    from PIL import Image
    arr = np.asarray(Image.open(path).convert("RGB"))
    return arr, [hash(r.tobytes()) for r in arr]


def diff_page(old_png, new_png, out_png, overlay=True):
    """Compare two tall screenshots row by row.

    Rows are matched as sequences, not by position, so a section that grows by
    20px reads as 20 inserted rows rather than everything below it changing.
    Returns the changed share of the new page, the shift in height and the
    changed row ranges in new-page pixels; writes the new page with those
    ranges tinted red when anything changed.
    """
    import difflib
    import numpy as np
    from PIL import Image
    old, old_h = _rows(old_png)
    new, new_h = _rows(new_png)
    if old.shape[1] != new.shape[1]:
        # A different capture width can't be compared row for row.
        return {"changed": 1.0, "delta": new.shape[0] - old.shape[0], "regions": [[0, new.shape[0]]], "height": new.shape[0]}
    if old_h == new_h:  # most pages: nothing to match
        return {"changed": 0, "delta": 0, "regions": [], "height": new.shape[0]}
    regions = []

    def mark(a, b):
        if regions and a - regions[-1][1] < 24:  # merge neighbours into one region
            regions[-1][1] = b
        else:
            regions.append([a, b])

    if old.shape == new.shape:
        # Same height: nothing moved, so rows are compared in place. Sequence
        # matching is only worth its cost when something grew or shrank.
        diff_rows = np.flatnonzero((old != new).any(axis=(1, 2)))
        for y in diff_rows:
            mark(int(y), int(y) + 1)
    else:
        # autojunk drops rows that repeat constantly (blank margins), which keeps
        # the match from going quadratic on 50k-row pages.
        sm = difflib.SequenceMatcher(None, old_h, new_h, autojunk=True)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                continue
            # Deleted rows leave no trace in the new page; mark the seam so it shows.
            a, b = (j1, j2) if j2 > j1 else (max(j1 - 2, 0), min(j1 + 2, new.shape[0]))
            mark(a, b)
    rows = sum(b - a for a, b in regions)
    result = {"changed": round(rows / new.shape[0], 5), "delta": new.shape[0] - old.shape[0], "regions": regions, "height": new.shape[0]}
    if regions and overlay:
        shade = new.astype("float32")
        for a, b in regions:
            shade[a:b] = shade[a:b] * 0.6 + np.array([255, 40, 70], dtype="float32") * 0.4
            shade[a:b, :6] = [255, 40, 70]
        out_png.parent.mkdir(parents=True, exist_ok=True)
        img = Image.fromarray(shade.clip(0, 255).astype("uint8"))
        if img.height > 60000:  # JPEG tops out at 65500px; this is only a thumbnail
            img = img.resize((img.width // 2, img.height // 2))
        img.save(out_png.with_suffix(".jpg"), quality=70)
    return result


def diff_versions(base, head, write_page=True, quiet=False):
    """Diff every page the two captures share. The standalone viewer and its overlay thumbnails
    are written for a hand-run --diff; the atlas only needs the changed rows."""
    manifests = {}
    for sha in (base, head):
        mf = SHOTS / sha / "manifest.json"
        if not mf.exists():
            sys.exit(f"no capture at {mf.parent.relative_to(ROOT)} to diff")
        manifests[sha] = json.loads(mf.read_text())
    key = lambda e: (e["slug"], e["size"])
    old = {key(e): e for e in manifests[base]["entries"] if "height" in e}
    new = {key(e): e for e in manifests[head]["entries"] if "height" in e}
    out = DIFFS / f"{base}..{head}"
    pages = {}
    shared = [k for k in new if k in old]
    for n, (slug_, size) in enumerate(shared, 1):
        r = diff_page(SHOTS / base / size / f"{slug_}.png", SHOTS / head / size / f"{slug_}.png",
                      out / size / slug_, overlay=write_page)
        pages.setdefault(slug_, {"slug": slug_, "path": new[(slug_, size)]["path"]})[size] = r
        if not quiet:
            print(f"[{n:>3}/{len(shared)}] {size:7} {new[(slug_, size)]['path']}  {r['changed']:.1%}", flush=True)
    data = {
        "base": base, "head": head, "base_captured": manifests[base].get("captured"),
        "head_captured": manifests[head].get("captured"), "image_root": SHOTS.relative_to(HERE).as_posix(),
        "diff_root": out.relative_to(HERE).as_posix(),
        "names": {s: manifests[s].get("name") for s in manifests},
        "pages": sorted(pages.values(),
                        key=lambda p: -max(p.get(s, {}).get("changed", 0) for s in SIZES)),
        "only_old": sorted({old[k]["path"] for k in old if k not in new}),
        "only_new": sorted({new[k]["path"] for k in new if k not in old}),
    }
    (out / "diff.json").parent.mkdir(parents=True, exist_ok=True)
    (out / "diff.json").write_text(json.dumps(data, indent=1))
    changed = [p for p in data["pages"] if any(p.get(s, {}).get("changed") for s in SIZES)]
    print(f"{'' if quiet else chr(10)}{len(changed)} of {len(data['pages'])} pages changed between {base} and {head}")
    page = HERE / "screenshot-diff.html"
    if write_page and DIFF_TEMPLATE.exists():
        page.write_text(DIFF_TEMPLATE.read_text().replace("__DATA__", json.dumps(data).replace("</script>", "<\\/script>")))
        print(f"wrote {page}")


def project_layouts():
    layouts = {}
    for f in (ROOT / "_projects").iterdir():
        if f.suffix not in (".md", ".markdown", ".html"):
            continue
        front = f.read_text().split("---")[1]
        m = re.search(r"^layout:\s*(\S+)", front, re.M)
        layouts["/" + f.stem] = m and m.group(1)
    return layouts


def ensure_diffs():
    """A comparison for every ordered pair of captures, so the atlas can always offer Compare to.
    A pair is redone only when either capture has been retaken since."""
    captured = {}
    for mf in SHOTS.glob("*/manifest.json"):
        captured[mf.parent.name] = json.loads(mf.read_text()).get("captured")
    todo = []
    for b in captured:
        for h in captured:
            if b == h:
                continue
            f = DIFFS / f"{b}..{h}" / "diff.json"
            fresh = False
            if f.exists():
                d = json.loads(f.read_text())
                fresh = d.get("base_captured") == captured[b] and d.get("head_captured") == captured[h]
            if not fresh:
                todo.append((b, h))
    for i, (b, h) in enumerate(todo, 1):
        print(f"comparing {b} -> {h} ({i}/{len(todo)}): ", end="", flush=True)
        diff_versions(b, h, write_page=False, quiet=True)
    if not todo:
        print("comparisons are up to date")


def load_diffs():
    """Changed rows per page for each diffed pair, for the atlas to overlay on the newer capture."""
    diffs = {}
    for f in DIFFS.glob("*/diff.json"):
        d = json.loads(f.read_text())
        if not ((SHOTS / d["base"] / "manifest.json").exists() and (SHOTS / d["head"] / "manifest.json").exists()):
            continue
        pages = {f"{p['slug']}|{s}": {k: p[s][k] for k in ("changed", "delta", "regions", "height")}
                 for p in d["pages"] for s in SIZES if p.get(s, {}).get("changed")}
        diffs[f.parent.name] = {"base": d["base"], "head": d["head"], "pages": pages}
    return diffs


def build(out):
    """The dataset: every capture, and the latest capture's pages grouped for review."""
    versions = []
    for mf in SHOTS.glob("*/manifest.json"):
        manifest = json.loads(mf.read_text())
        sha = mf.parent.name
        try:
            subject, date = git("log", "-1", "--format=%s%x1f%cI", sha).split("\x1f")
        except subprocess.CalledProcessError:  # a --sha label that isn't a commit
            subject, date = f"{sha} (not a commit)", manifest.get("captured") or ""

        versions.append({"sha": sha, "branch": manifest.get("branch"), "subject": subject, "date": date,
                         "name": manifest.get("name"), "captured": manifest.get("captured"),
                         "entries": manifest["entries"]})
    if not versions:
        sys.exit(f"no captures in {SHOTS.relative_to(ROOT)} — run without --no-capture first")
    # In capture order, so "latest" is the newest capture rather than the newest commit.
    # Older manifests have no capture time; they fall back to the commit date.
    versions.sort(key=lambda v: datetime.fromisoformat(v["captured"] or v["date"]).astimezone(timezone.utc))

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
        "versions": [{k: v[k] for k in ("sha", "branch", "subject", "date", "name")} for v in versions],
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
    data["sizes"] = {name: opts["viewport"]["width"] for name, opts in SIZES.items()}
    data["diffs"] = load_diffs()
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
    ap.add_argument("--name", help="a friendly name for the version, shown in the menu and toast. "
                                   "With --no-capture it renames an existing capture (--sha, or HEAD)")
    ap.add_argument("--diff", nargs="+", metavar=("BASE", "HEAD"),
                    help="diff every page between two captures (HEAD defaults to the current commit) and write "
                         "screenshot-diff.html")
    ap.add_argument("--diffs", action="store_true", help="prepare any missing Compare to comparisons, without capturing")
    ap.add_argument("--no-diffs", action="store_true", help="after a capture, skip preparing the comparisons")
    ap.add_argument("--sizes", help="only capture these sizes, comma separated (e.g. tablet), "
                                    "adding them to the existing capture")
    ap.add_argument("--site", help="capture this built site folder instead of _site (to shoot an older commit's build)")
    ap.add_argument("--workers", type=int, default=4,
                    help="pages shot at once, each in its own browser (default 4; 1 = one at a time)")
    args = ap.parse_args()
    if args.diffs:
        args.no_capture = True

    if args.site:
        SITE = pathlib.Path(args.site).resolve()
    if args.diff:
        diff_versions(args.diff[0], args.diff[1] if len(args.diff) > 1 else git("rev-parse", "--short", "HEAD"))
        sys.exit(0)

    if not args.no_capture:
        sha = args.sha or git("rev-parse", "--short", "HEAD")
        if not args.sha and git("status", "--porcelain", "--untracked-files=no"):
            print(f"note: uncommitted changes are in this capture; it is still labelled {sha}\n")
        sizes = args.sizes.split(",") if args.sizes else None
        if sizes and any(s not in SIZES for s in sizes):
            sys.exit(f"--sizes takes {', '.join(SIZES)}")
        capture(sha, git("rev-parse", "--abbrev-ref", "HEAD"), args.only, args.workers, args.name, sizes)
    elif args.name:
        mf = SHOTS / (args.sha or git("rev-parse", "--short", "HEAD")) / "manifest.json"
        if not mf.exists():
            sys.exit(f"no capture at {mf.parent.relative_to(ROOT)} to name")
        manifest = json.loads(mf.read_text())
        manifest["name"] = args.name
        mf.write_text(json.dumps(manifest, indent=1))

    if args.diffs or (not args.no_capture and not args.no_diffs):
        ensure_diffs()

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
