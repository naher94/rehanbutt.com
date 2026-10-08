"""Inline the V10 Disney mark into each *.template.html -> *.html (the pages load as plain static files)."""
import re, pathlib
here = pathlib.Path(__file__).parent
svg = (here / 'v10-disney-mark.svg').read_text()
svg = re.sub(r'<svg class="brand-logo"[^>]*>', lambda m: re.sub(r'\s(height|width)="[^"]*"', '', m.group(0)), svg)
for tpl in here.glob('*.template.html'):
    out = here / tpl.name.replace('.template', '')
    out.write_text(tpl.read_text().replace('MARK_SVG', svg))
    print('built', out.name)
