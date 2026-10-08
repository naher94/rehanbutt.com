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

const advance = (f, t, sz) => { let w = 0, prev = null; for (const ch of t) { const g = f.charToGlyph(ch); if (prev) w += f.getKerningValue(prev, g) * sz / f.unitsPerEm; w += g.advanceWidth * sz / f.unitsPerEm; prev = g; } return w; };
function lcs(x, y) { const n = x.length, m = y.length, D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) D[i][j] = x[i] === y[j] ? D[i + 1][j + 1] + 1 : Math.max(D[i + 1][j], D[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) { if (i < n && j < m && x[i] === y[j]) out.push([i++, j++]); else if (j >= m || (i < n && D[i + 1][j] >= D[i][j + 1])) out.push([i++, -1]); else out.push([-1, j++]); }
  return out; }
// Morph one line of type into another. Letters are matched by character (so "August 2022" -> "Aug '22" keeps the shared letters,
// extra letters shrink away and new ones grow in). a, b = { text, font, size, x, top, lh }; x may be a function of the line's width.
function morph(a, b) {
  const bx = typeof b.x === 'function' ? b.x(advance(b.font, b.text, b.size)) : b.x;
  const A = glyphs(a.font, a.text, a.x, baseline(a.font, a.size, a.top, a.lh), a.size), B = glyphs(b.font, b.text, bx, baseline(b.font, b.size, b.top, b.lh), b.size);
  const out = [];
  lcs([...a.text], [...b.text]).forEach(([i, j]) => { const ga = i >= 0 ? A[i] : { subs: [], ch: ' ' }, gb = j >= 0 ? B[j] : { subs: [], ch: ' ' }, pairs = [];
    for (let k = 0; k < Math.max(ga.subs.length, gb.subs.length); k++) { const sa = ga.subs[k], sb = gb.subs[k];
      const pa = sa && resample(fine(sa.cmds)), pb = sb && resample(fine(sb.cmds));
      if (sa && sb) pairs.push({ a: flat(pa), b: flat(align(pa, Math.sign(sa.area) === Math.sign(sb.area) ? pb : [...pb].reverse())) });
      else if (sa) pairs.push({ a: flat(pa), b: flat(collapse(pa)) }); else pairs.push({ a: flat(collapse(pb)), b: flat(pb) }); }
    if (pairs.length) out.push({ ch: ga.ch, pairs, a: ga.subs.map(s => toD(s.cmds)).join(''), b: gb.subs.map(s => toD(s.cmds)).join('') }); });
  return out;
}
const F = n => load(n);
const black = F('Lato-Black.ttf'), blackItalic = F('Lato-BlackItalic.ttf'), zilla = F('ZillaSlab-Bold.ttf'), regular = F('Lato-Regular.ttf'), lightItalic = F('Lato-LightItalic.ttf');
const DATE_A = 'August 2022 \u00B7 Present', DATE_B = "Aug '22 \u00B7 Present";
const DATE = { dx: +(804 - (13 + advance(lightItalic, DATE_A, 20))).toFixed(2), dy: -16 };
const DATE_W_A = advance(lightItalic, DATE_A, 20), DATE_C_X = 13 + DATE_W_A - advance(lightItalic, DATE_B, 20);   // B line right-aligned under A
const gd = g => g.subs.map(c => toD(c.cmds)).join('');
const AG = glyphs(lightItalic, DATE_A, 13, baseline(lightItalic, 20, 62, 32), 20), CG = glyphs(lightItalic, DATE_B, DATE_C_X, baseline(lightItalic, 20, 62, 32), 20);
const DROP = [3, 4, 5, 7, 8];                      // u s t 2 0 of "August 2022"
const dateDrop = { shift: +(DATE_C_X - 13).toFixed(2), glyphs: AG.map((g, i) => ({ ch: g.ch, i, role: DROP.includes(i) ? 'drop' : (i < 3 || i === 6 ? 'shift' : 'keep'), d: gd(g) })).filter(g => g.d), apos: gd(CG[4]) };
const out = {
  // "Work Experience": Lato Black (V9) -> Zilla Slab Bold (V10)
  heading: morph({ text: 'Work Experience', font: black, size: 70, x: 5, top: -122, lh: 98 }, { text: 'Work Experience', font: zilla, size: 70, x: 0, top: -108, lh: 84 }),
  // company name: Lato Black Italic -> Lato Black. All of these step positions are "before the column slides down 70px"
  title: morph({ text: 'Walt Disney Animation Studios', font: blackItalic, size: 28, x: 13, top: 0, lh: 39 }, { text: 'Walt Disney Animation Studios', font: black, size: 28, x: 13, top: 0, lh: 39 }),
  // date. The V9 line first slides right until its right edge meets the pill's inner edge (x 804). Letters we don't need then drop out,
  // an apostrophe drops in, and "Aug" closes up to the "22" - all still in the V9 face (see dateDrop). Only then does the type change
  // (this morph: the same line, Light Italic 20 -> Regular 18 centred in the pill). The morph layer is drawn already shifted right by dx; its local y is shifted by dy (the slide up).
  date: morph({ text: DATE_B, font: lightItalic, size: 20, x: DATE_C_X + DATE.dx, top: 62, lh: 32 }, { text: DATE_B, font: regular, size: 18, x: w => 652 + (164 - w) / 2, top: 39 - DATE.dy, lh: 29 }),
  dateDrop,
  dateMeta: DATE,
};
fs.writeFileSync(__dirname + '/glyphs.json', JSON.stringify(out));
console.log('wrote glyphs.json:', Object.entries(out).filter(([, v]) => Array.isArray(v)).map(([k, v]) => k + ' ' + v.length + ' glyphs / ' + v.reduce((s, g) => s + g.pairs.length, 0) + ' contours').join(', '), '(N =', N + ')');
