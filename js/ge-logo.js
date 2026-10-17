/**
 * GE Healthcare Logo → CT Scanner (home intro)
 *
 * Clicking the inline GE logo spins it once, flat, while the monogram shrinks
 * into the middle and a bore opens: the logo becomes a CT scanner's gantry (the
 * donut). The base pops out from behind the ring, the patient bed slides out of
 * the bore toward you, and the status light blinks three times. Then the whole
 * thing plays back in reverse, back to the logo.
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
  const PURPLE = '#6022a6', WHITE = '#ffffff', GRAY = '#9aa1ad';
  const RING = { from: 0.75, to: 2, outer: 16 };         // the outline thickens as the bore opens; its outer edge stays put
  // The white outline around the gantry is about 1px at the size it sits in the intro: 1.43 units (1.2em is 34).
  // Around the logo it is measured from the artwork's edge; around the scanner, from the ring, like the bed and base.
  const HALO = { logo: 18.28, scanner: RING.outer + 1.43 };
  const BORE_R = 9.9;
  // The bed runs from the bore's lower edge out to a front edge, drawn as one shape with the top.
  const BED = { top: 25, w0: 4.21, reach: 14.12, spread: 8.79, front: 2.08 };
  const LIGHT_R = 1.7;                                   // the status light (its position is in the SVG)
  const GLOW = 2.1;                                      // its glow, as a multiple of its radius

  // Milliseconds to the scanner, to pause there (the light blinks), and to get back; then the sounds,
  // as [ms, sound, ...args].
  const FWD = 2600, HOLD = 900, REV = 2000;
  const CUES = [
    [0, 'whoosh', 0.8, 300, 1800, 0.22], [570, 'bleep'], [1170, 'slide'], [1660, 'motor'],
    [2700, 'beep'], [2960, 'beep'], [3220, 'beep'],
    [3700, 'motor'], [4300, 'slide'], [4700, 'bleep'], [4750, 'whoosh', 0.7, 1800, 300, 0.2],
  ];

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
  };
  function sound(name, ...args) {
    if (!ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }

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

  // p runs 0 → 1 going in and 1 → 0 coming back; light is the status light's brightness (opacity), its
  // pop (0 to 1, how big it swells with each blink), and gate (0 until the scanner is up).
  function render(k, p, light) {
    const spin = 360 * easeInOut(seg(p, 0, 0.35));
    const monoScale = 1 - 0.72 * smooth(seg(p, 0.08, 0.36));
    const monoOpacity = 1 - smooth(seg(p, 0.22, 0.36));
    const open = easeOut(seg(p, 0.1, 0.4));
    const pulse = 1 + 0.035 * Math.sin(Math.PI * seg(p, 0.36, 0.5));
    // The base starts tucked up behind the gantry (narrow and high, so the face hides it) and pops
    // out downward, widening, with a little overshoot.
    const baseY = -12 * (1 - easeOutBack(seg(p, 0.42, 0.62)));
    const baseX = lerp(0.5, 1, easeOut(seg(p, 0.42, 0.62)));
    const e = easeOut(seg(p, 0.62, 0.9));                // how far the bed is out

    k.gantry.setAttribute('transform', `translate(${C} ${C}) scale(${pulse.toFixed(4)}) translate(${-C} ${-C})`);
    k.mono.setAttribute('transform',
      `rotate(${spin.toFixed(2)} ${C} ${C}) translate(${C} ${C}) scale(${monoScale.toFixed(4)}) translate(${-C} ${-C})`);
    k.mono.setAttribute('opacity', monoOpacity.toFixed(3));
    k.monoPath.setAttribute('fill', mix(PURPLE, WHITE, smooth(seg(p, 0.14, 0.3))));
    k.bore.setAttribute('r', (BORE_R * open).toFixed(3));
    // The logo's outline is redrawn as a circle that thickens, and fades from purple to the scanner's gray.
    const w = lerp(RING.from, RING.to, open);
    k.ringLine.setAttribute('stroke-width', w.toFixed(3));
    k.ringLine.setAttribute('stroke', mix(PURPLE, GRAY, open));
    k.ringLine.setAttribute('r', (RING.outer - w / 2).toFixed(3));
    k.halo.setAttribute('r', lerp(HALO.logo, HALO.scanner, open).toFixed(3));
    k.base.setAttribute('transform', `translate(${C} ${baseY.toFixed(2)}) scale(${baseX.toFixed(4)} 1) translate(${-C} 0)`);

    // The bed: a trapezoid from the bore's lower edge, widening as it comes toward you, with the front
    // edge as part of the same outline. Corners are rounded a little.
    const y1 = BED.top + BED.reach * e, w1 = BED.w0 + BED.spread * e;
    const bed = e > 0.002 ? rounded([
      [C - BED.w0, BED.top], [C + BED.w0, BED.top], [C + w1, y1],
      [C + w1, y1 + BED.front], [C - w1, y1 + BED.front], [C - w1, y1],
    ], 1) : '';
    k.bedTop.setAttribute('d', bed);
    k.haloBed.setAttribute('d', bed);

    k.light.setAttribute('opacity', light.opacity.toFixed(3));
    k.light.setAttribute('r', (LIGHT_R * (1 + 0.4 * light.pop)).toFixed(3));
    k.glow.setAttribute('opacity', (0.4 * light.pop * light.gate).toFixed(3));
    k.glow.setAttribute('r', (LIGHT_R * GLOW * (1 + 0.15 * light.pop)).toFixed(3));
  }

  // The status light: off until the scanner is up, then three bright blinks while it holds. Each
  // blink also pops the light and lights its glow.
  function lights(p, tHold) {
    const gate = smooth(seg(p, 0.94, 1));
    const pulse = tHold === null ? 0
      : [0.2, 0.5, 0.8].reduce((m, c) => Math.max(m, smooth(Math.max(0, 1 - Math.abs(tHold - c) / 0.14))), 0);
    return { opacity: gate * pulse, pop: pulse, gate };
  }

  async function run(k) {
    const total = FWD + HOLD + REV;
    k.ringArt.setAttribute('opacity', 0);
    k.ringLine.setAttribute('opacity', 1);
    CUES.forEach(([at, ...cue]) => (at ? setTimeout(() => sound(...cue), at) : sound(...cue)));
    await drive(total, t => {
      const ms = t * total;
      let p, tHold = null;
      if (ms < FWD) p = ms / FWD;
      else if (ms < FWD + HOLD) { p = 1; tHold = (ms - FWD) / HOLD; }
      else p = 1 - (ms - FWD - HOLD) / REV;
      render(k, p, lights(p, tHold));
    });
    render(k, 0, { opacity: 0, pop: 0, gate: 0 });
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
      base: one('.ge-logo__base'),
      bedTop: one('.ge-logo__bed-top'),
      halo: one('.ge-logo__halo'),
      haloBed: one('.ge-logo__halo-bed'),
      light: one('.ge-logo__light'),
      glow: one('.ge-logo__glow'),
    };
    try {
      await run(k);
    } finally {
      delete root.dataset.playing;
    }
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (reduceMotion.matches) return;
    unlockAudio();
    play(trigger);
  }));
})();
