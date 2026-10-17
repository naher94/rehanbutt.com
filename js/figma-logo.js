/**
 * Figma Logo (home intro)
 *
 * Clicking the inline Figma logo plays one of the animations in VARIANTS, then plays it
 * back in reverse to the logo. Try them in figma-playground.html.
 *
 * The SVG lives in _includes/figma-logo.svg. Everything is in SVG units (the black square is
 * 36 × 36). Each variant is a function of time alone, so the playground can scrub it. Sounds
 * are synthesized with Web Audio.
 */
(function () {
  'use strict';

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOutBack = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);
  const f = n => +n.toFixed(2);

  const DEFAULT = 'collabdraw';

  // The black square's corner radius in SVG units. It is a fixed length in CSS (the button's border-radius,
  // 7px on desktop and 5px below), as it was on the static logo, so it depends on how big the logo is drawn.
  let R0 = 10.5;

  const rr = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}` +
      `V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
  };
  const easeInOut = t => 0.5 - Math.cos(Math.PI * t) / 2;
  const easeOutBounce = t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  };
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => {
    const a = hex(c1), b = hex(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  // A bump that is 1 at c and falls away either side over width w.
  const near = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

  // The five pieces of the mark, in drawing order, with the centre of each in the logo (the square is 36 wide).
  const PIECES = [
    { name: 'green', cx: 13.35, cy: 26.8, color: '#0acf83' },
    { name: 'purple', cx: 13.35, cy: 18, color: '#a259ff' },
    { name: 'red', cx: 13.35, cy: 9.2, color: '#f24e1e' },
    { name: 'orange', cx: 22.05, cy: 9.2, color: '#ff7262' },
    { name: 'blue', cx: 22.05, cy: 18, color: '#1abcfe' },
  ];
  const MARK = { x: 17.7, y: 18, hw: 8.7, hh: 13.2 };      // the mark's centre and half size
  const pose = (i, over) => ({ x: 0, y: 0, rot: 0, scale: 1, ...over });

  // ── Variants ──
  // fwd: ms to the end state; hold: ms it pauses there; rev: ms back. cues are [ms, sound, ...args].
  // draw(p, h, ms) returns the state to render: p is 0 (the logo) to 1 (the end state) and h is the time
  // into the hold (null otherwise), so the way back is exactly the way in. A state can have:
  //   pieces: [{ x, y, rot, scale, fill }] one per piece, as offsets from where it sits in the logo
  //   mark: { rot, scale } for the whole mark, about its centre
  //   bg: the black square's path; bgFill: its colour
  //   cursor: { x, y, scale, op }; select: { x0, y0, x1, y1, op }
  const VARIANTS = {
    scatter: {
      label: 'Scatter',
      note: 'The five pieces fly out from the centre one after another, turning, then come back together.',
      fwd: 1300, hold: 500, rev: 1200,
      cues: [[0, 'pop'], [150, 'tick'], [300, 'tick'], [450, 'tick'], [1900, 'ping']],
      draw(p) {
        return {
          pieces: PIECES.map((pc, i) => {
            const e = easeOutBack(seg(p, i * 0.1, i * 0.1 + 0.5));
            const dx = pc.cx - 18, dy = pc.cy - 18, len = Math.hypot(dx, dy) || 1;
            return pose(i, { x: dx / len * 16 * e, y: dy / len * 16 * e, rot: (i % 2 ? 1 : -1) * 25 * e });
          }),
        };
      },
    },
    orbit: {
      label: 'Orbit',
      note: 'The pieces peel off the mark, swirl out onto a ring around the square and orbit it, then spiral back in.',
      fwd: 1600, hold: 1600, rev: 1400,
      cues: [[0, 'pop'], [200, 'tick'], [350, 'tick'], [500, 'tick'], [650, 'tick'], [2400, 'whoosh'], [4200, 'ping']],
      draw(p, h) {
        const spin = 2 * Math.PI * (0.75 * easeInOut(p) + (h === null ? 0 : h / 1600 * 0.6));
        return {
          pieces: PIECES.map((pc, i) => {
            const e = easeOutBack(seg(p, i * 0.07, i * 0.07 + 0.6));
            const th = i * 2 * Math.PI / 5 - Math.PI / 2 + spin * (i * 0 + 1);
            const tx = 18 + 24 * Math.cos(th), ty = 18 + 24 * Math.sin(th);
            return pose(i, { x: (tx - pc.cx) * e, y: (ty - pc.cy) * e, rot: 360 * e * 0.5, scale: lerp(1, 0.75, e) });
          }),
        };
      },
    },
    row: {
      label: 'Auto layout',
      note: 'The square stretches into a pill and the five pieces line up in a row, evenly spaced, like auto layout; then they snap back.',
      fwd: 1300, hold: 900, rev: 1200,
      cues: [[0, 'pop'], [250, 'tick'], [350, 'tick'], [450, 'tick'], [550, 'tick'], [650, 'tick'], [1500, 'ping']],
      draw(p) {
        const eb = easeInOut(seg(p, 0, 0.5));
        return {
          bg: rr(lerp(0, -12, eb), lerp(0, 8, eb), lerp(36, 60, eb), lerp(36, 20, eb), lerp(R0, 10, eb)),
          pieces: PIECES.map((pc, i) => {
            const e = easeOutBack(seg(p, 0.2 + i * 0.07, 0.2 + i * 0.07 + 0.45));
            const tx = 18 + (i - 2) * 10.5, ty = 18;
            return pose(i, { x: (tx - pc.cx) * e, y: (ty - pc.cy) * e, scale: lerp(1, 0.78, e) });
          }),
        };
      },
    },
    column: {
      label: 'Auto layout, vertical',
      note: 'The square stretches into a tall pill and the five pieces stack in a column, evenly spaced, like a vertical auto layout; then they snap back.',
      fwd: 1300, hold: 900, rev: 1200,
      cues: [[0, 'pop'], [250, 'tick'], [350, 'tick'], [450, 'tick'], [550, 'tick'], [650, 'tick'], [1500, 'ping']],
      draw(p) {
        const eb = easeInOut(seg(p, 0, 0.5));
        return {
          bg: rr(lerp(0, 8, eb), lerp(0, -12, eb), lerp(36, 20, eb), lerp(36, 60, eb), lerp(R0, 10, eb)),
          pieces: PIECES.map((pc, i) => {
            const e = easeOutBack(seg(p, 0.2 + i * 0.07, 0.2 + i * 0.07 + 0.45));
            const tx = 18, ty = 18 + (i - 2) * 10.5;
            return pose(i, { x: (tx - pc.cx) * e, y: (ty - pc.cy) * e, scale: lerp(1, 0.78, e) });
          }),
        };
      },
    },
    cursor: {
      label: 'Cursor',
      note: 'A collaborator\'s cursor flies in and brushes each piece in turn; each piece hops and tilts as it is touched. Then the cursor leaves.',
      fwd: 1800, hold: 300, rev: 1400,
      cues: [[0, 'pop'], [620, 'tick'], [820, 'tick'], [1020, 'tick'], [1220, 'tick'], [1420, 'tick'], [2800, 'pop2']],
      draw(p) {
        const W = [[56, -10], [22.05, 9.2], [13.35, 9.2], [13.35, 18], [13.35, 26.8], [22.05, 18], [56, 42]];
        const u = easeInOut(p) * (W.length - 1);
        const k = Math.min(W.length - 2, Math.floor(u)), t = u - k;
        const x = lerp(W[k][0], W[k + 1][0], t), y = lerp(W[k][1], W[k + 1][1], t);
        const order = [3, 2, 1, 0, 4];                       // orange, red, purple, green, blue are the waypoints 1 to 5
        return {
          cursor: { x, y, scale: 1 - 0.1 * near(u % 1, 0, 0.15), op: seg(p, 0, 0.06) * (1 - seg(p, 0.94, 1)) },
          pieces: PIECES.map((pc, i) => {
            const b = near(u, order.indexOf(i) + 1, 0.4);
            return pose(i, { y: -3 * b, rot: (i % 2 ? 1 : -1) * 10 * b, scale: 1 + 0.16 * b });
          }),
        };
      },
    },
    select: {
      label: 'Select and resize',
      note: 'A blue selection box with corner handles appears around the mark; a cursor grabs the bottom right handle and drags it, scaling the mark up. It comes back down.',
      fwd: 1700, hold: 600, rev: 1400,
      cues: [[0, 'pop'], [300, 'tick'], [900, 'whoosh'], [2300, 'pop2']],
      draw(p) {
        const sel = easeOutBack(seg(p, 0, 0.25)), drag = easeInOut(seg(p, 0.35, 0.85));
        const sc = lerp(1, 1.5, drag);
        const x0 = MARK.x - MARK.hw * sc, x1 = MARK.x + MARK.hw * sc, y0 = MARK.y - MARK.hh * sc, y1 = MARK.y + MARK.hh * sc;
        const grow = lerp(0.9, 1, sel);
        const cx = lerp(52, x1, easeInOut(seg(p, 0.1, 0.35))), cy = lerp(-8, y1, easeInOut(seg(p, 0.1, 0.35)));
        return {
          mark: { rot: 0, scale: sc, x: MARK.x, y: MARK.y },
          select: { x0: MARK.x - (MARK.x - x0) * grow, y0: MARK.y - (MARK.y - y0) * grow, x1: MARK.x + (x1 - MARK.x) * grow, y1: MARK.y + (y1 - MARK.y) * grow, op: seg(p, 0, 0.12) },
          cursor: { x: cx, y: cy, scale: 1 - 0.1 * seg(p, 0.35, 0.4), op: seg(p, 0.05, 0.15) },
          pieces: PIECES.map(() => pose(0)),
        };
      },
    },
    draw: {
      label: 'Draw it',
      note: 'The mark vanishes and a cursor draws it again: it drags out the red and orange shapes, then alt-drags a copy of the red one down and recolours it purple, then draws the blue and green. It ends on the finished logo, so there is no playing back.',
      fwd: 4200, hold: 300, rev: 0,
      cues: (() => {
        const list = [[0, 'pop2']];
        for (let i = 0; i < 5; i++) {
          list.push([Math.round((0.1 + 0.165 * (i + 0.3)) * 4200), i === 2 ? 'copy' : 'tick'], [Math.round((0.1 + 0.165 * (i + 0.75)) * 4200), i === 2 ? 'drop' : 'pop']);
        }
        list.push([4300, 'ping']);
        return list;
      })(),
      draw(p) {
        const O = [2, 3, 1, 4, 0], T0 = 0.1, SLOT = 0.165, START = [52, -8];
        const S = i => [PIECES[i].cx - 4.35, PIECES[i].cy - 4.4], E = i => (i === 1 ? [PIECES[1].cx, PIECES[1].cy] : [PIECES[i].cx + 4.35, PIECES[i].cy + 4.4]);
        const COPY = 1, SRC = 2, GAP = PIECES[1].cy - PIECES[SRC].cy;   // the purple piece is a copy of the red one, dragged down
        const lerp2 = (a, b, m) => [lerp(a[0], b[0], m), lerp(a[1], b[1], m)];
        let pos, frame = null, press = 0;
        if (p >= T0 + SLOT * 5) {
          pos = lerp2(E(O[4]), START, easeInOut(seg(p, T0 + SLOT * 5, 1)));
        } else {
          const s = p < T0 ? 0 : Math.min(4, Math.floor((p - T0) / SLOT)), t0 = T0 + SLOT * s, u = (p - t0) / SLOT;
          const prev = s ? E(O[s - 1]) : START;
          if (O[s] === COPY) {
            const grab = [PIECES[SRC].cx, PIECES[SRC].cy], drop = E(COPY), box = (dy, op) => ({ x0: PIECES[COPY].cx - 4.35, y0: PIECES[COPY].cy - 4.4 - dy, x1: PIECES[COPY].cx + 4.35, y1: PIECES[COPY].cy + 4.4 - dy, op });
            if (u < 0.3) pos = lerp2(prev, grab, easeInOut(seg(u, 0, 0.3)));
            else if (u < 0.75) {
              const d = easeInOut(seg(u, 0.3, 0.7));
              pos = lerp2(grab, drop, d);
              frame = box(GAP * (1 - d), 1);
              press = 1;
            } else { pos = drop; frame = box(0, 1 - seg(u, 0.75, 0.9)); }
          } else {
            const st = S(O[s]), en = E(O[s]);
            if (u < 0.3) pos = lerp2(prev, st, easeInOut(seg(u, s ? 0 : (0.03 - t0) / SLOT, 0.3)));
            else if (u < 0.75) {
              pos = lerp2(st, en, easeInOut(seg(u, 0.3, 0.7)));
              frame = { x0: st[0], y0: st[1], x1: pos[0], y1: pos[1], op: 1 };
              press = 1;
            } else {
              pos = en;
              frame = { x0: st[0], y0: st[1], x1: en[0], y1: en[1], op: 1 - seg(u, 0.75, 0.9) };
            }
          }
        }
        return {
          cursor: { x: pos[0], y: pos[1], scale: 1 - 0.1 * press, op: seg(p, 0.03, 0.07) * (1 - seg(p, 0.96, 1)) },
          select: frame,
          pieces: PIECES.map((pc, i) => {
            const slot = O.indexOf(i), release = T0 + SLOT * (slot + 0.75);
            if (i === COPY) {
              // The copy comes out from under the red piece, still red, drags down and turns purple.
              const t0c = T0 + SLOT * slot, u = (p - t0c) / SLOT, d = easeInOut(seg(u, 0.3, 0.7));
              const here = p < t0c + SLOT * 0.3 ? 0 : 1;
              const early = 1 - easeInOut(seg(p, 0.01 + slot * 0.01, 0.07 + slot * 0.01));
              if (p < t0c) return pose(i, { scale: early });
              return pose(i, { scale: here, y: -GAP * (1 - d), fill: mix(PIECES[SRC].color, PIECES[COPY].color, seg(u, 0.62, 0.9)) });
            }
            const sc = p < release ? 1 - easeInOut(seg(p, 0.01 + slot * 0.01, 0.07 + slot * 0.01)) : easeOutBack(seg(p, release, release + SLOT * 0.25));
            return pose(i, { scale: sc });
          }),
        };
      },
    },
    corner: {
      label: 'Pull the corners',
      note: 'The square is selected, showing its outline, and a cursor grabs a bezier handle at each corner in turn and pulls it along the edge, rounding the corner until the square is a circle. Then the corners go back.',
      fwd: 3800, hold: 600, rev: 1400,
      cues: (() => {
        const list = [[0, 'pop']];
        for (let i = 0; i < 4; i++) list.push([Math.round((0.12 + 0.2 * (i + 0.28)) * 3800), 'tick'], [Math.round((0.12 + 0.2 * (i + 0.8)) * 3800), 'pop']);
        list.push([4200, 'ping'], [5100, 'pop2']);
        return list;
      })(),
      draw(p) {
        const K = 0.4477, SIZE = 36, TOP = 18, T0 = 0.12, SLOT = 0.2, START = [54, -10];
        // Corners in the order they are pulled: top right, bottom right, bottom left, top left.
        const CORNERS = [
          { c: [SIZE, 0], a: [-1, 0], b: [0, 1], idx: 1 },
          { c: [SIZE, SIZE], a: [0, -1], b: [-1, 0], idx: 2 },
          { c: [0, SIZE], a: [1, 0], b: [0, -1], idx: 3 },
          { c: [0, 0], a: [0, 1], b: [1, 0], idx: 0 },
        ];
        const L = [R0, R0, R0, R0];
        CORNERS.forEach((cn, k) => { L[cn.idx] = lerp(R0, TOP, easeInOut(seg(p, T0 + SLOT * (k + 0.3), T0 + SLOT * (k + 0.75)))); });
        const path = () => {
          const [tl, tr, br, bl] = L;
          return `M${f(tl)} 0H${f(SIZE - tr)}C${f(SIZE - K * tr)} 0 ${SIZE} ${f(K * tr)} ${SIZE} ${f(tr)}V${f(SIZE - br)}C${SIZE} ${f(SIZE - K * br)} ${f(SIZE - K * br)} ${SIZE} ${f(SIZE - br)} ${SIZE}H${f(bl)}` +
            `C${f(K * bl)} ${SIZE} 0 ${f(SIZE - K * bl)} 0 ${f(SIZE - bl)}V${f(tl)}C0 ${f(K * tl)} ${f(K * tl)} 0 ${f(tl)} 0Z`;
        };
        const knob = (cn, len) => [cn.c[0] + cn.a[0] * K * len, cn.c[1] + cn.a[1] * K * len];
        let pos, handles = null;
        const lastSlot = T0 + SLOT * 4;
        if (p >= lastSlot) {
          pos = [lerp(knob(CORNERS[3], TOP)[0], START[0], easeInOut(seg(p, lastSlot, 1))), lerp(knob(CORNERS[3], TOP)[1], START[1], easeInOut(seg(p, lastSlot, 1)))];
        } else {
          const k = p < T0 ? 0 : Math.min(3, Math.floor((p - T0) / SLOT)), t0 = T0 + SLOT * k, u = (p - t0) / SLOT, cn = CORNERS[k];
          const from = k ? knob(CORNERS[k - 1], TOP) : START, grab = knob(cn, R0);
          const len = L[cn.idx];
          if (u < 0.3) {
            const m = easeInOut(seg(u, k ? 0 : (0.04 - t0) / SLOT, 0.28));
            pos = [lerp(from[0], grab[0], m), lerp(from[1], grab[1], m)];
          } else pos = knob(cn, len);
          if (u >= 0.25 && u < 0.9) {
            const A = [cn.c[0] + cn.a[0] * len, cn.c[1] + cn.a[1] * len], B = [cn.c[0] + cn.b[0] * len, cn.c[1] + cn.b[1] * len];
            handles = { A, B, c1: knob(cn, len), c2: [cn.c[0] + cn.b[0] * K * len, cn.c[1] + cn.b[1] * K * len], op: seg(u, 0.25, 0.32) * (1 - seg(u, 0.8, 0.9)) };
          }
        }
        return {
          bg: p > 0 ? path() : undefined,
          bez: { d: path(), op: seg(p, 0, 0.05) * (1 - seg(p, 0.93, 0.97)), handles },
          cursor: { x: pos[0], y: pos[1], scale: handles && handles.op > 0.5 ? 0.9 : 1, op: seg(p, 0.03, 0.07) * (1 - seg(p, 0.95, 1)) },
          pieces: PIECES.map(() => pose(0)),
        };
      },
    },
    guides: {
      label: 'Smart guides',
      note: 'The pieces get knocked slightly out of line. A cursor drags three of them back; pink guides flash as each one reaches the edge it lines up with and snaps home.',
      fwd: 3400, hold: 300, rev: 1200,
      cues: [[0, 'pop2'], [550, 'tick'], [1250, 'ping'], [1650, 'tick'], [2350, 'ping'], [2750, 'tick'], [3300, 'ping'], [4700, 'pop2']],
      draw(p) {
        const OFF = { 3: [5, -4], 4: [-4.5, 4.5], 0: [4.5, 3.5], 1: [-1.5, 0], 2: [0, 1.5] };
        const GUIDES = {
          3: [[7, 4.8, 28.5, 4.8], [17.7, 3, 17.7, 15]],
          4: [[7, 13.6, 28.5, 13.6], [17.7, 12, 17.7, 24]],
          0: [[7.5, 22.4, 20, 22.4], [9, 3, 9, 33]],
        };
        const order = [3, 4, 0], T0 = 0.16, SLOT = 0.25, START = [54, -8];
        const kick = easeOutBack(seg(p, 0, 0.1));
        let pos = START, pressed = 0, lines = [];
        const scatter = i => (OFF[i] || [0, 0]);
        const state = {};
        PIECES.forEach((pc, i) => { state[i] = [scatter(i)[0] * kick, scatter(i)[1] * kick]; });
        const end = T0 + SLOT * order.length;
        if (p >= end) {
          const last = order[2], c = [PIECES[last].cx - 4.35, PIECES[last].cy - 4.4];
          pos = [lerp(c[0], START[0], easeInOut(seg(p, end, 1))), lerp(c[1], START[1], easeInOut(seg(p, end, 1)))];
          order.forEach(i => { state[i] = [0, 0]; });
          [1, 2].forEach(i => { state[i] = [0, 0]; });
        } else {
          const sIdx = p < T0 ? 0 : Math.min(2, Math.floor((p - T0) / SLOT)), t0 = T0 + SLOT * sIdx, u = (p - t0) / SLOT, i = order[sIdx];
          order.slice(0, sIdx).forEach(j => { state[j] = [0, 0]; });
          [1, 2].forEach(j => { if (p > T0 + SLOT) state[j] = [0, 0]; });
          const prev = sIdx ? [PIECES[order[sIdx - 1]].cx - 4.35, PIECES[order[sIdx - 1]].cy - 4.4] : START;
          const off = OFF[i], home = [PIECES[i].cx - 4.35, PIECES[i].cy - 4.4], grab = [home[0] + off[0], home[1] + off[1]];
          if (u < 0.25) pos = [lerp(prev[0], grab[0], easeInOut(seg(u, sIdx ? 0 : (0.08 - t0) / SLOT, 0.25))), lerp(prev[1], grab[1], easeInOut(seg(u, sIdx ? 0 : (0.08 - t0) / SLOT, 0.25)))];
          else {
            const d = easeOutBack(seg(u, 0.25, 0.7));
            const m = 1 - d;
            pos = [home[0] + off[0] * m, home[1] + off[1] * m];
            state[i] = [off[0] * m, off[1] * m];
            pressed = u < 0.78 ? 1 : 0;
          }
          const gop = seg(u, 0.55, 0.62) * (1 - seg(u, 0.86, 0.96));
          lines = GUIDES[i].map(g => ({ x1: g[0], y1: g[1], x2: g[2], y2: g[3], color: '#ff2d9b', op: gop, w: 0.6 }));
        }
        return {
          cursor: { x: pos[0], y: pos[1], scale: 1 - 0.1 * pressed, op: seg(p, 0.07, 0.11) * (1 - seg(p, 0.95, 1)) },
          lines,
          pieces: PIECES.map((pc, i) => pose(i, { x: state[i][0], y: state[i][1] })),
        };
      },
    },
    collab: {
      label: 'Two cursors',
      note: 'The mark vanishes and two collaborators redraw it at once: yours (blue) drags out the left column, a second cursor (purple) drags out the right. It ends on the finished logo.',
      fwd: 3600, hold: 300, rev: 0,
      cues: [[0, 'pop2'], [350, 'tick'], [600, 'tick'], [900, 'pop'], [1150, 'tick'], [1400, 'pop'], [1700, 'tick'], [1950, 'pop'], [2150, 'tick'], [2400, 'pop'], [3900, 'ping']],
      draw(p) {
        const mk = (plan, start) => {
          const S = i => [PIECES[i].cx - 4.35, PIECES[i].cy - 4.4], E = i => [PIECES[i].cx + 4.35, PIECES[i].cy + 4.4];
          const lerp2 = (a, b, m) => [lerp(a[0], b[0], m), lerp(a[1], b[1], m)];
          const last = plan[plan.length - 1], endT = last.t0 + last.d;
          let pos, frame = null, press = 0;
          if (p >= endT) pos = lerp2(E(last.idx), start, easeInOut(seg(p, endT, endT + 0.12)));
          else {
            let k = 0;
            plan.forEach((sl, j) => { if (p >= sl.t0) k = j; });
            const sl = plan[k], u = (p - sl.t0) / sl.d, prev = k ? E(plan[k - 1].idx) : start, st = S(sl.idx), en = E(sl.idx);
            if (u < 0.3) pos = lerp2(prev, st, easeInOut(seg(u, k ? 0 : (0.04 - sl.t0) / sl.d, 0.28)));
            else if (u < 0.75) { pos = lerp2(st, en, easeInOut(seg(u, 0.3, 0.7))); frame = { x0: st[0], y0: st[1], x1: pos[0], y1: pos[1], op: 1 }; press = 1; }
            else { pos = en; frame = { x0: st[0], y0: st[1], x1: en[0], y1: en[1], op: 1 - seg(u, 0.75, 0.9) }; }
          }
          return { pos, frame, press, op: seg(p, 0.03, 0.07) * (1 - seg(p, endT + 0.08, endT + 0.14)) };
        };
        const planA = [{ idx: 2, t0: 0.1, d: 0.2 }, { idx: 1, t0: 0.3, d: 0.2 }, { idx: 0, t0: 0.5, d: 0.2 }];
        const planB = [{ idx: 3, t0: 0.16, d: 0.22 }, { idx: 4, t0: 0.4, d: 0.22 }];
        const A = mk(planA, [-14, -10]), B = mk(planB, [54, 46]);
        const all = planA.concat(planB);
        return {
          cursor: { x: A.pos[0], y: A.pos[1], scale: 1 - 0.1 * A.press, op: A.op },
          cursor2: { x: B.pos[0], y: B.pos[1], scale: 1 - 0.1 * B.press, op: B.op },
          select: A.frame, select2: B.frame,
          pieces: PIECES.map((pc, i) => {
            const sl = all.find(q => q.idx === i), release = sl.t0 + sl.d * 0.75;
            const sc = p < release ? 1 - easeInOut(seg(p, 0.01 + i * 0.008, 0.07 + i * 0.008)) : easeOutBack(seg(p, release, release + sl.d * 0.25));
            return pose(i, { scale: sc });
          }),
        };
      },
    },
    collabdraw: {
      label: 'Draw it, two cursors',
      note: 'A mix of "Draw it" and "Two cursors": the mark vanishes and two collaborators redraw it at once. Yours (blue) draws red, copies red down to make purple, then draws green; the purple cursor draws orange, then blue.',
      fwd: 3900, hold: 300, rev: 0,
      cues: (() => {
        const total = 3900, A = [[2, 0.1, 0.2], [1, 0.3, 0.2, true], [0, 0.5, 0.2]], B = [[3, 0.16, 0.22], [4, 0.4, 0.22]];
        const list = [[0, 'pop2']];
        [...A, ...B].forEach(([idx, t0, d, copy]) => {
          list.push([Math.round((t0 + d * 0.3) * total), copy ? 'copy' : 'tick'], [Math.round((t0 + d * 0.75) * total), copy ? 'drop' : 'pop']);
        });
        list.push([4300, 'ping']);
        return list.sort((x, y) => x[0] - y[0]);
      })(),
      draw(p) {
        const SRC = 2, COPY = 1, GAP = PIECES[COPY].cy - PIECES[SRC].cy;
        const S = i => [PIECES[i].cx - 4.35, PIECES[i].cy - 4.4];
        const E = i => (i === COPY ? [PIECES[i].cx, PIECES[i].cy] : [PIECES[i].cx + 4.35, PIECES[i].cy + 4.4]);
        const lerp2 = (a, b, m) => [lerp(a[0], b[0], m), lerp(a[1], b[1], m)];
        const mk = (plan, start) => {
          const last = plan[plan.length - 1], endT = last.t0 + last.d;
          let pos, frame = null, press = 0;
          if (p >= endT) pos = lerp2(E(last.idx), start, easeInOut(seg(p, endT, endT + 0.12)));
          else {
            let k = 0;
            plan.forEach((sl, j) => { if (p >= sl.t0) k = j; });
            const sl = plan[k], u = (p - sl.t0) / sl.d, prev = k ? E(plan[k - 1].idx) : start;
            if (sl.idx === COPY) {
              const grab = [PIECES[SRC].cx, PIECES[SRC].cy], drop = E(COPY);
              const box = (dy, op) => ({ x0: PIECES[COPY].cx - 4.35, y0: PIECES[COPY].cy - 4.4 - dy, x1: PIECES[COPY].cx + 4.35, y1: PIECES[COPY].cy + 4.4 - dy, op });
              if (u < 0.3) pos = lerp2(prev, grab, easeInOut(seg(u, k ? 0 : (0.04 - sl.t0) / sl.d, 0.3)));
              else if (u < 0.75) { const d = easeInOut(seg(u, 0.3, 0.7)); pos = lerp2(grab, drop, d); frame = box(GAP * (1 - d), 1); press = 1; }
              else { pos = drop; frame = box(0, 1 - seg(u, 0.75, 0.9)); }
            } else {
              const st = S(sl.idx), en = E(sl.idx);
              if (u < 0.3) pos = lerp2(prev, st, easeInOut(seg(u, k ? 0 : (0.04 - sl.t0) / sl.d, 0.28)));
              else if (u < 0.75) { pos = lerp2(st, en, easeInOut(seg(u, 0.3, 0.7))); frame = { x0: st[0], y0: st[1], x1: pos[0], y1: pos[1], op: 1 }; press = 1; }
              else { pos = en; frame = { x0: st[0], y0: st[1], x1: en[0], y1: en[1], op: 1 - seg(u, 0.75, 0.9) }; }
            }
          }
          // Fade by distance from the logo, so both cursors appear and leave at the same distance wherever they come from.
          return { pos, frame, press, op: 1 - seg(Math.hypot(pos[0] - 18, pos[1] - 18), 36, 44) };
        };
        const planA = [{ idx: 2, t0: 0.1, d: 0.2 }, { idx: 1, t0: 0.3, d: 0.2 }, { idx: 0, t0: 0.5, d: 0.2 }];
        const planB = [{ idx: 3, t0: 0.16, d: 0.22 }, { idx: 4, t0: 0.4, d: 0.22 }];
        const A = mk(planA, [-15.2, -11]), B = mk(planB, [52.7, 45]);
        const all = planA.concat(planB);
        return {
          cursor: { x: A.pos[0], y: A.pos[1], scale: 1 - 0.1 * A.press, op: A.op },
          cursor2: { x: B.pos[0], y: B.pos[1], scale: 1 - 0.1 * B.press, op: B.op },
          select: A.frame, select2: B.frame,
          pieces: PIECES.map((pc, i) => {
            const sl = all.find(q => q.idx === i), release = sl.t0 + sl.d * 0.75;
            const early = 1 - easeInOut(seg(p, 0.01 + i * 0.008, 0.07 + i * 0.008));
            if (i === COPY) {
              const u = (p - sl.t0) / sl.d, d = easeInOut(seg(u, 0.3, 0.7));
              if (p < sl.t0) return pose(i, { scale: early });
              return pose(i, { scale: p < sl.t0 + sl.d * 0.3 ? 0 : 1, y: -GAP * (1 - d), fill: mix(PIECES[SRC].color, PIECES[COPY].color, seg(u, 0.62, 0.9)) });
            }
            return pose(i, { scale: p < release ? early : easeOutBack(seg(p, release, release + sl.d * 0.25)) });
          }),
        };
      },
    },
    pen: {
      label: 'Pen tool',
      note: 'The mark vanishes and a cursor traces each shape with the pen: a blue outline draws itself with anchor points dropping along it, then the shape fills with colour. It ends on the finished logo.',
      fwd: 4600, hold: 300, rev: 0,
      cues: (() => {
        const list = [[0, 'pop2']];
        for (let i = 0; i < 5; i++) list.push([Math.round((0.1 + 0.17 * (i + 0.25)) * 4600), 'tick'], [Math.round((0.1 + 0.17 * (i + 0.8)) * 4600), 'pop']);
        list.push([4900, 'ping']);
        return list;
      })(),
      draw(p, h, ms, k) {
        const O = [2, 3, 1, 4, 0], T0 = 0.1, SLOT = 0.17, START = [54, -8];
        const lerp2 = (a, b, m) => [lerp(a[0], b[0], m), lerp(a[1], b[1], m)];
        const end = T0 + SLOT * 5;
        let pos = START, pen = null;
        const fills = {};
        PIECES.forEach((pc, i) => {
          const slot = O.indexOf(i), release = T0 + SLOT * (slot + 0.78);
          fills[i] = p < release ? 1 - easeInOut(seg(p, 0.01 + slot * 0.01, 0.07 + slot * 0.01)) : easeOutBack(seg(p, release, release + SLOT * 0.22));
        });
        const sIdx = p < T0 ? 0 : Math.min(4, Math.floor((p - T0) / SLOT)), t0 = T0 + SLOT * sIdx, u = (p - t0) / SLOT, i = O[sIdx];
        k.penPath.setAttribute('d', k.pieces[i].getAttribute('d'));
        const L = k.penPath.getTotalLength(), at = f2 => { const q = k.penPath.getPointAtLength(clamp(f2, 0, 1) * L); return [q.x, q.y]; };
        if (p >= end) {
          const q = (() => { k.penPath.setAttribute('d', k.pieces[O[4]].getAttribute('d')); const l2 = k.penPath.getTotalLength(), pt = k.penPath.getPointAtLength(l2); return [pt.x, pt.y]; })();
          pos = lerp2(q, START, easeInOut(seg(p, end, 1)));
        } else {
          let prev = START;
          if (sIdx) { k.penPath.setAttribute('d', k.pieces[O[sIdx - 1]].getAttribute('d')); const l2 = k.penPath.getTotalLength(), pt = k.penPath.getPointAtLength(l2); prev = [pt.x, pt.y]; k.penPath.setAttribute('d', k.pieces[i].getAttribute('d')); }
          const first = at(0);
          if (u < 0.2) pos = lerp2(prev, first, easeInOut(seg(u, sIdx ? 0 : (0.07 - t0) / SLOT, 0.2)));
          else {
            const tp = easeInOut(seg(u, 0.2, 0.72));
            pos = at(tp);
            const anchors = [];
            for (let j = 0; j < 8; j++) { const fr = j / 8; if (tp >= fr - 0.001 && u >= 0.2) anchors.push(at(fr)); }
            pen = { op: 1 - seg(u, 0.78, 0.92), progress: tp, anchors };
          }
          if (u >= 0.72 && u < 1) pen = { op: 1 - seg(u, 0.78, 0.92), progress: 1, anchors: [0, 1, 2, 3, 4, 5, 6, 7].map(j => at(j / 8)) };
        }
        return {
          cursor: { x: pos[0], y: pos[1], scale: pen && pen.progress > 0 && pen.progress < 1 ? 0.9 : 1, op: seg(p, 0.03, 0.07) * (1 - seg(p, 0.96, 1)) },
          pen,
          pieces: PIECES.map((pc, j) => pose(j, { scale: fills[j] })),
        };
      },
    },
    rotate: {
      label: 'Rotate',
      note: 'The mark is selected and a cursor grabs just outside a corner and turns it. An angle label ticks up in 15 degree steps as the mark and its selection box rotate to 45. It returns.',
      fwd: 2000, hold: 600, rev: 1400,
      cues: [[0, 'pop'], [650, 'tick'], [900, 'tick'], [1150, 'tick'], [1400, 'pop'], [2900, 'pop2']],
      draw(p) {
        const sel = easeOutBack(seg(p, 0, 0.2)), turn = easeInOut(seg(p, 0.3, 0.8));
        const ang = 45 * turn, snap = Math.round(ang / 15) * 15;
        const R = 19, a = (56.6 + ang) * Math.PI / 180;
        const hx = MARK.x + R * Math.cos(a), hy = MARK.y + R * Math.sin(a);
        const enter = easeInOut(seg(p, 0.1, 0.3));
        const sx = lerp(54, MARK.x + R * Math.cos(56.6 * Math.PI / 180), enter), sy = lerp(-8, MARK.y + R * Math.sin(56.6 * Math.PI / 180), enter);
        const cx = p < 0.3 ? sx : hx, cy = p < 0.3 ? sy : hy;
        const g = lerp(0.9, 1, sel);
        return {
          mark: { rot: ang, scale: 1, x: MARK.x, y: MARK.y },
          select: { x0: MARK.x - MARK.hw * g, y0: MARK.y - MARK.hh * g, x1: MARK.x + MARK.hw * g, y1: MARK.y + MARK.hh * g, op: seg(p, 0, 0.12) },
          selTransform: `rotate(${f(ang)} ${MARK.x} ${MARK.y})`,
          cursor: { x: cx, y: cy, scale: p > 0.3 && p < 0.82 ? 0.9 : 1, op: seg(p, 0.05, 0.15) },
          labels: [{ x: cx + 8, y: cy + 5, text: `${snap}°`, color: '#0d99ff', op: seg(p, 0.32, 0.38) * (1 - seg(p, 0.86, 0.94)) }],
          pieces: PIECES.map(() => pose(0)),
        };
      },
    },
    comment: {
      label: 'Comment',
      note: 'A cursor clicks on the logo and a comment pin drops in, then a comment card opens and types "Love it!". A heart reaction pops on the card. They tuck away again.',
      fwd: 2800, hold: 700, rev: 1200,
      cues: [[0, 'pop'], [900, 'pop'], [1250, 'tick'], [1350, 'tick'], [1450, 'tick'], [1550, 'tick'], [1650, 'tick'], [1750, 'tick'], [2200, 'ping'], [3500, 'pop2']],
      draw(p) {
        const target = [30, 6], enter = easeInOut(seg(p, 0.05, 0.3));
        const cx = lerp(54, target[0], enter), cy = lerp(-8, target[1], enter);
        const pin = easeOutBack(seg(p, 0.32, 0.45)), card = easeOutBack(seg(p, 0.45, 0.58));
        const text = 'Love it!'.slice(0, Math.floor(seg(p, 0.55, 0.78) * 9));
        const heart = easeOutBack(seg(p, 0.82, 0.92));
        const away = easeInOut(seg(p, 0.5, 0.75));
        return {
          cursor: { x: lerp(cx, 44, away), y: lerp(cy, 20, away), scale: p > 0.3 && p < 0.38 ? 0.88 : 1, op: seg(p, 0.03, 0.09) * (1 - seg(p, 0.86, 0.96)) },
          pin: { x: target[0], y: target[1] + 6.5, scale: pin, op: pin > 0 ? 1 : 0 },
          card: { x: target[0] - 15, y: target[1] - 17, scale: card, op: card > 0 ? 1 : 0, text, heart },
          pieces: PIECES.map(() => pose(0)),
        };
      },
    },
    colorpick: {
      label: 'Colour picker',
      note: 'A cursor clicks the purple piece and a colour picker opens below the logo. The cursor tries the swatches one by one, the piece changing colour with each, then comes back to purple. The picker closes.',
      fwd: 3400, hold: 300, rev: 1100,
      cues: [[0, 'pop'], [850, 'pop'], [1250, 'tick'], [1650, 'tick'], [2050, 'tick'], [2450, 'tick'], [2850, 'ping'], [4300, 'pop2']],
      draw(p) {
        const swX = i => 3 + 3.6 + i * 5.7, SWY = 38 + 4, popP = easeOutBack(seg(p, 0.2, 0.32));
        const order = [4, 0, 2, 3, 1];                        // blue, green, red, orange, back to purple
        const hop = seg(p, 0.32, 0.88) * order.length, k = Math.min(order.length - 1, Math.floor(hop)), t = hop - k;
        const cur = order[k], prev = k ? order[k - 1] : 1;
        const sel = lerp(prev, cur, easeInOut(Math.min(1, t * 2)));
        const click = [PIECES[1].cx + 3, PIECES[1].cy + 3];
        const enter = easeInOut(seg(p, 0.04, 0.2));
        const onPop = p > 0.32 && p < 0.9;
        const px = lerp(54, click[0], enter), py = lerp(-8, click[1], enter);
        const sx = swX(sel), sy = SWY;
        const toPop = easeInOut(seg(p, 0.3, 0.36)), back = easeInOut(seg(p, 0.88, 0.95));
        const cx = p < 0.3 ? px : lerp(lerp(click[0], sx, toPop), click[0], back), cy = p < 0.3 ? py : lerp(lerp(click[1], sy, toPop), click[1], back);
        const colorIdx = p < 0.32 ? 1 : Math.round(sel);
        const mixed = mix(PIECES[prev].color, PIECES[cur].color, easeInOut(Math.min(1, t * 2)));
        return {
          pop: { x: 3, y: 38, scale: popP * (1 - seg(p, 0.9, 0.97)) , op: popP > 0 && p < 0.97 ? 1 : 0, sel },
          cursor: { x: cx, y: cy, scale: 1, op: seg(p, 0.03, 0.09) * (1 - seg(p, 0.96, 1)) },
          pieces: PIECES.map((pc, i) => pose(i, i === 1 && p >= 0.32 && p < 0.9 ? { fill: mixed, scale: 1 + 0.06 * Math.sin(Math.PI * Math.min(1, t * 2)) } : {})),
        };
      },
    },
    redline: {
      label: 'Redlines',
      note: 'A cursor hovers over the mark and red measurement lines draw out to each edge of the square with their distances in little red labels, as if you held alt. They fade away.',
      fwd: 2400, hold: 700, rev: 1100,
      cues: [[0, 'pop'], [600, 'tick'], [850, 'tick'], [1100, 'tick'], [1350, 'tick'], [3100, 'pop2']],
      draw(p) {
        const C = '#f24822', M = { l: 9, t: 4.8, r: 26.4, b: 31.2 };
        const e = i => easeOutBack(seg(p, 0.2 + i * 0.1, 0.35 + i * 0.1)), op = seg(p, 0.2, 0.3) * (1 - 0);
        const lines = [
          { x1: 0, y1: 18, x2: lerp(0, M.l, e(0)), y2: 18 }, { x1: 17.7, y1: 0, x2: 17.7, y2: lerp(0, M.t, e(1)) },
          { x1: 36, y1: 18, x2: lerp(36, M.r, e(2)), y2: 18 }, { x1: 17.7, y1: 36, x2: 17.7, y2: lerp(36, M.b, e(3)) },
        ].map(l => ({ ...l, color: C, op: seg(p, 0.2, 0.28), w: 0.5 }));
        const lab = (i, x, y, text) => ({ x, y, text, color: C, op: seg(p, 0.3 + i * 0.1, 0.38 + i * 0.1) });
        const enter = easeInOut(seg(p, 0.04, 0.22));
        return {
          cursor: { x: lerp(54, 20, enter), y: lerp(-8, 14, enter), scale: 1, op: seg(p, 0.03, 0.08) },
          lines,
          labels: [lab(0, 4.5, 14, '9'), lab(1, 22.5, 2.4, '4.8'), lab(2, 31.2, 14, '9.6'), lab(3, 22.5, 33.6, '4.8')],
          pieces: PIECES.map(() => pose(0)),
        };
      },
    },
    duplicate: {
      label: 'Alt-drag copy',
      note: 'A cursor holds alt and drags the mark off the square: a copy comes away and settles in the corner, shrunk. Then it folds back into the original.',
      fwd: 2200, hold: 500, rev: 1300,
      cues: [[0, 'pop'], [500, 'tick'], [1200, 'pop'], [3200, 'pop2']],
      draw(p) {
        const enter = easeInOut(seg(p, 0.05, 0.25)), drag = easeInOut(seg(p, 0.3, 0.8));
        const dxEnd = 24, dyEnd = 9;
        const cx = lerp(lerp(54, 20, enter), 20 + dxEnd, drag), cy = lerp(lerp(-8, 16, enter), 16 + dyEnd, drag);
        const sc = lerp(1, 0.45, drag);
        return {
          cursor: { x: cx, y: cy, scale: p > 0.28 && p < 0.84 ? 0.9 : 1, op: seg(p, 0.03, 0.09) },
          dup: { x: dxEnd * drag, y: dyEnd * drag, scale: sc, op: seg(p, 0.3, 0.34) },
          pieces: PIECES.map(() => pose(0)),
        };
      },
    },
    spin: {
      label: 'Spin',
      note: 'The whole mark spins a full turn, with each piece turning a little behind the one before it, and the square squashes in time.',
      fwd: 1400, hold: 200, rev: 1200,
      cues: [[0, 'pop'], [300, 'whoosh'], [1800, 'pop2']],
      draw(p) {
        return {
          mark: { rot: 360 * easeInOut(p), scale: 1 + 0.12 * Math.sin(Math.PI * p), x: MARK.x, y: MARK.y },
          pieces: PIECES.map((pc, i) => pose(i, { rot: 120 * easeInOut(seg(p, i * 0.08, 0.6 + i * 0.08)) * (i % 2 ? -1 : 1) })),
        };
      },
    },
    wave: {
      label: 'Wave',
      note: 'A ripple runs through the pieces one after another, each swelling and lifting as it passes, and again on the way back.',
      fwd: 1500, hold: 200, rev: 1500,
      cues: [[0, 'pop'], [200, 'tick'], [400, 'tick'], [600, 'tick'], [800, 'tick'], [1000, 'tick'], [2100, 'pop2']],
      draw(p) {
        return {
          pieces: PIECES.map((pc, i) => {
            const b = near(p, 0.18 + i * 0.16, 0.1);
            return pose(i, { y: -4 * b, scale: 1 + 0.35 * b, rot: (i % 2 ? 1 : -1) * 12 * b });
          }),
        };
      },
    },
    gravity: {
      label: 'Gravity',
      note: 'The pieces drop out of the square one by one, bouncing as they land at the bottom. Then they float back up into place.',
      fwd: 1700, hold: 400, rev: 1300,
      cues: [[0, 'pop'], [300, 'thud'], [450, 'thud'], [600, 'thud'], [750, 'thud'], [900, 'thud'], [2400, 'pop2']],
      draw(p) {
        const spread = [-6, -2, 3, 8, 12];
        return {
          pieces: PIECES.map((pc, i) => {
            const e = easeOutBounce(seg(p, i * 0.09, i * 0.09 + 0.55));
            const floorY = 43 - pc.cy;
            return pose(i, { x: spread[i] * e, y: floorY * e, rot: (i % 2 ? 1 : -1) * 18 * e });
          }),
        };
      },
    },
    theme: {
      label: 'Colour flood',
      note: 'The mark turns white while the square floods through the five brand colours, one after another, and settles on blue. Then it drains back to black.',
      fwd: 1400, hold: 500, rev: 1200,
      cues: [[0, 'pop'], [250, 'tick'], [420, 'tick'], [590, 'tick'], [760, 'tick'], [930, 'tick'], [2100, 'pop2']],
      draw(p) {
        const n = PIECES.length, u = seg(p, 0.1, 0.9) * n;
        const k = Math.min(n - 1, Math.floor(u)), t = u - k;
        const from = k === 0 ? '#000000' : PIECES[k - 1].color;
        const white = seg(p, 0.05, 0.3);
        return {
          bgFill: mix(from, PIECES[k].color, easeInOut(Math.min(1, t * 1.6))),
          mark: { rot: 0, scale: 1 + 0.06 * Math.sin(Math.PI * Math.min(1, u % 1)), x: MARK.x, y: MARK.y },
          pieces: PIECES.map((pc, i) => pose(i, { fill: mix(pc.color, '#ffffff', white) })),
        };
      },
    },
    fan: {
      label: 'Fan',
      note: 'The pieces fan out like a hand of cards from the bottom of the mark, each a little further round, then fold back.',
      fwd: 1300, hold: 700, rev: 1200,
      cues: [[0, 'pop'], [200, 'tick'], [320, 'tick'], [440, 'tick'], [560, 'tick'], [680, 'tick'], [2000, 'pop2']],
      draw(p) {
        return {
          pieces: PIECES.map((pc, i) => {
            const e = easeOutBack(seg(p, i * 0.06, i * 0.06 + 0.5)), a = (i - 2) * 22 * Math.PI / 180 * e;
            const ox = 18, oy = 38, dx = pc.cx - ox, dy = pc.cy - oy;
            const nx = ox + dx * Math.cos(a) - dy * Math.sin(a), ny = oy + dx * Math.sin(a) + dy * Math.cos(a);
            return pose(i, { x: nx - pc.cx, y: ny - pc.cy, rot: a * 180 / Math.PI });
          }),
        };
      },
    },
  };

  // ── Rendering ──
  function radius(root) {
    const width = root.getBoundingClientRect().width;
    const px = parseFloat(getComputedStyle(root.querySelector('button')).borderRadius);
    return width && px ? px / width * 36 : 10.5;
  }
  function refs(root) {
    const all = sel => [...root.querySelectorAll(sel)];
    return {
      root, r0: radius(root),
      halo: root.querySelector('.figma-logo__halo'), bg: root.querySelector('.figma-logo__bg'),
      mark: root.querySelector('.figma-logo__mark'), pieces: all('.figma-logo__mark .figma-logo__piece'),
      select: root.querySelector('.figma-logo__select'), selRect: root.querySelector('.figma-logo__sel-rect'), handles: all('.figma-logo__sel-h'),
      cursor: root.querySelector('.figma-logo__cursor'),
      cursor2: root.querySelector('.figma-logo__cursor2'),
      select2: root.querySelector('.figma-logo__select2'), selRect2: root.querySelector('.figma-logo__sel-rect2'), handles2: all('.figma-logo__sel-h2'),
      lines: all('.figma-logo__ln'), labels: all('.figma-logo__lbl'),
      penPath: root.querySelector('.figma-logo__pen-path'), penAnchors: all('.figma-logo__pen-a'),
      pin: root.querySelector('.figma-logo__pin'), card: root.querySelector('.figma-logo__card'),
      cardText: root.querySelector('.figma-logo__card-text'), cardHeart: root.querySelector('.figma-logo__heart'),
      pop: root.querySelector('.figma-logo__pop'), swatches: all('.figma-logo__sw'), swRing: root.querySelector('.figma-logo__sw-ring'),
      dup: root.querySelector('.figma-logo__dup'),
      bez: root.querySelector('.figma-logo__bez'), bezOutline: root.querySelector('.figma-logo__bez-outline'), bezHandles: root.querySelector('.figma-logo__bez-handles'),
      bezLines: all('.figma-logo__bez-line'), bezAnchors: all('.figma-logo__bez-anchor'), bezKnobs: all('.figma-logo__bez-knob'),
    };
  }
  function timeAt(v, ms) {
    if (ms < v.fwd) return { p: ms / v.fwd, h: null };
    if (ms < v.fwd + v.hold) return { p: 1, h: ms - v.fwd };
    return { p: v.rev ? clamp(1 - (ms - v.fwd - v.hold) / v.rev, 0, 1) : 1, h: null };
  }
  function render(k, v, ms) {
    const { p, h } = timeAt(v, ms);
    R0 = k.r0;
    const s = v.draw(p, h, ms, k);
    const square = s.bg || rr(0, 0, 36, 36, R0);
    k.bg.setAttribute('d', square);
    k.halo.setAttribute('d', square);
    k.bg.setAttribute('fill', s.bgFill || '#000000');
    const m = s.mark;
    k.mark.setAttribute('transform', m ? `translate(${m.x} ${m.y}) rotate(${f(m.rot)}) scale(${f(m.scale)}) translate(${-m.x} ${-m.y})` : '');
    k.pieces.forEach((el, i) => {
      const pc = PIECES[i], st = s.pieces[i];
      el.setAttribute('transform', `translate(${f(st.x)} ${f(st.y)}) translate(${pc.cx} ${pc.cy}) rotate(${f(st.rot)}) scale(${f(st.scale)}) translate(${-pc.cx} ${-pc.cy})`);
      el.setAttribute('fill', st.fill || pc.color);
    });
    const sl = s.select;
    k.select.setAttribute('opacity', sl ? f(sl.op) : 0);
    if (sl) {
      k.selRect.setAttribute('x', f(sl.x0)); k.selRect.setAttribute('y', f(sl.y0));
      k.selRect.setAttribute('width', f(sl.x1 - sl.x0)); k.selRect.setAttribute('height', f(sl.y1 - sl.y0));
      [[sl.x0, sl.y0], [sl.x1, sl.y0], [sl.x0, sl.y1], [sl.x1, sl.y1]].forEach(([x, y], i) => {
        k.handles[i].setAttribute('x', f(x - 1.9)); k.handles[i].setAttribute('y', f(y - 1.9));
      });
    }
    const bz = s.bez;
    k.bez.setAttribute('opacity', bz ? f(bz.op) : 0);
    if (bz) {
      k.bezOutline.setAttribute('d', bz.d);
      const hd = bz.handles;
      k.bezHandles.setAttribute('opacity', hd ? f(hd.op) : 0);
      if (hd) {
        [[hd.A, hd.c1], [hd.B, hd.c2]].forEach(([from, to], i) => {
          k.bezLines[i].setAttribute('x1', f(from[0])); k.bezLines[i].setAttribute('y1', f(from[1]));
          k.bezLines[i].setAttribute('x2', f(to[0])); k.bezLines[i].setAttribute('y2', f(to[1]));
          k.bezAnchors[i].setAttribute('x', f(from[0] - 1.9)); k.bezAnchors[i].setAttribute('y', f(from[1] - 1.9));
          k.bezKnobs[i].setAttribute('cx', f(to[0])); k.bezKnobs[i].setAttribute('cy', f(to[1]));
        });
      }
    }
    const sl2 = s.select2;
    k.select2.setAttribute('opacity', sl2 ? f(sl2.op) : 0);
    if (sl2) {
      k.selRect2.setAttribute('x', f(sl2.x0)); k.selRect2.setAttribute('y', f(sl2.y0));
      k.selRect2.setAttribute('width', f(sl2.x1 - sl2.x0)); k.selRect2.setAttribute('height', f(sl2.y1 - sl2.y0));
      [[sl2.x0, sl2.y0], [sl2.x1, sl2.y0], [sl2.x0, sl2.y1], [sl2.x1, sl2.y1]].forEach(([x, y], i) => {
        k.handles2[i].setAttribute('x', f(x - 1.9)); k.handles2[i].setAttribute('y', f(y - 1.9));
      });
    }
    if (sl) k.select.setAttribute('transform', s.selTransform || '');
    k.lines.forEach((el, i) => {
      const ln = s.lines && s.lines[i];
      el.setAttribute('opacity', ln ? f(ln.op) : 0);
      if (ln) {
        el.setAttribute('x1', f(ln.x1)); el.setAttribute('y1', f(ln.y1)); el.setAttribute('x2', f(ln.x2)); el.setAttribute('y2', f(ln.y2));
        el.setAttribute('stroke', ln.color); el.setAttribute('stroke-width', ln.w || 0.6);
      }
    });
    k.labels.forEach((el, i) => {
      const lb = s.labels && s.labels[i];
      el.setAttribute('opacity', lb ? f(lb.op) : 0);
      if (lb) {
        const w = 2.4 * lb.text.length + 3, rect = el.firstChild, text = el.lastChild;
        rect.setAttribute('width', f(w)); rect.setAttribute('x', f(-w / 2)); rect.setAttribute('y', -2); rect.setAttribute('fill', lb.color);
        text.setAttribute('y', 0.9); text.textContent = lb.text;
        el.setAttribute('transform', `translate(${f(lb.x)} ${f(lb.y)})`);
      }
    });
    const pn = s.pen;
    k.penPath.setAttribute('opacity', pn ? f(pn.op) : 0);
    k.penAnchors.forEach((el, i) => {
      const an = pn && pn.anchors && pn.anchors[i];
      el.setAttribute('opacity', an ? f(pn.op) : 0);
      if (an) { el.setAttribute('x', f(an[0] - 1.5)); el.setAttribute('y', f(an[1] - 1.5)); }
    });
    if (pn) { k.penPath.setAttribute('stroke-dashoffset', f(1 - pn.progress)); }
    const pi = s.pin;
    k.pin.setAttribute('opacity', pi ? f(pi.op) : 0);
    if (pi) k.pin.setAttribute('transform', `translate(${pi.x} ${pi.y}) scale(${f(pi.scale)})`);
    const cd = s.card;
    k.card.setAttribute('opacity', cd ? f(cd.op) : 0);
    if (cd) {
      k.card.setAttribute('transform', `translate(${cd.x} ${cd.y}) scale(${f(cd.scale)})`);
      k.cardText.textContent = cd.text;
      k.cardHeart.setAttribute('opacity', cd.heart > 0 ? 1 : 0);
      k.cardHeart.setAttribute('transform', `translate(18.6 3.4) scale(${f(cd.heart)})`);
    }
    const pp2 = s.pop;
    k.pop.setAttribute('opacity', pp2 ? f(pp2.op) : 0);
    if (pp2) {
      k.pop.setAttribute('transform', `translate(${pp2.x} ${pp2.y}) scale(${f(pp2.scale)})`);
      k.swatches.forEach((el, i) => { el.setAttribute('cx', 3.6 + i * 5.7); el.setAttribute('cy', 4); });
      k.swRing.setAttribute('cx', f(3.6 + pp2.sel * 5.7)); k.swRing.setAttribute('cy', 4);
    }
    const dp = s.dup;
    if (!k.dup.firstChild) [...k.mark.children].forEach(ch => k.dup.appendChild(ch.cloneNode(true)));
    k.dup.setAttribute('opacity', dp ? f(dp.op) : 0);
    if (dp) k.dup.setAttribute('transform', `translate(${f(dp.x)} ${f(dp.y)}) translate(${MARK.x} ${MARK.y}) scale(${f(dp.scale)}) translate(${-MARK.x} ${-MARK.y})`);
    const c2 = s.cursor2;
    k.cursor2.setAttribute('opacity', c2 ? f(c2.op) : 0);
    if (c2) k.cursor2.setAttribute('transform', `translate(${f(c2.x)} ${f(c2.y)}) scale(${f(c2.scale)})`);
    const c = s.cursor;
    k.cursor.setAttribute('opacity', c ? f(c.op) : 0);
    if (c) k.cursor.setAttribute('transform', `translate(${f(c.x)} ${f(c.y)}) scale(${f(c.scale)})`);
  }

  // ── Sound ──
  let ctx, master;
  function unlockAudio() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function tone(type, from, to, dur, peak, delay = 0) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.005 + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  const sfx = {
    pop() { tone('triangle', 300, 1400, 0.1, 0.4); },
    pop2() { tone('triangle', 1100, 280, 0.09, 0.3); },
    tick() { tone('sine', 1800, 1500, 0.03, 0.14); },
    ping() { tone('sine', 880, 880, 0.14, 0.3); tone('sine', 1320, 1320, 0.2, 0.28, 0.09); },
    copy() { tone('square', 1100, 1100, 0.025, 0.1); tone('square', 1500, 1500, 0.025, 0.1, 0.06); tone('sawtooth', 300, 1100, 0.22, 0.07, 0.1); },
    drop() { tone('sine', 220, 110, 0.12, 0.35); tone('triangle', 660, 1320, 0.14, 0.22, 0.06); },
    whoosh() { tone('sawtooth', 200, 900, 0.25, 0.08); },
    thud() { tone('sine', 140, 55, 0.14, 0.4); },
  };
  function sound(name, ...args) {
    if (!ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }

  // ── Playing ──
  const totalMs = v => v.fwd + v.hold + v.rev;
  // Plays variant v on root from the start; speed below 1 is slow motion (silent). Resolves when it is back.
  async function play(root, v, speed = 1) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const k = refs(root);
    const timers = speed === 1 ? v.cues.map(([at, ...cue]) => (at ? setTimeout(() => sound(...cue), at) : (sound(...cue), 0))) : [];
    try {
      const total = totalMs(v) / speed;
      await new Promise(resolve => {
        const t0 = performance.now();
        (function frame(now) {
          const t = clamp((now - t0) / total, 0, 1);
          render(k, v, t * totalMs(v));
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        })(t0);
      });
    } finally {
      timers.forEach(clearTimeout);
      render(k, v, 0);
      delete root.dataset.playing;
    }
  }

  // The playground drives the same pieces.
  window.figmaLogo = { variants: VARIANTS, refs, radius, render, totalMs, play, unlockAudio, sound };

  const triggers = document.querySelectorAll('.figma-logo-trigger');
  if (!triggers.length) return;
  // At rest the square takes its corner radius from the page rather than from the SVG's own markup.
  const rest = () => triggers.forEach(trigger => { if (!trigger.dataset.playing) render(refs(trigger), VARIANTS[DEFAULT], 0); });
  rest();
  window.addEventListener('resize', rest);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (reduceMotion.matches && !window.figmaLogoDebug) return;
    unlockAudio();
    play(trigger, VARIANTS[trigger.dataset.figmaVariant] || VARIANTS[DEFAULT]);
  }));
})();
