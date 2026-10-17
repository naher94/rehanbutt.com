/**
 * Figma Logo (home intro)
 *
 * Clicking the inline Figma logo clears the mark and two collaborators' cursors redraw it at once.
 * Yours (blue) drags out the red shape, then alt-drags a copy of it down and recolours it to make
 * the purple one, then drags out the green. A second cursor (purple) drags out the orange and then
 * the blue. Each shape pops into colour when its drag is released, and it ends on the finished logo.
 *
 * The SVG lives in _includes/figma-logo.svg. Everything is in SVG units (the black square is
 * 36 × 36), and the whole thing is a function of time alone. Sounds are synthesized with Web Audio.
 */
(function () {
  'use strict';

  const triggers = document.querySelectorAll('.figma-logo-trigger');
  if (!triggers.length) return;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeInOut = t => 0.5 - Math.cos(Math.PI * t) / 2;
  const easeOutBack = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);
  const f = n => +n.toFixed(2);
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => {
    const a = hex(c1), b = hex(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  // The black square's corner radius in SVG units. It is a fixed length in CSS (the button's border-radius,
  // 7px on desktop and 5px below), as it was on the static logo, so it depends on how big the logo is drawn.
  let R0 = 10.5;
  const rr = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}` +
      `V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
  };

  // The five pieces of the mark, in drawing order, with the centre of each in the logo (the square is 36 wide).
  const PIECES = [
    { cx: 13.35, cy: 26.8, color: '#0acf83' },   // green
    { cx: 13.35, cy: 18, color: '#a259ff' },     // purple
    { cx: 13.35, cy: 9.2, color: '#f24e1e' },    // red
    { cx: 22.05, cy: 9.2, color: '#ff7262' },    // orange
    { cx: 22.05, cy: 18, color: '#1abcfe' },     // blue
  ];
  const SRC = 2, COPY = 1;                                  // the purple piece is a copy of the red one, dragged down
  const GAP = PIECES[COPY].cy - PIECES[SRC].cy;

  // Each cursor draws its pieces in turn: a piece is { idx, t0, d } (when its slot starts and how long it takes, as
  // fractions of the run). Yours draws red, copies it to purple, draws green; the other draws orange, then blue.
  const PLAN_A = [{ idx: 2, t0: 0.1, d: 0.2 }, { idx: 1, t0: 0.3, d: 0.2 }, { idx: 0, t0: 0.5, d: 0.2 }];
  const PLAN_B = [{ idx: 3, t0: 0.16, d: 0.22 }, { idx: 4, t0: 0.4, d: 0.22 }];
  const START_A = [-15.2, -11], START_B = [52.7, 45];      // both 44 units from the logo's centre

  const TOTAL = 4200;
  // [ms, sound]: a tick as each drag starts and a pop as it is released, with their own sounds for the copy.
  const CUES = (() => {
    const list = [[0, 'pop2']];
    [...PLAN_A, ...PLAN_B].forEach(({ idx, t0, d }) => {
      const copy = idx === COPY;
      list.push([Math.round((t0 + d * 0.3) * 3900), copy ? 'copy' : 'tick'], [Math.round((t0 + d * 0.75) * 3900), copy ? 'drop' : 'pop']);
    });
    list.push([4300, 'ping']);
    return list.sort((x, y) => x[0] - y[0]);
  })();

  const S = i => [PIECES[i].cx - 4.35, PIECES[i].cy - 4.4];                       // a piece's top left corner
  const E = i => (i === COPY ? [PIECES[i].cx, PIECES[i].cy] : [PIECES[i].cx + 4.35, PIECES[i].cy + 4.4]);   // and where its drag ends
  const lerp2 = (a, b, m) => [lerp(a[0], b[0], m), lerp(a[1], b[1], m)];

  // Where one cursor is, its drag box, and whether it is pressed, at p (0 to 1).
  function cursorAt(p, plan, start) {
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
  }

  // ── Rendering ──
  function radius(root) {
    const width = root.getBoundingClientRect().width;
    const px = parseFloat(getComputedStyle(root.querySelector('button')).borderRadius);
    return width && px ? px / width * 36 : 10.5;
  }
  function refs(root) {
    const all = sel => [...root.querySelectorAll(sel)];
    return {
      r0: radius(root),
      halo: root.querySelector('.figma-logo__halo'), bg: root.querySelector('.figma-logo__bg'),
      pieces: all('.figma-logo__piece'),
      select: root.querySelector('.figma-logo__select'), selRect: root.querySelector('.figma-logo__sel-rect'), handles: all('.figma-logo__sel-h'),
      select2: root.querySelector('.figma-logo__select2'), selRect2: root.querySelector('.figma-logo__sel-rect2'), handles2: all('.figma-logo__sel-h2'),
      cursor: root.querySelector('.figma-logo__cursor'), cursor2: root.querySelector('.figma-logo__cursor2'),
    };
  }
  function drawFrame(group, rect, handles, fr) {
    group.setAttribute('opacity', fr ? f(fr.op) : 0);
    if (!fr) return;
    rect.setAttribute('x', f(fr.x0)); rect.setAttribute('y', f(fr.y0));
    rect.setAttribute('width', f(fr.x1 - fr.x0)); rect.setAttribute('height', f(fr.y1 - fr.y0));
    [[fr.x0, fr.y0], [fr.x1, fr.y0], [fr.x0, fr.y1], [fr.x1, fr.y1]].forEach(([x, y], i) => {
      handles[i].setAttribute('x', f(x - 1.9)); handles[i].setAttribute('y', f(y - 1.9));
    });
  }
  // ms is 0 to TOTAL; the pieces are as they sit in the logo at 0 and at the end.
  function render(k, ms) {
    const p = clamp(ms / 3900, 0, 1);
    R0 = k.r0;
    const square = rr(0, 0, 36, 36, R0);
    k.bg.setAttribute('d', square);
    k.halo.setAttribute('d', square);
    const A = cursorAt(p, PLAN_A, START_A), B = cursorAt(p, PLAN_B, START_B);
    const all = PLAN_A.concat(PLAN_B);
    k.pieces.forEach((el, i) => {
      const pc = PIECES[i], sl = all.find(q => q.idx === i), release = sl.t0 + sl.d * 0.75;
      const early = 1 - easeInOut(seg(p, 0.01 + i * 0.008, 0.07 + i * 0.008));       // the mark clears at the start
      let scale, y = 0, fill = pc.color;
      if (i === COPY) {
        // The copy comes out from under the red piece, still red, drags down and turns purple.
        const u = (p - sl.t0) / sl.d, d = easeInOut(seg(u, 0.3, 0.7));
        if (p < sl.t0) scale = early;
        else { scale = p < sl.t0 + sl.d * 0.3 ? 0 : 1; y = -GAP * (1 - d); fill = mix(PIECES[SRC].color, pc.color, seg(u, 0.62, 0.9)); }
      } else scale = p < release ? early : easeOutBack(seg(p, release, release + sl.d * 0.25));
      el.setAttribute('transform', `translate(0 ${f(y)}) translate(${pc.cx} ${pc.cy}) rotate(0) scale(${f(scale)}) translate(${-pc.cx} ${-pc.cy})`);
      el.setAttribute('fill', fill);
    });
    drawFrame(k.select, k.selRect, k.handles, A.frame);
    drawFrame(k.select2, k.selRect2, k.handles2, B.frame);
    k.cursor.setAttribute('opacity', f(A.op));
    k.cursor.setAttribute('transform', `translate(${f(A.pos[0])} ${f(A.pos[1])}) scale(${f(1 - 0.1 * A.press)})`);
    k.cursor2.setAttribute('opacity', f(B.op));
    k.cursor2.setAttribute('transform', `translate(${f(B.pos[0])} ${f(B.pos[1])}) scale(${f(1 - 0.1 * B.press)})`);
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
  };
  function sound(name) {
    if (!ctx || ctx.state !== 'running') return;
    sfx[name]();
  }

  // ── Playing ──
  async function play(root) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const k = refs(root);
    const timers = CUES.map(([at, name]) => (at ? setTimeout(() => sound(name), at) : (sound(name), 0)));
    try {
      await new Promise(resolve => {
        const t0 = performance.now();
        (function frame(now) {
          const t = clamp((now - t0) / TOTAL, 0, 1);
          render(k, t * TOTAL);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        })(t0);
      });
    } finally {
      timers.forEach(clearTimeout);
      render(k, 0);
      delete root.dataset.playing;
    }
  }

  // At rest the square takes its corner radius from the page rather than from the SVG's own markup.
  const rest = () => triggers.forEach(trigger => { if (!trigger.dataset.playing) render(refs(trigger), 0); });
  rest();
  window.addEventListener('resize', rest);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (reduceMotion.matches) return;
    unlockAudio();
    play(trigger);
  }));
})();
