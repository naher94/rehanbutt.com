/**
 * UPMC Enterprises Logo → Telemedicine (home intro)
 *
 * Clicking the inline UPMC logo turns its purple square into something from a
 * virtual visit, then plays back in reverse to the logo. Several variants live
 * in VARIANTS (try them in upmc-playground.html): a chat bubble that gets a
 * typing indicator and a reply, a back-and-forth call, a video camera that goes
 * live, and a heartbeat drawn across the bubble.
 *
 * The SVG lives in _includes/upmc-logo.svg. Everything is in SVG units (the
 * square is 100 × 100). Each variant is a function of time alone, so the
 * playground can scrub it. Sounds are synthesized with Web Audio.
 */
(function () {
  'use strict';

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOutBack = t => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2);
  const f = n => +n.toFixed(2);

  const DEFAULT = 'laptop3';
  const PURPLE = '#771B61', GRAY = '#9aa1ad', WHITE = '#ffffff';
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => {
    const a = hex(c1), b = hex(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const HALO = 4.8;
  const ECG_D = 'M14 40H30L36 32L42 40H48L54 16L62 58L68 40H74L80 34L86 40';
  const BASE_D = 'M8 74H92V78C92 83 88 87 83 87H17C12 87 8 83 8 78Z';

  // The square's corner radius in SVG units. It is a fixed length in CSS (the button's border-radius, 7px
  // on desktop and 5px below), as it was on the static logo, so it depends on how big the logo is drawn.
  let R0 = 29;

  // ── Shapes ──
  const rr = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}` +
      `V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
  };
  // The square squashes up into a chat bubble with a tail at the bottom left (k: 0 square, 1 bubble).
  const bubble = k => {
    const h = 100 - 24 * k;
    return {
      body: rr(0, 0, 100, h, R0),
      tail: `M16 ${f(h - 10)}L10 ${f(h - 30 + 52 * k)}L44 ${f(h - 10)}Z`,
    };
  };
  // The square becomes a video camera: a lower, narrower body (k) with a lens opening on its right (kl).
  const camera = (k, kl) => ({
    body: rr(0, 20 * k, 100 - 28 * k, 100 - 40 * k, R0 - (R0 - 12) * k),
    tail: `M${f(lerp(55, 70, kl))} ${f(50 - 12 * kl)}L${f(lerp(70, 97, kl))} ${f(50 - 26 * kl)}` +
      `L${f(lerp(70, 97, kl))} ${f(50 + 26 * kl)}L${f(lerp(55, 70, kl))} ${f(50 + 12 * kl)}Z`,
  });

  // A speech bubble with a tail on its bottom edge: base from..to, tip at (tx, ty).
  const speech = (x, y, w, h, r, t) => {
    r = Math.min(r, w / 2, h / 2);
    const b = y + h;
    return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(b - r)}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(b)}H${f(t.to)}L${f(t.tx)} ${f(t.ty)}L${f(t.from)} ${f(b)}H${f(x + r)}` +
      `A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(b - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`;
  };
  // Two bubbles, one behind and up and to the left, one in front and down and to the right. The
  // square becomes the back one (k: 0 square, 1 bubble); the front one is a fixed shape that pops in.
  // k is how far the width has shrunk, kh the height, kt how far the tail has popped down. The tails are
  // small right triangles, as sketched: the back bubble's is flush with its left side, the front one's
  // with its right side, and both point straight down.
  const backBubble = (k, kt = k, kh = k) => {
    const w = lerp(100, 66, k), h = lerp(100, 52, kh);
    return speech(0, 0, w, h, lerp(R0, 12, Math.max(k, kh)), { from: lerp(33, 14, kt), to: lerp(34, 32, kt), tx: lerp(33, 14, kt), ty: h + 15 * kt });
  };
  const frontBubble = (kt = 1) => speech(34, 38, 66, 52, 12, { from: lerp(81, 68, kt), to: lerp(82, 86, kt), tx: lerp(82, 86, kt), ty: 90 + 15 * kt });
  const FRONT = frontBubble();
  // The square becomes a wide frame (k), like a video window.
  const frame = k => rr(0, 18 * k, 100, 100 - 36 * k, R0 - (R0 - 12) * k);

  // A short squash that dies away: amp at the start, 0 after dur ms.
  const bump = (h, at, amp, dur = 380) => {
    if (h === null) return 0;
    const u = (h - at) / dur;
    return u < 0 || u > 1 ? 0 : amp * Math.sin(Math.PI * u) * (1 - u);
  };

  // ── Variants ──
  // fwd: ms to the end state; hold: ms it pauses there; rev: ms back. cues are [ms, sound, ...args].
  // draw(p, h, ms) returns the state to render: p is 0 (the logo) to 1 (the end state) and h is the
  // time into the hold (null otherwise), so the way back is exactly the way in.
  // The laptop with the Sketch stethoscope and big heartbeat. t is when each comes in, as [from, to] of p.
  const DROP = 4;
  const bigLaptop = (p, h, t) => {
    const draw = seg(p, t.scope[0], t.scope[1]), e = easeOutBack(draw), k = easeOutBack(seg(p, 0.02, 0.3)), kf = seg(p, 0.1, 0.32), ks = seg(p, 0.08, 0.3), b = easeOutBack(seg(p, 0.3, 0.48));
    const dy = bump(h, 200, 6, 350) + bump(h, 850, 6, 350), flash = bump(h, 200, 0.06, 350) + bump(h, 850, 0.06, 350);
    return { body: rr(lerp(0, 9.5, k), lerp(0, 10 + DROP, k), lerp(100, 81, k), lerp(100, 54, k), lerp(R0, 7, k)), tail: 'M0 0', squash: 0, word: seg(p, 0, 0.15),
      bodyFillColor: mix(PURPLE, WHITE, kf), bodyStroke: 7 * ks, bodyStrokeColor: GRAY, bodyHaloW: 7 * ks + HALO, ecg: seg(p, t.ecg[0], t.ecg[1]), ecgColor: '#771B61', ecgW: 4.5, ecgHaloW: 9.3,
      ecgD: 'M49.92 46.49L63.12 46.49L68.07 39.89L73.01 46.49L77.97 46.49L82.92 26.69L89.52 61.34L94.47 46.49L99.41 46.49L104.37 41.54L109.32 46.49',
      ecgScale: 1, ecgDy: dy + DROP,
      laptop: { baseHalo: true, baseFill: GRAY, baseD: 'M-0.25 69.81H100.25V74.31C100.25 76.52 98.46 78.31 96.25 78.31H3.75C1.54 78.31 -0.25 76.52 -0.25 74.31Z',
        baseOp: b > 0, baseTy: (1 - b) * 26 + DROP, draw, chest: easeOutBack(seg(p, 0.78, 0.9)), dy, glyph: { cx: 28.86, cy: 15.53, dx: -36 * (1 - e), dy: -36 * (1 - e), scale: 0.25 * (0.55 + 0.45 * e), rot: -8, op: seg(draw, 0, 0.25) } } };
  };
  const typingDots = (p, ms, from, to) => ({
    dotsOp: seg(p, from, to),
    dotsY: [0, 1, 2].map(i => -5 * Math.max(0, Math.sin(Math.PI * 2 * (ms / 700 - i * 0.16)))),
  });
  const VARIANTS = {
    chat: {
      label: 'Chat bubble',
      note: 'The square squashes into a chat bubble and the wordmark goes. Typing dots bounce in the bubble, then a reply bubble pops in behind it, up and to the right.',
      fwd: 2200, hold: 1200, rev: 1700,
      cues: [[0, 'pop'], [800, 'tick'], [980, 'tick'], [1160, 'tick'], [1290, 'ping'], [3775, 'pop2'], [4500, 'pop2']],
      draw(p, h, ms) {
        const k = easeOutBack(seg(p, 0, 0.35)), r = seg(p, 0.55, 0.78);
        return { ...bubble(k), squash: Math.sin(Math.PI * seg(p, 0, 0.35)) * 0.06, k, word: seg(p, 0, 0.2),
          ...typingDots(p, ms, 0.35, 0.48), reply: r, replyScale: easeOutBack(r) };
      },
    },
    call: {
      label: 'Call, back and forth',
      note: 'The bubble and its reply are formed, then trade messages: each squashes in turn with a blip, like a conversation.',
      fwd: 2000, hold: 1800, rev: 1500,
      cues: [[0, 'pop'], [1000, 'ping'], [2200, 'send'], [2650, 'ping'], [3100, 'send'], [3550, 'ping'], [4175, 'pop2'], [4700, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0, 0.4)), r = seg(p, 0.5, 0.75);
        const main = bump(h, 200, 0.1) + bump(h, 1100, 0.1), reply = bump(h, 650, 0.14) + bump(h, 1550, 0.14);
        return { ...bubble(k), squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.06 + main, k, word: seg(p, 0, 0.2),
          reply: r, replyScale: easeOutBack(r) * (1 + reply) };
      },
    },
    video: {
      label: 'Video call',
      note: 'The square drops into a camera body, a lens opens on its right, and a red record dot blinks on: the visit is live.',
      fwd: 1900, hold: 1700, rev: 1500,
      cues: [[0, 'pop'], [700, 'chirp'], [1450, 'beep'], [3600, 'chirp2'], [4300, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0, 0.4)), kl = easeOutBack(seg(p, 0.35, 0.7));
        const blink = h === null ? 1 : 0.55 + 0.45 * Math.cos(Math.PI * 2 * h / 900);
        return { ...camera(k, kl), squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.06, k, word: seg(p, 0, 0.2),
          rec: seg(p, 0.7, 0.8) * blink, recAt: [14, 36] };
      },
    },
    pulse: {
      label: 'Heartbeat',
      note: 'The square squashes into a bubble and a heartbeat line draws itself across it. The bubble beats with the spike twice before it plays back.',
      fwd: 2200, hold: 1600, rev: 1500,
      cues: [[0, 'pop'], [1330, 'beep'], [2300, 'beep'], [3100, 'beep'], [4300, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0, 0.3));
        return { ...bubble(k), squash: Math.sin(Math.PI * seg(p, 0, 0.3)) * 0.06 + bump(h, 100, 0.1) + bump(h, 900, 0.1), k,
          word: seg(p, 0, 0.18), ecg: seg(p, 0.35, 0.8) };
      },
    },
    bubbles: {
      label: 'Two bubbles',
      note: 'From the sketch: the square gets shorter, then narrower, into a bubble; its tail pops down; typing dots bounce in it; then a second bubble slides out from behind it, down and to the right.',
      fwd: 2800, hold: 1200, rev: 1700,
      cues: [[0, 'pop'], [600, 'pop'], [1000, 'tick'], [1180, 'tick'], [1360, 'tick'], [1540, 'ping'], [4250, 'pop2'], [5300, 'pop2']],
      draw(p, h, ms) {
        const kh = easeOutBack(seg(p, 0, 0.18)), kw = easeOutBack(seg(p, 0.06, 0.24)), kt = easeOutBack(seg(p, 0.24, 0.36));
        const s = easeOutBack(seg(p, 0.55, 0.85)), op = p > 0.5;
        return { body: backBubble(kw, kt, kh), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.24)) * 0.04, word: seg(p, 0, 0.16),
          bodyStroke: 5 * seg(p, 0.5, 0.55), bodyStrokeColor: '#fff', bodyHalo: true,
          dotsAt: { x: 33, y: 26, gap: 12, r: 4.5 }, ...typingDots(p, ms, 0.36, 0.46),
          front: { d: frontBubble(seg(p, 0.55, 0.85)), fill: '#771B61', stroke: 'none', sw: 0, op, behind: true, dx: -34 * (1 - s), dy: -38 * (1 - s) } };
      },
    },
    outline: {
      label: 'Outlined bubbles, typing',
      note: 'From the sketch: the square empties into an outlined bubble, typing dots bounce in it, then a second outlined bubble pops in lower right.',
      fwd: 2200, hold: 1200, rev: 1700,
      cues: [[0, 'pop'], [800, 'tick'], [980, 'tick'], [1160, 'tick'], [1290, 'ping'], [3775, 'pop2'], [4500, 'pop2']],
      draw(p, h, ms) {
        const k = easeOutBack(seg(p, 0, 0.3)), r = seg(p, 0.55, 0.78);
        return { body: backBubble(k), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.3)) * 0.06, word: seg(p, 0, 0.2),
          bodyFill: 1 - seg(p, 0.1, 0.35), bodyStroke: 5 * seg(p, 0.1, 0.3),
          dotsFill: '#771B61', dotsAt: { x: 33, y: 26, gap: 12, r: 4.5 }, ...typingDots(p, ms, 0.35, 0.48),
          front: { d: FRONT, fill: '#fff', stroke: '#771B61', sw: 5, op: r > 0, scale: easeOutBack(r) } };
      },
    },
    pip: {
      label: 'Picture in picture',
      note: 'From the sketch: the square becomes a wide video frame and a small self-view window slides and pops into its lower right corner.',
      fwd: 1900, hold: 1200, rev: 1500,
      cues: [[0, 'pop'], [1000, 'chirp'], [3500, 'chirp2'], [4100, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0, 0.4)), e = easeOutBack(seg(p, 0.5, 0.8));
        return { body: frame(k), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.06, word: seg(p, 0, 0.2),
          pip: { d: rr(58, 46, 32, 26, 6), scale: e, tx: (1 - e) * 12, op: p > 0.5 } };
      },
    },
    person: {
      label: 'Video, person (static)',
      note: 'From the sketch: the square becomes a video frame, a person rises into it with an arm raised.',
      fwd: 2000, hold: 1200, rev: 1500,
      cues: [[0, 'pop'], [900, 'chirp'], [3500, 'chirp2'], [4100, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0, 0.4)), e = easeOutBack(seg(p, 0.35, 0.65)), a = easeOutBack(seg(p, 0.65, 0.85));
        return { body: frame(k), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.06, word: seg(p, 0, 0.2),
          person: { op: seg(p, 0.35, 0.5), ty: (1 - e) * 26, arm: -150 * (1 - a) } };
      },
    },
    wave: {
      label: 'Video, person waves',
      note: 'The same person, who then waves hello.',
      fwd: 2000, hold: 2000, rev: 1500,
      cues: [[0, 'pop'], [900, 'chirp'], [2300, 'tick'], [2600, 'tick'], [2900, 'tick'], [3200, 'tick'], [3500, 'tick'], [3800, 'tick'], [5000, 'chirp2'], [5600, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0, 0.4)), e = easeOutBack(seg(p, 0.35, 0.65)), a = easeOutBack(seg(p, 0.65, 0.85));
        const wave = h === null ? 0 : 16 * Math.sin(Math.PI * 2 * h / 600) * Math.min(1, h / 200) * Math.min(1, (2000 - h) / 200);
        return { body: frame(k), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.06, word: seg(p, 0, 0.2),
          person: { op: seg(p, 0.35, 0.5), ty: (1 - e) * 26, arm: -150 * (1 - a) + wave } };
      },
    },
    steth: {
      label: 'Stethoscope call',
      note: 'From the sketch: the square shrinks away as a stethoscope draws itself, then a phone handset draws in beside it and rings.',
      fwd: 2400, hold: 1500, rev: 1700,
      cues: [[0, 'pop'], [1300, 'tick'], [1700, 'chirp'], [2400, 'ring'], [3200, 'ring'], [4800, 'pop2']],
      draw(p, h) {
        const w = seg(p, 0, 0.22), ring = h === null ? 0 : (h % 800 < 500 ? 10 * Math.sin(Math.PI * 2 * h / 140) : 0);
        return { body: rr(0, 0, 100, 100, R0), tail: 'M0 0', word: w, shapeOp: 1 - seg(p, 0.05, 0.25), shapeScale: 1 - 0.5 * w,
          steth: { op: p > 0.2, tube: seg(p, 0.2, 0.55), piece: seg(p, 0.5, 0.62), handset: seg(p, 0.55, 0.8), cord: seg(p, 0.72, 0.85), ring } };
      },
    },
    phone: {
      label: 'Phone visit',
      note: 'The square narrows into a phone; its screen lights up, a heart pops onto it and signal waves ripple out of the top. The heart beats and the waves keep rippling before it plays back.',
      fwd: 2200, hold: 1800, rev: 1500,
      cues: [[0, 'pop'], [900, 'tick'], [1250, 'chirp'], [1550, 'ping'], [2300, 'beat'], [3050, 'beat'], [3800, 'chirp2'], [4500, 'pop2']],
      draw(p, h, ms) {
        const k = easeOutBack(seg(p, 0, 0.4)), sc = easeOutBack(seg(p, 0.4, 0.58)), hs = easeOutBack(seg(p, 0.55, 0.72)), wv = seg(p, 0.72, 0.9);
        const beat = 1 + bump(h, 300, 0.3, 450) + bump(h, 1050, 0.3, 450);
        const ripple = i => wv * Math.sin(Math.PI * (((ms / 1000 - i * 0.18) % 0.9 + 0.9) % 0.9) / 0.9);
        return { body: rr(22 * k, 0, 100 - 44 * k, 100, lerp(R0, 12, k)), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.05, word: seg(p, 0, 0.2),
          phone: { screen: rr(28, 10, 44, 72, 6), screenScale: sc, beat: hs * beat, waves: [0, 1, 2].map(ripple), wavesOp: wv > 0 } };
      },
    },
    textphone: {
      label: 'Phone visit + two bubbles',
      note: 'The square narrows into a phone and its screen lights up like a messaging app: a bubble pops onto it, typing dots bounce, a reply slides in from the right, and signal waves ripple out of the top.',
      fwd: 3000, hold: 1500, rev: 1700,
      cues: [[0, 'pop'], [1100, 'tick'], [1500, 'pop'], [1950, 'tick'], [2130, 'tick'], [2310, 'ping'], [3300, 'chirp'], [4700, 'pop2'], [5600, 'pop2']],
      draw(p, h, ms) {
        const k = easeOutBack(seg(p, 0, 0.35)), sc = easeOutBack(seg(p, 0.35, 0.5)), m1 = easeOutBack(seg(p, 0.5, 0.62));
        const m2 = easeOutBack(seg(p, 0.75, 0.88)), wv = seg(p, 0.85, 1);
        const ripple = i => wv * Math.sin(Math.PI * (((ms / 1000 - i * 0.18) % 0.9 + 0.9) % 0.9) / 0.9);
        return { body: rr(22 * k, 0, 100 - 44 * k, 100, lerp(R0, 12, k)), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.35)) * 0.05, word: seg(p, 0, 0.18),
          dotsAt: { x: 47, y: 32, gap: 7, r: 2.6 }, ...typingDots(p, ms, 0.62, 0.72), dotsY: [0, 1, 2].map(i => -2 * Math.max(0, Math.sin(Math.PI * 2 * (ms / 700 - i * 0.16)))),
          phone: { screen: rr(28, 10, 44, 72, 6), screenScale: sc, beat: 0, waves: [0, 1, 2].map(ripple), wavesOp: wv > 0 },
          chat: { m1, m2dx: (1 - m2) * 26, m2op: seg(p, 0.75, 0.8) } };
      },
    },
    phones: {
      label: 'Two phones',
      note: 'The square narrows into a phone with typing dots on its screen. A second phone slides out from behind it, down and to the right, and a heart pops onto its screen. No signal waves.',
      fwd: 2800, hold: 1200, rev: 1700,
      cues: [[0, 'pop'], [840, 'tick'], [1250, 'tick'], [1430, 'tick'], [1610, 'tick'], [1540, 'pop'], [2300, 'ping'], [3000, 'beat'], [3600, 'beat'], [4255, 'pop2'], [5190, 'pop2']],
      draw(p, h, ms) {
        const k = easeOutBack(seg(p, 0, 0.3)), sc = easeOutBack(seg(p, 0.3, 0.42)), e = easeOutBack(seg(p, 0.55, 0.85)), hs = easeOutBack(seg(p, 0.82, 0.95));
        const beat = 1 + bump(h, 200, 0.3, 450) + bump(h, 800, 0.3, 450);
        return { body: rr(5 * k, 0, 100 - 50 * k, 100 - 16 * k, lerp(R0, 10, k)), tail: 'M0 0', squash: Math.sin(Math.PI * seg(p, 0, 0.3)) * 0.05, word: seg(p, 0, 0.16),
          bodyStroke: 5 * seg(p, 0.5, 0.55), bodyStrokeColor: '#fff', bodyHalo: true,
          dotsFill: '#771B61', dotsAt: { x: 30, y: 39, gap: 9, r: 3.4 }, ...typingDots(p, ms, 0.42, 0.52),
          phone: { screen: rr(11, 8, 38, 62, 5.5), screenScale: sc, beat: 0, waves: [0, 0, 0], wavesOp: false },
          phoneB: { op: p > 0.5, dx: -40 * (1 - e), dy: -16 * (1 - e), heart: hs * beat } };
      },
    },
    laptop: {
      label: 'Laptop and stethoscope',
      note: 'The square empties into a laptop screen frame and a base slides up under it. A stethoscope draws itself across the corner, its chestpiece pops on, then taps the screen twice as a heartbeat line flashes on it.',
      fwd: 3000, hold: 1500, rev: 1700,
      cues: [[0, 'pop'], [900, 'tick'], [1500, 'send'], [2330, 'ping'], [2700, 'beep'], [3250, 'beat'], [3900, 'beat'], [4600, 'pop2'], [5200, 'pop2'], [5800, 'pop2']],
      draw(p, h) {
        const k = easeOutBack(seg(p, 0.02, 0.3)), kf = seg(p, 0.1, 0.32), ks = seg(p, 0.08, 0.3), b = easeOutBack(seg(p, 0.3, 0.48));
        const dy = bump(h, 200, 6, 350) + bump(h, 850, 6, 350), flash = bump(h, 200, 0.2, 350) + bump(h, 850, 0.2, 350);
        return { body: rr(18 * k, 10 * k, 100 - 36 * k, 100 - 46 * k, lerp(R0, 6, k)), tail: 'M0 0', squash: 0, word: seg(p, 0, 0.15),
          bodyFill: 1 - kf, bodyStroke: 7 * ks, ecg: seg(p, 0.88, 1), ecgColor: '#771B61', ecgScale: 0.45 * (1 + flash), ecgDy: 8,
          laptop: { baseOp: b > 0, baseTy: (1 - b) * 26, draw: seg(p, 0.5, 0.8), chest: easeOutBack(seg(p, 0.78, 0.9)), dy } };
      },
    },
    laptop2: {
      label: 'Laptop and stethoscope, big heartbeat',
      note: 'The laptop and stethoscope from the Sketch edit: a grey laptop with a white screen, and a big heartbeat line that crosses the frame with a white border around it. The stethoscope, tilted 8° counter-clockwise, slides and pops in from the top left. In the hold the stethoscope and the heartbeat line bounce together.',
      fwd: 3000, hold: 1500, rev: 1700,
      cues: [[0, 'pop'], [900, 'tick'], [1500, 'send'], [2330, 'ping'], [2700, 'beep'], [3250, 'beat'], [3900, 'beat'], [4600, 'pop2'], [5200, 'pop2'], [5800, 'pop2']],
      draw(p, h) {
        return bigLaptop(p, h, { scope: [0.5, 0.8], ecg: [0.88, 1] });
      },
    },
    laptop3: {
      label: 'Laptop, stethoscope and heartbeat together',
      note: 'The same laptop, but the stethoscope and the heartbeat line come in at the same moment: the stethoscope slides and pops in from the top left while the line draws across the screen.',
      fwd: 2400, hold: 1500, rev: 1500,
      cues: [[0, 'pop'], [720, 'tick'], [1250, 'send'], [2040, 'ping'], [2600, 'beat'], [3250, 'beat'], [4125, 'pop2'], [4700, 'pop2'], [5200, 'pop2']],
      draw(p, h) {
        return bigLaptop(p, h, { scope: [0.52, 0.85], ecg: [0.52, 0.85] });
      },
    },
    heart: {
      label: 'Heart and heartbeat',
      note: 'The square pulses and a heart pops in over it, then a heartbeat line draws across the heart and it beats twice with the spike.',
      fwd: 2200, hold: 1500, rev: 1500,
      cues: [[0, 'pop'], [350, 'beat'], [1450, 'beat'], [1800, 'beat'], [3700, 'beat'], [4400, 'pop2']],
      draw(p, h) {
        const pop = easeOutBack(seg(p, 0.12, 0.38)), s0 = seg(p, 0.1, 0.34);
        const beat = bump(h, 100, 0.12, 450) + bump(h, 800, 0.12, 450) + 0.1 * Math.sin(Math.PI * seg(p, 0, 0.12));
        return { body: rr(0, 0, 100, 100, R0), tail: 'M0 0', word: seg(p, 0, 0.2), shapeOp: 1 - s0, shapeScale: 1 - 0.2 * s0 + 0.05 * Math.sin(Math.PI * seg(p, 0, 0.12)),
          heartBig: { op: p > 0.12, scale: Math.max(0, pop) * (1 + beat) }, ecg: seg(p, 0.45, 0.85) };
      },
    },
    typing: {
      label: 'Typing indicator',
      note: 'Just the bubble and its typing dots, no reply.',
      fwd: 1500, hold: 1600, rev: 1200,
      cues: [[0, 'pop'], [700, 'tick'], [880, 'tick'], [1060, 'tick'], [3100, 'pop2']],
      draw(p, h, ms) {
        const k = easeOutBack(seg(p, 0, 0.4));
        return { ...bubble(k), squash: Math.sin(Math.PI * seg(p, 0, 0.4)) * 0.06, k, word: seg(p, 0, 0.2), ...typingDots(p, ms, 0.4, 0.55) };
      },
    },
  };

  // ── Rendering ──
  const pivot = (x, y, sx, sy) => `translate(${x} ${y}) scale(${f(sx)} ${f(sy)}) translate(${-x} ${-y})`;
  function radius(root) {
    const width = root.getBoundingClientRect().width;
    const px = parseFloat(getComputedStyle(root.querySelector('button')).borderRadius);
    return width && px ? px / width * 100 : 29;
  }
  function refs(root) {
    const one = sel => root.querySelector(sel);
    return {
      shape: one('.upmc-logo__shape'), body: one('.upmc-logo__body'), tail: one('.upmc-logo__tail'),
      word: one('.upmc-logo__word'), dots: one('.upmc-logo__dots'), dot: [...root.querySelectorAll('.upmc-logo__dots circle')],
      reply: one('.upmc-logo__reply'), ecg: one('.upmc-logo__ecg'), rec: one('.upmc-logo__rec'),
      front: one('.upmc-logo__front'), pip: one('.upmc-logo__pip'), person: one('.upmc-logo__person'),
      torso: one('.upmc-logo__torso'), arm: one('.upmc-logo__arm'), steth: one('.upmc-logo__steth'),
      tube: one('.upmc-logo__tube'), piece: one('.upmc-logo__piece'), handset: one('.upmc-logo__handset'),
      cord: one('.upmc-logo__cord'), phone: one('.upmc-logo__phone'),
      bodyHalo: one('.upmc-logo__body-halo'), baseHalo: one('.upmc-logo__base-halo'),
      glyph: one('.upmc-logo__glyph'), glyphClip: one('.upmc-logo__glyph-clip'),
      ecgHalo: one('.upmc-logo__ecg-halo'), base: one('.upmc-logo__base'), scope: one('.upmc-logo__scope'), scopeHalo: one('.upmc-logo__scope-halo'),
      scopeTube: one('.upmc-logo__scope-tube'), chest: one('.upmc-logo__scope-chest'),
      b: one('.upmc-logo__b'), bBody: one('.upmc-logo__b-body'), bScreen: one('.upmc-logo__b-screen'), bHeart: one('.upmc-logo__b-heart'),
      mini1: one('.upmc-logo__mini1'), mini2: one('.upmc-logo__mini2'),
      heart: one('.upmc-logo__heart'), screen: one('.upmc-logo__screen'), beat: one('.upmc-logo__beat'),
      waves: one('.upmc-logo__waves'), wave: [...root.querySelectorAll('.upmc-logo__waves path')],
      root, r0: radius(root),
    };
  }
  function timeAt(v, ms) {
    if (ms < v.fwd) return { p: ms / v.fwd, h: null };
    if (ms < v.fwd + v.hold) return { p: 1, h: ms - v.fwd };
    return { p: clamp(1 - (ms - v.fwd - v.hold) / v.rev, 0, 1), h: null };
  }
  function render(k, v, ms) {
    const { p, h } = timeAt(v, ms);
    R0 = k.r0;
    const s = v.draw(p, h, ms);
    k.body.setAttribute('d', s.body);
    k.bodyHalo.setAttribute('d', s.body);
    k.bodyHalo.setAttribute('stroke-width', f(s.bodyHaloW === undefined ? HALO : s.bodyHaloW));
    k.body.setAttribute('fill', s.bodyFillColor || PURPLE);
    k.tail.setAttribute('d', s.tail);
    const q = s.squash || 0, sc = s.shapeScale || 1;
    k.shape.setAttribute('transform', pivot(50, 50, (1 + q) * sc, (1 - q) * sc));
    k.bodyHalo.setAttribute('transform', pivot(50, 50, (1 + q) * sc, (1 - q) * sc));
    k.shape.setAttribute('opacity', f(s.shapeOp === undefined ? 1 : s.shapeOp));
    k.body.setAttribute('fill-opacity', f(s.bodyFill === undefined ? 1 : s.bodyFill));
    k.body.setAttribute('stroke-width', f(s.bodyStroke || 0));
    k.body.setAttribute('stroke', s.bodyStrokeColor || '#771B61');
    k.body.setAttribute('paint-order', s.bodyHalo ? 'stroke' : 'normal');
    const w = s.word;
    k.word.setAttribute('opacity', f(1 - w));
    k.word.setAttribute('transform', pivot(50, 50, 1 - 0.45 * w, 1 - 0.45 * w));
    const da = s.dotsAt || { x: 50, y: 38, gap: 20, r: 5.5 };
    k.dots.setAttribute('opacity', f(s.dotsOp || 0));
    k.dots.setAttribute('fill', s.dotsFill || '#fff');
    k.dot.forEach((el, i) => {
      el.setAttribute('cx', f(da.x + (i - 1) * da.gap));
      el.setAttribute('cy', f(da.y + (s.dotsY ? s.dotsY[i] : 0)));
      el.setAttribute('r', da.r);
    });
    const r = s.reply || 0;
    k.reply.setAttribute('opacity', r > 0 ? 1 : 0);
    k.reply.setAttribute('transform', pivot(110, 44, s.replyScale || 0, s.replyScale || 0));
    k.ecg.setAttribute('opacity', s.ecg > 0 ? 1 : 0);
    k.ecg.setAttribute('stroke-dashoffset', f(1 - (s.ecg || 0)));
    k.ecg.setAttribute('stroke', s.ecgColor || '#fff');
    k.ecg.setAttribute('d', s.ecgD || ECG_D);
    k.ecg.setAttribute('stroke-width', s.ecgW || 5);
    const et = s.ecgScale ? `translate(0 ${s.ecgDy || 0}) ${pivot(...(s.ecgAt || [50, 37]), s.ecgScale, s.ecgScale)}` : '';
    k.ecg.setAttribute('transform', et);
    k.ecgHalo.setAttribute('opacity', s.ecg > 0 && s.ecgHaloW ? 1 : 0);
    k.ecgHalo.setAttribute('d', s.ecgD || ECG_D);
    k.ecgHalo.setAttribute('stroke-width', s.ecgHaloW || 0);
    k.ecgHalo.setAttribute('stroke-dashoffset', f(1 - (s.ecg || 0)));
    k.ecgHalo.setAttribute('transform', et);
    k.rec.setAttribute('opacity', f(s.rec || 0));
    if (s.recAt) { k.rec.setAttribute('cx', s.recAt[0]); k.rec.setAttribute('cy', s.recAt[1]); }
    const fr = s.front;
    k.front.setAttribute('opacity', fr && fr.op ? 1 : 0);
    if (fr) {
      k.front.setAttribute('d', fr.d);
      k.front.setAttribute('fill', fr.fill);
      k.front.setAttribute('stroke', fr.stroke);
      k.front.setAttribute('stroke-width', fr.sw);
      k.front.setAttribute('transform', fr.dx === undefined ? pivot(84, 90, fr.scale, fr.scale) : `translate(${f(fr.dx)} ${f(fr.dy)})`);
      // A bubble that slides out from behind sits under the square; one that pops in sits over it.
      if (fr.behind) { if (k.front.nextElementSibling !== k.shape) k.shape.before(k.front); }
      else if (k.front.previousElementSibling !== k.shape) k.shape.after(k.front);
    }
    const pp = s.pip;
    k.pip.setAttribute('opacity', pp && pp.op ? 1 : 0);
    if (pp) {
      k.pip.setAttribute('d', pp.d);
      k.pip.setAttribute('transform', `translate(${f(pp.tx)} 0) ${pivot(74, 59, pp.scale, pp.scale)}`);
    }
    const pe = s.person;
    k.person.setAttribute('opacity', pe ? f(pe.op) : 0);
    if (pe) {
      k.person.setAttribute('transform', `translate(0 ${f(pe.ty)})`);
      k.arm.setAttribute('transform', `rotate(${f(pe.arm)} 34 68)`);
    }
    const hb = s.heartBig;
    k.heart.setAttribute('opacity', hb && hb.op ? 1 : 0);
    if (hb) k.heart.setAttribute('transform', pivot(50, 46, hb.scale, hb.scale));
    const ph = s.phone;
    k.screen.setAttribute('opacity', ph && ph.screenScale > 0 ? 1 : 0);
    k.beat.setAttribute('opacity', ph && ph.beat > 0 ? 1 : 0);
    k.waves.setAttribute('opacity', ph && ph.wavesOp ? 1 : 0);
    if (ph) {
      k.screen.setAttribute('d', ph.screen);
      k.screen.setAttribute('transform', pivot(50, 46, ph.screenScale, ph.screenScale));
      k.beat.setAttribute('transform', `translate(50 44) scale(${f(ph.beat)})`);
      k.wave.forEach((el, i) => el.setAttribute('opacity', f(Math.max(0, ph.waves[i]))));
    }
    const ch = s.chat;
    k.mini1.setAttribute('opacity', ch && ch.m1 > 0 ? 1 : 0);
    k.mini2.setAttribute('opacity', ch ? f(ch.m2op) : 0);
    if (ch) {
      k.mini1.setAttribute('d', speech(32, 22, 30, 20, 7, { from: 36, to: 44, tx: 36, ty: 48 }));
      k.mini1.setAttribute('transform', pivot(40, 44, ch.m1, ch.m1));
      k.mini2.setAttribute('d', speech(38, 50, 30, 20, 7, { from: 56, to: 64, tx: 64, ty: 76 }));
      k.mini2.setAttribute('transform', `translate(${f(ch.m2dx)} 0)`);
    }
    const pb = s.phoneB;
    k.b.setAttribute('opacity', pb && pb.op ? 1 : 0);
    if (pb) {
      k.bBody.setAttribute('d', rr(45, 16, 50, 84, 10));
      k.bScreen.setAttribute('d', rr(51, 24, 38, 62, 5.5));
      k.bHeart.setAttribute('transform', `translate(70 55) scale(${f(1.15 * Math.max(0, pb.heart))})`);
      k.b.setAttribute('transform', `translate(${f(pb.dx)} ${f(pb.dy)})`);
    }
    const lp = s.laptop;
    k.base.setAttribute('opacity', lp && lp.baseOp ? 1 : 0);
    k.scope.setAttribute('opacity', lp && lp.draw > 0 && !lp.glyph ? 1 : 0);
    k.glyph.setAttribute('opacity', lp && lp.glyph ? f(lp.glyph.op) : 0);
    if (lp) {
      k.base.setAttribute('d', lp.baseD || BASE_D);
      k.baseHalo.setAttribute('d', lp.baseD || BASE_D);
      k.baseHalo.setAttribute('opacity', lp.baseHalo && lp.baseOp ? 1 : 0);
      k.baseHalo.setAttribute('transform', `translate(0 ${f(lp.baseTy)})`);
      k.base.setAttribute('fill', lp.baseFill || PURPLE);
      k.base.setAttribute('transform', `translate(0 ${f(lp.baseTy)})`);
      k.scopeHalo.setAttribute('stroke-dashoffset', f(1 - lp.draw));
      k.scopeTube.setAttribute('stroke-dashoffset', f(1 - lp.draw));
      k.chest.setAttribute('opacity', lp.chest > 0 ? 1 : 0);
      k.chest.setAttribute('transform', pivot(62, 8, Math.max(0, lp.chest), Math.max(0, lp.chest)));
      k.scope.setAttribute('transform', `translate(${f(lp.dx || 0)} ${f(lp.dy)})`);
      if (lp.glyph) {
        const g = lp.glyph;
        k.glyph.setAttribute('transform', `translate(${f(g.cx + g.dx)} ${f(g.cy + g.dy + lp.dy)}) scale(${f(g.scale)}) rotate(${g.rot}) translate(-103.22 -100.09)`);
        k.glyphClip.setAttribute('width', 400);
      }
    }
    const st = s.steth;
    k.steth.setAttribute('opacity', st && st.op ? 1 : 0);
    if (st) {
      k.tube.setAttribute('stroke-dashoffset', f(1 - st.tube));
      k.piece.setAttribute('stroke-dashoffset', f(1 - st.piece));
      k.handset.setAttribute('stroke-dashoffset', f(1 - st.handset));
      k.cord.setAttribute('stroke-dashoffset', f(1 - st.cord));
      k.phone.setAttribute('transform', `rotate(${f(st.ring)} 82 46)`);
    }
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
    chirp() { tone('sine', 700, 700, 0.1, 0.25); tone('sine', 1050, 1050, 0.14, 0.25, 0.11); },
    chirp2() { tone('sine', 1050, 1050, 0.1, 0.25); tone('sine', 700, 700, 0.14, 0.25, 0.11); },
    ring() { [0, 0.07, 0.14, 0.21].forEach(d => tone('sine', 1400, 1400, 0.05, 0.2, d)); },
    beat() { tone('sine', 110, 55, 0.12, 0.5); tone('sine', 100, 50, 0.14, 0.4, 0.16); },
    beep() { tone('sine', 1000, 1000, 0.09, 0.25); },
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
  window.upmcLogo = { variants: VARIANTS, refs, radius, render, totalMs, play, unlockAudio, sound };

  const triggers = document.querySelectorAll('.upmc-logo-trigger');
  if (!triggers.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // At rest the square takes its corner radius from the page rather than from the SVG's own markup.
  const rest = () => triggers.forEach(trigger => { if (!trigger.dataset.playing) render(refs(trigger), VARIANTS[DEFAULT], 0); });
  rest();
  window.addEventListener('resize', rest);
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (reduceMotion.matches && !window.upmcLogoDebug) return;
    unlockAudio();
    play(trigger, VARIANTS[trigger.dataset.upmcVariant] || VARIANTS[DEFAULT]);
  }));
})();
