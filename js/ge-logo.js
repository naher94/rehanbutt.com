/**
 * GE Healthcare Logo → CT Scanner (home intro)
 *
 * Clicking the inline GE logo spins it once, flat, while the monogram shrinks
 * into the middle and a bore opens: the logo becomes a CT scanner's gantry (the
 * donut). The base slides up under it, the patient bed slides out of the bore
 * toward you, and the status lights blink. Then the whole thing plays back in
 * reverse, back to the logo.
 *
 * The SVG lives in _includes/ge-logo.svg. Everything is in SVG units (the logo
 * is 34 × 34). One number, p (0 = the logo, 1 = the scanner), drives every part,
 * so the way back is exactly the way in. Sounds are synthesized with Web Audio.
 */
(function () {
  'use strict';

  const triggers = document.querySelectorAll('.ge-logo-trigger');
  if (!triggers.length) return;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = t => t * t * (3 - 2 * t);
  const lerp = (a, b, u) => a + (b - a) * u;
  const easeInOut = t => 0.5 - Math.cos(Math.PI * t) / 2;
  const easeOut = t => 1 - (1 - t) ** 3;
  const easeOutBack = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  const C = 17;                                          // the logo's centre
  const PURPLE = '#6022a6', WHITE = '#ffffff';
  const RING_WIDTH = 0.75, RING_OUTER = 16;                // the logo's own outline: its width, and its outer radius
  // The scanner's end state, as drawn in Sketch (GE Scanner - End State). The bore is centred, the bed
  // runs from the bore's lower edge out to a slab and pedestal, and the base is a trapezoid behind
  // the gantry.
  const BED = { top: 25, w0: 4.21, reach: 14.12, spread: 8.79, slab: 2.08, pedestalHalf: 7.2, pedestal: 4.94 };

  // The animation options. fwd, hold and rev are the milliseconds to scanner, to pause there (the
  // lights blink), and to get back. cues are [ms, sound, ...args].
  const CUES = [
    [0, 'whoosh', 0.8, 300, 1800, 0.22], [570, 'bleep'], [1170, 'slide'], [1660, 'motor'], [2470, 'thud', 0.3, 180],
    [2700, 'beep'], [2960, 'beep'], [3220, 'beep'],
    [3700, 'motor'], [4300, 'slide'], [4700, 'bleep'], [4750, 'whoosh', 0.7, 1800, 300, 0.2],
  ];
  // look is how the scanner ends up (each is a frame in Sketch): the bore and its housing ring, which
  // of the two is on top, whether the bed has a pedestal, timing: when (as p) the base pops and the bed extends, the status lights as [x, y, radius] (lightColor, and blink:
  // 'full' for a bright on/off blink with a pop and a soft glow of glow x the light's radius), ringWidth: if set, the
  // purple outline is redrawn as a circle that thickens to that width as the bore opens, and ringColor
  // is the color it turns; slab is the color of the bed's front edge.
  const VARIANTS = {
    scanner: {
      label: 'Spin into a CT scanner',
      note: 'The logo spins flat while the monogram shrinks into the middle and a bore opens. The base pops out from behind the ring, the bed slides out of the bore, the lights blink, then it all plays back in reverse.',
      fwd: 2600, hold: 900, rev: 2000, cues: CUES,
      look: { boreR: 8.4, housingR: 9.5, boreFill: 'url(#ge-logo-bore)', boreStroke: '#6b7180', boreStrokeWidth: 0.5, housing: '#d5d9e2', housingOnTop: false, pedestal: true,
        lights: [[3.75, 16.25, 0.55], [5.25, 16.25, 0.55], [3.75, 17.75, 0.55], [5.25, 17.75, 0.55]], lightColor: '#35d07f', blink: false, glow: 0, timing: { base: [0.42, 0.62], bed: [0.62, 0.9] }, ringWidth: 0, ringColor: PURPLE, slab: '#d5d9e2' },
    },
    simple: {
      label: 'Spin into a CT scanner (simple)',
      note: 'The same, with a simpler end state: a flat dark bore with no ring around it, a single status light, a bed with no pedestal, and a purple outline that thickens and turns gray as the bore opens, so the ring, base and bed are all the same gray.',
      fwd: 2600, hold: 900, rev: 2000, cues: CUES.filter(c => c[1] !== 'thud'),
      look: { boreR: 9.9, housingR: 0, boreFill: '#2b2f38', boreStroke: 'none', boreStrokeWidth: 0, housing: '#9aa1ad', housingOnTop: true, pedestal: false,
        lights: [[5.05, 17, 1.7]], lightColor: '#12b76a', blink: 'full', glow: 2.1, timing: { base: [0.42, 0.62], bed: [0.62, 0.9] }, ringWidth: 2, ringColor: '#9aa1ad', slab: '#9aa1ad' },
    },
  };
  // The simple scanner again, with the bed's top and front edge as a single shape.
  VARIANTS.simpleOne = {
    ...VARIANTS.simple,
    label: 'Spin into a CT scanner (simple, one-piece bed)',
    note: 'The simple scanner with the bed drawn as a single shape: the trapezoid and its front edge are one outline, so there is no seam between them.',
    look: { ...VARIANTS.simple.look, singleBed: true },
  };
  // The simple, one-piece-bed scanner with the status light in GE purple.
  VARIANTS.purpleLight = {
    ...VARIANTS.simpleOne,
    label: 'Spin into a CT scanner (simple, one-piece bed, purple light)',
    note: 'The simple, one-piece-bed scanner with the blinking light (and its glow) in GE purple instead of green.',
    look: { ...VARIANTS.simpleOne.look, lightColor: PURPLE },
  };

  // The one-piece-bed scanner with the base and the bed moving at the same time, so the scanner
  // comes together faster. The slide and motor sounds overlap.
  VARIANTS.together = {
    ...VARIANTS.simpleOne,
    label: 'Spin into a CT scanner (base and bed together)',
    note: 'The simple, one-piece-bed scanner where the base pops out from behind the ring while the bed slides out of the bore, both at once.',
    cues: [
      [0, 'whoosh', 0.8, 300, 1800, 0.22], [570, 'bleep'], [1170, 'slide'], [1220, 'motor'],
      [2700, 'beep'], [2960, 'beep'], [3220, 'beep'],
      [3800, 'slide'], [3850, 'motor'], [4700, 'bleep'], [4750, 'whoosh', 0.7, 1800, 300, 0.2],
    ],
    look: { ...VARIANTS.simpleOne.look, timing: { base: [0.45, 0.85], bed: [0.45, 0.85] } },
  };
  // The one the home page plays (the playground starts on it too).
  const DEFAULT_VARIANT = 'purpleLight';
  window.geLogoVariants = VARIANTS;
  window.geLogoDefaultVariant = DEFAULT_VARIANT;

  // Calls fn(t) every frame for `duration` ms; resolves after fn(1).
  function drive(duration, fn) {
    return new Promise(resolve => {
      const t0 = performance.now();
      (function frame(now) {
        const t = clamp((now - t0) / duration, 0, 1);
        fn(t);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      })(t0);
    });
  }

  // ── Sound ──
  let ctx, master, noiseBuf;
  function unlockAudio() {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function envelope(t, peak, attack, release) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    return g;
  }
  function noise(t, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.start(t);
    src.stop(t + dur);
    return src;
  }
  function sweep(type, from, to, dur, peak, attack = 0.005) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(envelope(t, peak, attack, dur)).connect(master);
    o.start(t);
    o.stop(t + dur + attack + 0.05);
  }
  const sfx = {
    whoosh(dur, from, to, peak = 0.25) {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.4;
      f.frequency.setValueAtTime(from, t);
      f.frequency.exponentialRampToValueAtTime(to, t + dur);
      noise(t, dur).connect(f).connect(envelope(t, peak, dur * 0.45, dur * 0.55)).connect(master);
    },
    bleep() { sweep('sine', 700, 1500, 0.14, 0.22, 0.01); },
    beep() { sweep('sine', 920, 920, 0.09, 0.2, 0.004); },
    // A mechanical slide: a short band of noise rising a little.
    slide() { sfx.whoosh(0.4, 220, 700, 0.16); },
    // A soft motor: a low saw rising, under a low-pass.
    motor() {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.7);
      o.connect(f).connect(envelope(t, 0.1, 0.12, 0.6)).connect(master);
      o.start(t);
      o.stop(t + 0.85);
    },
    thud(peak = 0.7, from = 150) { sweep('sine', from, 50, 0.18, peak, 0.004); },
  };
  // ge-playground.html sets window.geLogoDebug to log cues, mute them, and replay them in time.
  function sound(name, ...args) {
    const debug = window.geLogoDebug;
    if (debug && debug.onSound) debug.onSound(name, args);
    if ((debug && debug.mute) || !ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }
  window.geLogoSound = (name, ...args) => { unlockAudio(); sound(name, ...args); };

  // ── The scanner, as a function of p ──
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => {
    const a = hex(c1), b = hex(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  // A polygon with its corners rounded by r (each corner cut back along its edges and curved).
  function rounded(pts, r) {
    const f = n => n.toFixed(2);
    return pts.map((p, i) => {
      const prev = pts[(i + pts.length - 1) % pts.length], next = pts[(i + 1) % pts.length];
      const toward = q => {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, k = Math.min(r, d / 2) / d;
        return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
      };
      const a = toward(prev), b = toward(next);
      return `${i ? 'L' : 'M'}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
    }).join('') + 'z';
  }

  // p runs 0 → 1 going in and 1 → 0 coming back; light is how bright the status lights are.
  function render(k, p, light, look) {
    const spin = 360 * easeInOut(seg(p, 0, 0.35));
    const monoScale = 1 - 0.72 * smooth(seg(p, 0.08, 0.36));
    const monoOpacity = 1 - smooth(seg(p, 0.22, 0.36));
    const open = easeOut(seg(p, 0.1, 0.4));
    const boreR = look.boreR * open;
    const pulse = 1 + 0.035 * Math.sin(Math.PI * seg(p, 0.36, 0.5));
    // The base starts tucked up behind the gantry (narrow and high, so the face hides it) and pops
    // out downward, widening, with a little overshoot.
    const tb = look.timing.base;
    const baseY = -12 * (1 - easeOutBack(seg(p, tb[0], tb[1])));
    const baseX = lerp(0.5, 1, easeOut(seg(p, tb[0], tb[1])));
    const e = easeOut(seg(p, look.timing.bed[0], look.timing.bed[1]));                 // how far the bed is out
    const pedestal = look.pedestal ? BED.pedestal * smooth(seg(p, 0.88, 0.98)) : 0;

    k.gantry.setAttribute('transform', `translate(${C} ${C}) scale(${pulse.toFixed(4)}) translate(${-C} ${-C})`);
    k.mono.setAttribute('transform',
      `rotate(${spin.toFixed(2)} ${C} ${C}) translate(${C} ${C}) scale(${monoScale.toFixed(4)}) translate(${-C} ${-C})`);
    k.mono.setAttribute('opacity', monoOpacity.toFixed(3));
    k.monoPath.setAttribute('fill', mix(PURPLE, WHITE, smooth(seg(p, 0.14, 0.3))));
    k.bore.setAttribute('r', boreR.toFixed(3));
    k.housing.setAttribute('r', (look.housingR * open).toFixed(3));
    if (look.ringWidth) {
      const w = lerp(RING_WIDTH, look.ringWidth, open);
      k.ringLine.setAttribute('stroke-width', w.toFixed(3));
      k.ringLine.setAttribute('stroke', mix(PURPLE, look.ringColor, open));
      k.ringLine.setAttribute('r', (RING_OUTER - w / 2).toFixed(3));
    }
    k.base.setAttribute('transform', `translate(${C} ${baseY.toFixed(2)}) scale(${baseX.toFixed(4)} 1) translate(${-C} 0)`);

    // The bed: a trapezoid from the bore's lower edge, widening as it comes toward you, with a slab
    // across its front edge and a pedestal under that. Corners are rounded a little, as drawn.
    const y1 = BED.top + BED.reach * e, w1 = BED.w0 + BED.spread * e;
    const bedPts = look.singleBed
      ? [[C - BED.w0, BED.top], [C + BED.w0, BED.top], [C + w1, y1], [C + w1, y1 + BED.slab], [C - w1, y1 + BED.slab], [C - w1, y1]]
      : [[C - BED.w0, BED.top], [C + BED.w0, BED.top], [C + w1, y1], [C - w1, y1]];
    const top = e > 0.002 ? rounded(bedPts, 1) : '';
    const slab = e > 0.002 && !look.singleBed ? rounded([[C - w1, y1], [C + w1, y1], [C + w1, y1 + BED.slab], [C - w1, y1 + BED.slab]], 0) : '';
    const ped = pedestal > 0.01 && e > 0.002
      ? rounded([[C - BED.pedestalHalf, y1 + 1.04], [C + BED.pedestalHalf, y1 + 1.04], [C + BED.pedestalHalf, y1 + 1.04 + pedestal], [C - BED.pedestalHalf, y1 + 1.04 + pedestal]], 0.5) : '';
    k.bedTop.setAttribute('d', top);
    k.slab.setAttribute('d', slab);
    k.pedestal.setAttribute('d', ped);
    k.haloBed.setAttribute('d', top + slab + ped);

    k.lights.forEach((el, i) => {
      const r = (look.lights[i] || [0, 0, 0])[2];
      el.setAttribute('opacity', light.opacity.toFixed(3));
      el.setAttribute('r', (r * (1 + 0.4 * light.pop)).toFixed(3));
    });
    k.glows.forEach((el, i) => {
      const r = (look.lights[i] || [0, 0, 0])[2];
      el.setAttribute('opacity', (0.4 * light.pop * light.gate).toFixed(3));
      el.setAttribute('r', (r * look.glow * (1 + 0.15 * light.pop)).toFixed(3));
    });
  }

  // The status lights: dim as the scanner comes up, then three pulses while it holds. With a full
  // blink they are off until the pulses, and each pulse also pops the light and lights its glow.
  function lights(p, tHold, look) {
    const gate = smooth(seg(p, 0.94, 1));
    const pulse = tHold === null ? 0
      : [0.2, 0.5, 0.8].reduce((m, c) => Math.max(m, smooth(Math.max(0, 1 - Math.abs(tHold - c) / 0.14))), 0);
    if (look.blink === 'full') return { opacity: gate * pulse, pop: pulse, gate };
    return { opacity: gate * 0.35 + (tHold === null ? 0 : 0.65 * Math.max(0, pulse)), pop: 0, gate };
  }

  async function run(k, variant) {
    const total = variant.fwd + variant.hold + variant.rev, look = variant.look;
    k.bore.setAttribute('fill', look.boreFill);
    k.bore.setAttribute('stroke', look.boreStroke);
    k.bore.setAttribute('stroke-width', look.boreStrokeWidth);
    k.housing.setAttribute('stroke', look.housing);
    k.slab.setAttribute('fill', look.slab);
    k.ringArt.setAttribute('opacity', look.ringWidth ? 0 : 1);
    k.ringLine.setAttribute('opacity', look.ringWidth ? 1 : 0);
    if (look.housingOnTop) k.bore.after(k.housing); else k.bore.before(k.housing);
    k.lights.forEach((el, i) => {
      const [cx, cy, r] = look.lights[i] || [0, 0, 0];
      el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('r', r); el.setAttribute('fill', look.lightColor);
    });
    k.glows.forEach((el, i) => {
      const [cx, cy] = look.lights[i] || [0, 0];
      el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('fill', look.lightColor);
    });
    variant.cues.forEach(([at, ...cue]) => (at ? setTimeout(() => sound(...cue), at) : sound(...cue)));
    await drive(total, t => {
      const ms = t * total;
      let p, tHold = null;
      if (ms < variant.fwd) p = ms / variant.fwd;
      else if (ms < variant.fwd + variant.hold) { p = 1; tHold = (ms - variant.fwd) / variant.hold; }
      else p = 1 - (ms - variant.fwd - variant.hold) / variant.rev;
      render(k, p, lights(p, tHold, look), look);
    });
    render(k, 0, { opacity: 0, pop: 0, gate: 0 }, look);
    // Back to the logo's own outline artwork, exactly as it was.
    k.ringArt.setAttribute('opacity', 1);
    k.ringLine.setAttribute('opacity', 0);
  }

  async function play(root) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const one = sel => root.querySelector(sel);
    const k = {
      gantry: one('.ge-logo__gantry'),
      mono: one('.ge-logo__mono'),
      monoPath: one('.ge-logo__mono-path'),
      bore: one('.ge-logo__bore'),
      ringArt: one('.ge-logo__ring-art'),
      ringLine: one('.ge-logo__ring-line'),
      housing: one('.ge-logo__housing'),
      base: one('.ge-logo__base'),
      bedTop: one('.ge-logo__bed-top'),
      slab: one('.ge-logo__slab'),
      pedestal: one('.ge-logo__pedestal'),
      haloBed: one('.ge-logo__halo-bed'),
      lights: [...root.querySelectorAll('.ge-logo__light')],
      glows: [...root.querySelectorAll('.ge-logo__glow')],
    };
    try {
      await run(k, VARIANTS[root.dataset.geVariant] || VARIANTS[DEFAULT_VARIANT]);
    } finally {
      delete root.dataset.playing;
    }
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (reduceMotion.matches && !window.geLogoDebug) return;
    unlockAudio();
    play(trigger);
  }));
})();
