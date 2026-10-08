// Turns the two heading faces into SVG path data, positioned in scene coordinates.
// Each glyph is split into its contours (outline + counters); the two faces' contours are paired by size, given the same winding
// direction, resampled to N evenly spaced points and start-aligned. The page tweens those points (MorphSVG's own point matching
// left visible glitches on counters and terminals), and draws the font's exact curves before and after the morph.
// Run: node extract-glyphs.js   ->   glyphs.json
const fs = require('fs'), opentype = require('./vendor/opentype.min.js');
const load = f => opentype.loadSync(__dirname + '/fonts/' + f);
const baseline = (f, size, top, lh) => { const asc = f.ascender / f.unitsPerEm * size, desc = f.descender / f.unitsPerEm * size; return top + (lh - (asc - desc)) / 2 + asc; };
const n2 = v => +v.toFixed(2);

function subpaths(path) { const out = []; let cur = null;
  path.commands.forEach(c => { if (c.type === 'M') { cur = [c]; out.push(cur); } else if (c.type !== 'Z') cur.push(c); });
  return out; }
function points(cmds) { // polygon approximation, only used for area / centroid / start point
  const pts = []; let px = 0, py = 0;
  cmds.forEach(c => { if (c.type === 'M' || c.type === 'L') { pts.push([c.x, c.y]); } else if (c.type === 'Q') { for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; pts.push([u*u*px + 2*u*t*c.x1 + t*t*c.x, u*u*py + 2*u*t*c.y1 + t*t*c.y]); } } else if (c.type === 'C') { for (let i = 1; i <= 10; i++) { const t = i / 10, u = 1 - t; pts.push([u*u*u*px + 3*u*u*t*c.x1 + 3*u*t*t*c.x2 + t*t*t*c.x, u*u*u*py + 3*u*u*t*c.y1 + 3*u*t*t*c.y2 + t*t*t*c.y]); } }
    px = c.x; py = c.y; });
  return pts; }
const area = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
function reverse(cmds) { // reverse a closed contour's direction
  const ends = cmds.map(c => [c.x, c.y]), out = [{ type: 'M', x: ends[ends.length - 1][0], y: ends[ends.length - 1][1] }];
  for (let i = cmds.length - 1; i >= 1; i--) { const c = cmds[i], to = ends[i - 1];
    if (c.type === 'L') out.push({ type: 'L', x: to[0], y: to[1] });
    else if (c.type === 'Q') out.push({ type: 'Q', x1: c.x1, y1: c.y1, x: to[0], y: to[1] });
    else if (c.type === 'C') out.push({ type: 'C', x1: c.x2, y1: c.y2, x2: c.x1, y2: c.y1, x: to[0], y: to[1] }); }
  return out; }
const toD = cmds => cmds.map(c => c.type + [c.x1, c.y1, c.x2, c.y2, c.x, c.y].filter(v => v !== undefined).map(n2).join(' ')).join('') + 'Z';
const tiny = pts => { const x = pts.reduce((s, p) => s + p[0], 0) / pts.length, y = pts.reduce((s, p) => s + p[1], 0) / pts.length; return `M${n2(x)} ${n2(y)}L${n2(x + .01)} ${n2(y)}L${n2(x)} ${n2(y + .01)}Z`; };

function glyphs(font, text, x, y, size) {
  const out = []; let prev = null;
  for (const ch of text) { const g = font.charToGlyph(ch);
    if (prev) x += font.getKerningValue(prev, g) * size / font.unitsPerEm;
    out.push({ ch, subs: ch === ' ' ? [] : subpaths(font.getPath(ch, x, y, size)).map(cmds => { const pts = points(cmds); return { cmds, pts, area: area(pts) }; }).sort((p, q) => Math.abs(q.area) - Math.abs(p.area)) });
    x += g.advanceWidth * size / font.unitsPerEm; prev = g; }
  return out; }

const N = 300;
function resample(pts) { const n = pts.length, len = [0]; for (let i = 1; i <= n; i++) { const a = pts[i - 1], b = pts[i % n]; len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = len[n], out = []; let j = 1; for (let k = 0; k < N; k++) { const d = tot * k / N; while (len[j] < d) j++; const a = pts[j - 1], b = pts[j % n], f = (d - len[j - 1]) / ((len[j] - len[j - 1]) || 1); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); } return out; }
function fine(cmds) { const pts = []; let px = 0, py = 0;
  cmds.forEach(c => { if (c.type === 'M' || c.type === 'L') pts.push([c.x, c.y]); else if (c.type === 'Q') { for (let i = 1; i <= 24; i++) { const t = i / 24, u = 1 - t; pts.push([u*u*px + 2*u*t*c.x1 + t*t*c.x, u*u*py + 2*u*t*c.y1 + t*t*c.y]); } } else if (c.type === 'C') { for (let i = 1; i <= 32; i++) { const t = i / 32, u = 1 - t; pts.push([u*u*u*px + 3*u*u*t*c.x1 + 3*u*t*t*c.x2 + t*t*t*c.x, u*u*u*py + 3*u*u*t*c.y1 + 3*u*t*t*c.y2 + t*t*t*c.y]); } }
    px = c.x; py = c.y; }); return pts; }
const align = (A, B) => { let best = 0, bd = Infinity; for (let s = 0; s < N; s++) { let d = 0; for (let i = 0; i < N; i += 3) { const q = B[(i + s) % N], r = A[i]; d += (q[0] - r[0]) ** 2 + (q[1] - r[1]) ** 2; } if (d < bd) { bd = d; best = s; } } return B.map((_, i) => B[(i + best) % N]); };
const flat = P => P.flatMap(p => [n2(p[0]), n2(p[1])]);
const collapse = P => { const x = P.reduce((s, p) => s + p[0], 0) / N, y = P.reduce((s, p) => s + p[1], 0) / N; return P.map(() => [x, y]); };

const lato = load('Lato-Black.ttf'), zilla = load('ZillaSlab-Bold.ttf'), TEXT = 'Work Experience';
const A = glyphs(lato, TEXT, 5, baseline(lato, 70, -122, 98), 70), B = glyphs(zilla, TEXT, 0, baseline(zilla, 70, -108, 84), 70);
const heading = A.map((ga, i) => { const gb = B[i], pairs = [];
  for (let k = 0; k < Math.max(ga.subs.length, gb.subs.length); k++) { const a = ga.subs[k], b = gb.subs[k];
    const pa = a && resample(fine(a.cmds)), pb = b && resample(fine(b.cmds));
    if (a && b) pairs.push({ a: flat(pa), b: flat(align(pa, Math.sign(a.area) === Math.sign(b.area) ? pb : [...pb].reverse())) });
    else if (a) pairs.push({ a: flat(pa), b: flat(collapse(pa)) }); else pairs.push({ a: flat(collapse(pb)), b: flat(pb) }); }
  return { ch: ga.ch, pairs, a: ga.subs.map(s => toD(s.cmds)).join(''), b: gb.subs.map(s => toD(s.cmds)).join('') }; }).filter(g => g.pairs.length);
fs.writeFileSync(__dirname + '/glyphs.json', JSON.stringify({ heading }));
console.log('wrote glyphs.json:', heading.length, 'glyphs,', heading.reduce((s, g) => s + g.pairs.length, 0), 'contour pairs, N =', N);
