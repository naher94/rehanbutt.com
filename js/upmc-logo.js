/**
 * UPMC Logo → Telehealth Laptop (home intro)
 *
 * Clicking the inline UPMC logo turns its purple square into a laptop: the square
 * empties into a grey screen frame and the base slides up under it. A stethoscope
 * pops in from the top left while a big heartbeat line draws across the screen,
 * then both pulse twice, lub-dub. Then it all plays back in reverse to the logo.
 *
 * The SVG lives in _includes/upmc-logo.svg. Everything is in SVG units (the square
 * is 100 × 100). The whole thing is a function of time alone: one number, p (0 =
 * the logo, 1 = the laptop), drives every part, so the way back is exactly the way
 * in. Sounds are synthesized with Web Audio.
 */
(function () {
  'use strict';

  const triggers = document.querySelectorAll('.upmc-logo-trigger');
  if (!triggers.length) return;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOutBack = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);
  const f = n => +n.toFixed(2);

  const PURPLE = '#771B61', GRAY = '#9aa1ad', WHITE = '#ffffff';
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => {
    const a = hex(c1), b = hex(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  const HALO = 8.4;                                      // the white border around every shape, doubled (half of it is hidden)
  const DROP = 4;                                        // how much lower the laptop lands than the square sat
  const BASE_GAP = 2.2;                                  // extra room so the base's border clears the screen frame
  const ECG_D = 'M49.92 46.49L63.12 46.49L68.07 39.89L73.01 46.49L77.97 46.49L82.92 26.69L89.52 61.34L94.47 46.49L99.41 46.49L104.37 41.54L109.32 46.49';
  const BASE_D = 'M-0.25 69.81H100.25V74.31C100.25 76.52 98.46 78.31 96.25 78.31H3.75C1.54 78.31 -0.25 76.52 -0.25 74.31Z';

  // The square's corner radius in SVG units. It is a fixed length in CSS (the button's border-radius, 7px
  // on desktop and 5px below), as it was on the static logo, so it depends on how big the logo is drawn.
  let R0 = 29;

  // Milliseconds to the laptop, to pause there (the pulses), and to get back; then the sounds, as [ms, sound, ...args].
  const FWD = 2400, HOLD = 1500, REV = 1500, TOTAL = FWD + HOLD + REV;
  const CUES = [[0, 'pop'], [720, 'tick'], [1250, 'send'], [2040, 'ping'], [2600, 'beat'], [3250, 'beat'], [4125, 'pop2'], [4700, 'pop2'], [5200, 'pop2']];

  const rr = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}` +
      `V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
  };
  const pivot = (x, y, sx, sy) => `translate(${x} ${y}) scale(${f(sx)} ${f(sy)}) translate(${-x} ${-y})`;

  // A smooth swell: eases up to amp a third of the way through, then eases back down, with no jump in speed at
  // the start, the peak or the end. Overlapping swells add into one continuous curve.
  const swell = (h, at, amp, dur) => {
    if (h === null) return 0;
    const u = (h - at) / dur;
    if (u <= 0 || u >= 1) return 0;
    const ss = x => x * x * (3 - 2 * x);
    return amp * (u < 0.33 ? ss(u / 0.33) : 1 - ss((u - 0.33) / 0.67));
  };

  // ── The state at p (0 to 1) and h (ms into the hold, or null) ──
  function stateAt(p, h) {
    const draw = seg(p, 0.52, 0.85), e = easeOutBack(draw);
    const k = easeOutBack(seg(p, 0.02, 0.3)), kf = seg(p, 0.1, 0.32), ks = seg(p, 0.08, 0.3), b = easeOutBack(seg(p, 0.3, 0.48));
    const beat = swell(h, 200, 0.12, 480) + swell(h, 390, 0.07, 440) + swell(h, 850, 0.12, 480) + swell(h, 1040, 0.07, 440);
    const pulse = 1 + beat;
    return {
      body: rr(lerp(0, 9.5, k), lerp(0, 10 + DROP, k), lerp(100, 81, k), lerp(100, 54, k), lerp(R0, 7, k)),
      bodyFill: mix(PURPLE, WHITE, kf), bodyStroke: 7 * ks, bodyHalo: 7 * ks + HALO,
      word: seg(p, 0, 0.15),
      baseOp: b > 0 ? 1 : 0, baseTy: (1 - b) * 26 + DROP + BASE_GAP,
      ecg: seg(p, 0.52, 0.85), ecgScale: pulse,
      glyphOp: seg(draw, 0, 0.25), glyphDx: -36 * (1 - e), glyphDy: -36 * (1 - e), glyphScale: 0.25 * (0.55 + 0.45 * e) * pulse,
    };
  }
  function timeAt(ms) {
    if (ms < FWD) return { p: ms / FWD, h: null };
    if (ms < FWD + HOLD) return { p: 1, h: ms - FWD };
    return { p: clamp(1 - (ms - FWD - HOLD) / REV, 0, 1), h: null };
  }

  // ── Rendering ──
  function radius(root) {
    const width = root.getBoundingClientRect().width;
    const px = parseFloat(getComputedStyle(root.querySelector('button')).borderRadius);
    return width && px ? px / width * 100 : 29;
  }
  function refs(root) {
    const one = sel => root.querySelector(sel);
    return {
      body: one('.upmc-logo__body'), bodyHalo: one('.upmc-logo__body-halo'),
      base: one('.upmc-logo__base'), baseHalo: one('.upmc-logo__base-halo'),
      word: one('.upmc-logo__word'), ecg: one('.upmc-logo__ecg'), ecgHalo: one('.upmc-logo__ecg-halo'),
      glyph: one('.upmc-logo__glyph'),
      r0: radius(root),
    };
  }
  function render(k, ms) {
    const { p, h } = timeAt(ms);
    R0 = k.r0;
    const s = stateAt(p, h);
    k.body.setAttribute('d', s.body);
    k.body.setAttribute('fill', s.bodyFill);
    k.body.setAttribute('stroke-width', f(s.bodyStroke));
    k.bodyHalo.setAttribute('d', s.body);
    k.bodyHalo.setAttribute('stroke-width', f(s.bodyHalo));
    k.word.setAttribute('opacity', f(1 - s.word));
    k.word.setAttribute('transform', pivot(50, 50, 1 - 0.45 * s.word, 1 - 0.45 * s.word));
    const baseMove = `translate(0 ${f(s.baseTy)})`;
    k.base.setAttribute('opacity', s.baseOp);
    k.base.setAttribute('transform', baseMove);
    k.baseHalo.setAttribute('opacity', s.baseOp);
    k.baseHalo.setAttribute('transform', baseMove);
    const ecgMove = `translate(0 ${DROP}) ${pivot(79.6, 44, s.ecgScale, s.ecgScale)}`;
    [k.ecg, k.ecgHalo].forEach(el => {
      el.setAttribute('opacity', s.ecg > 0 ? 1 : 0);
      el.setAttribute('stroke-dashoffset', f(1 - s.ecg));
      el.setAttribute('transform', ecgMove);
    });
    k.glyph.setAttribute('opacity', f(s.glyphOp));
    k.glyph.setAttribute('transform', `translate(${f(28.86 + s.glyphDx)} ${f(15.53 + s.glyphDy)}) scale(${f(s.glyphScale)}) rotate(-8) translate(-103.22 -100.09)`);
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
    send() { tone('sine', 600, 900, 0.09, 0.28); },
    beat() { tone('sine', 110, 55, 0.12, 0.5); tone('sine', 100, 50, 0.14, 0.4, 0.16); },
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
