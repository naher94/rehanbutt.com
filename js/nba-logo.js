/**
 * NBA Logo Shot (home intro)
 *
 * Clicking the inline NBA logo squishes it down onto its own bottom edge as a
 * basketball, folds a hoop up out of the floor behind it (a real perspective
 * projection, so it swings forward toward you), and shoots: the ball arcs up
 * and over, drops through the net, and bounces home as the hoop folds away and
 * the logo springs back. Motion uses the Web Animations API for the logo and
 * ball and a small 3D projection for the hoop; sounds are synthesized with
 * Web Audio.
 *
 * The SVG lives in _includes/nba-logo.svg. Everything is posed in SVG units;
 * the floor sits a little below the logo's bottom edge (y = 42).
 */
(function () {
  'use strict';

  const triggers = document.querySelectorAll('.nba-logo-trigger');
  if (!triggers.length) return;

  const TAU = Math.PI * 2;
  const wait = d => new Promise(r => setTimeout(r, d));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeIn = t => t ** 3;
  const easeInOut = t => 0.5 - Math.cos(Math.PI * t) / 2;
  const easeOutBack = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  const hop = t => 4 * t * (1 - t);

  const LOGO_BOTTOM = 42;         // the logo's own bottom edge
  const FLOOR_DROP = 6;           // the floor sits this far below it, so the logo sinks as it squishes
  const HOOP_LIFT = 8;            // the hoop's inner square stands this far above the logo's top edge
  const FLOOR = LOGO_BOTTOM + FLOOR_DROP;
  // The ball is drawn at cy = 33.5 + FLOOR_DROP, then scaled up about its feet by BALL_SCALE (the
  // transform on its inner group in the SVG): a cheat so it reads bigger on the floor.
  const BALL_SCALE = 1.2;
  const BALL_LOCAL = [9, FLOOR - 8.5];                  // the ball's centre before that scale: the seams use it
  const CENTER = [9, FLOOR - 8.5 * BALL_SCALE];         // resting ball centre on screen
  const FEET = [9, FLOOR];        // ball squashes pivot here
  const LOGO_FEET = [9, LOGO_BOTTOM];
  const RIM_DEPTH = 0.93 / BALL_SCALE; // ball scale at the rim (0.93 on screen): the hoop stands a little behind it

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
    // Rubber squeeze: a quick downward bend.
    squish() { sweep('sine', 520, 140, 0.2, 0.5); },
    // Net: a short burst of high, airy noise.
    swish() {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 2600;
      noise(t, 0.4).connect(f).connect(envelope(t, 0.35, 0.03, 0.32)).connect(master);
    },
    thud(peak = 0.7, from = 150) { sweep('sine', from, 50, 0.18, peak, 0.004); },
    pop() { sweep('triangle', 300, 1400, 0.1, 0.4, 0.004); },
  };
  function sound(name, ...args) {
    if (!ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }

  // ── Logo and ball motion ──
  // Poses are written in SVG units and pivot around `o`, so squashes sit on the floor.
  // `rot` aims the scale: sy runs along that direction (degrees from up), and the ball itself isn't turned.
  function pose({ x = 0, y = 0, sx = 1, sy = 1, rot = 0, op, o = FEET, offset, ease }) {
    const f = {
      transform: `translate(${x}px, ${y}px) translate(${o[0]}px, ${o[1]}px) rotate(${rot}deg) ` +
        `scale(${sx}, ${sy}) rotate(${-rot}deg) translate(${-o[0]}px, ${-o[1]}px)`,
    };
    if (op !== undefined) f.opacity = op;
    if (offset !== undefined) f.offset = offset;
    if (ease) f.easing = ease;
    return f;
  }
  const sample = (fn, o, n = 60) => Array.from({ length: n + 1 }, (_, i) => pose({ ...fn(i / n), o }));

  function animateAll(els, keyframes, duration, easing = 'linear') {
    const anims = els.map(el => el.animate(keyframes, { duration, easing, fill: 'both' }));
    return { anims, done: Promise.all(anims.map(a => a.finished)) };
  }
  const move = (els, fn, duration, o, n) => animateAll(els, sample(fn, o, n), duration);

  // ── Hoop ──
  // The hoop is modelled in 3D and projected each frame: x across, h up from the floor, z toward
  // you. phi is how far it is folded back: 90deg lies flat on the floor behind the ball, 0 stands.
  // The fold's far edge shrinks and rises on screen, then swings forward and grows as it comes up.
  // The camera sits level with the rim, so once the hoop stands the rim reads as a straight line.
  const FOCAL = 220;
  const HZ = -12;                                  // the hoop stands a little behind the ball
  const S0 = FOCAL / (FOCAL - HZ);
  // H_INNER anchors the board so a point there lands at screen y = -HOOP_LIFT. The inner square, rim
  // and net then hang INNER_DROP lower on the board; 11 is the rim's drop below the square's top.
  const INNER_DROP = 1.25;
  const VP = [9, -HOOP_LIFT + (11 + INNER_DROP) * S0];
  const H_INNER = FLOOR - (VP[1] + (-HOOP_LIFT - VP[1]) / S0);
  const BOARD = { x0: -9, x1: 27, top: H_INNER + 6, bottom: H_INNER - 16 };
  const INNER = { x0: 2, x1: 16, top: H_INNER - INNER_DROP, bottom: H_INNER - 10 - INNER_DROP };
  const RIM = { x: 9, h: H_INNER - 11 - INNER_DROP, z: 9, r: 11 };
  const NET = { len: 13, r: 7, strings: 8 };

  function hoopPoint(x, h, z, phi) {
    const c = Math.cos(phi), s = Math.sin(phi);
    const hh = h * c + z * s;
    const zz = HZ + z * c - h * s;
    const k = FOCAL / (FOCAL - zz);
    return [VP[0] + (x - VP[0]) * k, VP[1] + (FLOOR - hh - VP[1]) * k];
  }
  const path = (pts, close) =>
    'M' + pts.map(p => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + (close ? 'Z' : '');

  // A rectangle in the hoop's plane with rounded corners, as (x, h) points clockwise from the top edge.
  function roundRect({ x0, x1, top, bottom }, r) {
    const pts = [];
    [[x1 - r, top - r, 90], [x1 - r, bottom + r, 0], [x0 + r, bottom + r, -90], [x0 + r, top - r, -180]].forEach(([cx, ch, a0]) => {
      for (let i = 0; i <= 4; i++) {
        const a = (a0 - (i / 4) * 90) * Math.PI / 180;
        pts.push([cx + r * Math.cos(a), ch + r * Math.sin(a)]);
      }
    });
    return pts;
  }

  // A ring in the horizontal plane at height h, from angle a0 to a1 (sin > 0 faces you).
  function ring(h, r, a0, a1, phi) {
    const n = 14;
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + (a1 - a0) * i / n;
      return hoopPoint(RIM.x + r * Math.cos(a), h, RIM.z + r * Math.sin(a), phi);
    });
  }

  function renderHoop(k, { phi, wob, op }) {
    const P = (x, h, z = 0) => hoopPoint(x, h, z, phi);
    k.board.setAttribute('d', path(roundRect(BOARD, 1.875).map(p => P(p[0], p[1])), true));
    k.inner.setAttribute('d', path(roundRect(INNER, 1.375).map(p => P(p[0], p[1])), true));

    // The net hangs from the rim and stretches like fabric (wob > 0 pulls it longer and thinner).
    const len = NET.len * (1 + wob), rb = NET.r * (1 - 0.6 * wob);
    const back = [], front = [];
    for (let i = 0; i < NET.strings; i++) {
      const a = (i / NET.strings) * TAU;
      const seg = path([
        P(RIM.x + RIM.r * 0 + RIM.r * Math.cos(a), RIM.h, RIM.z + RIM.r * Math.sin(a)),
        P(RIM.x + rb * Math.cos(a), RIM.h - len, RIM.z + rb * Math.sin(a)),
      ]);
      (Math.sin(a) >= 0 ? front : back).push(seg);
    }
    for (const f of [1 / 3, 2 / 3]) {
      const h = RIM.h - len * f, r = RIM.r + (rb - RIM.r) * f;
      front.push(path(ring(h, r, 0, Math.PI, phi)));
      back.push(path(ring(h, r, Math.PI, TAU, phi)));
    }
    front.push(path(ring(RIM.h - len, rb, 0, Math.PI, phi)));
    back.push(path(ring(RIM.h - len, rb, Math.PI, TAU, phi)));
    k.netFront.setAttribute('d', front.join(''));
    k.netBack.setAttribute('d', back.join(''));
    k.rimFront.setAttribute('d', path(ring(RIM.h, RIM.r, 0, Math.PI, phi)));
    k.rimBack.setAttribute('d', path(ring(RIM.h, RIM.r, Math.PI, TAU, phi)));
    // A white halo behind the board keeps it readable on dark backgrounds (not the rim or net).
    k.haloBoard.setAttribute('d', k.board.getAttribute('d'));
    k.hoop.forEach(el => { el.style.opacity = op; });
  }

  // ── Ball spin ──
  // The seams are circles on a unit sphere (the equator, a meridian, and a pair of side seams that
  // bulge inward). Each frame they turn about the horizontal axis and are projected, keeping the
  // visible half. As theta grows the front of the ball moves up the screen, the way a ball spins
  // when it is thrown up and away. Whole turns land back on the resting pattern.
  const SEAM_R = 8.5;
  // The resting pattern, as drawn in the SVG. The spin lands back on exactly this.
  const REST_SEAMS = 'M9 31v17M.5 39.5h17M4.2 32.7c3.8 3.8 3.8 9.8 0 13.6M13.8 32.7c-3.8 3.8-3.8 9.8 0 13.6';

  // A closed curve around the sphere built from an arc drawn on the front of the ball (unit-disc
  // x, y points): lifted onto the front hemisphere, then mirrored behind. a runs 0 → TAU.
  const fromArc = pts => a => {
    const front = a < Math.PI;
    const f = (front ? a : TAU - a) / Math.PI * (pts.length - 1);
    const i = Math.min(Math.floor(f), pts.length - 2), w = f - i;
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * w, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * w;
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    return [x, y, front ? z : -z];
  };
  // The SVG's side seams are cubic curves; sample one and run its ends out to the ball's edge.
  const sideSeam = (p0, p1, p2, p3) => {
    const pts = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24, u = 1 - t;
      return [0, 1].map(k => (u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
    }).map(([x, y]) => [(x - BALL_LOCAL[0]) / SEAM_R, (y - BALL_LOCAL[1]) / SEAM_R]);
    const edge = ([x, y]) => { const m = Math.hypot(x, y); return [x / m, y / m]; };
    return fromArc([edge(pts[0]), ...pts, edge(pts[pts.length - 1])]);
  };
  const SEAM_CIRCLES = [
    a => [Math.cos(a), 0, Math.sin(a)],
    a => [0, Math.cos(a), Math.sin(a)],
    sideSeam([4.2, 32.7], [8, 36.5], [8, 42.5], [4.2, 46.3]),
    sideSeam([13.8, 32.7], [10, 36.5], [10, 42.5], [13.8, 46.3]),
  ];

  function seamPath(theta) {
    const c = Math.cos(theta), s = Math.sin(theta), n = 96;
    const fmt = (x, y) => (BALL_LOCAL[0] + SEAM_R * x).toFixed(2) + ' ' + (BALL_LOCAL[1] + SEAM_R * y).toFixed(2);
    let d = '';
    SEAM_CIRCLES.forEach(circle => {
      let prev = null, run = [];
      const flush = () => { if (run.length > 1) d += 'M' + run.join('L'); run = []; };
      for (let i = 0; i <= n; i++) {
        const p = circle((i / n) * TAU);
        const cur = { x: p[0], y: p[1] * c - p[2] * s, z: p[1] * s + p[2] * c };
        if (prev && (prev.z >= 0) !== (cur.z >= 0)) {
          const f = prev.z / (prev.z - cur.z);
          const edge = fmt(prev.x + (cur.x - prev.x) * f, prev.y + (cur.y - prev.y) * f);
          if (prev.z >= 0) { run.push(edge); flush(); } else run = [edge];
        }
        if (cur.z >= 0) run.push(fmt(cur.x, cur.y));
        prev = cur;
      }
      flush();
    });
    return d;
  }

  // Spins the ball `revs` full turns over `duration` ms, then snaps back to the resting pattern.
  function spin({ seams }, revs, duration) {
    const draw = theta => { const d = seamPath(theta); seams.forEach(el => el.setAttribute('d', d)); };
    return drive(duration, t => draw(TAU * revs * t)).then(() => seams.forEach(el => el.setAttribute('d', REST_SEAMS)));
  }

  // ── The shot ──
  // One parabola from the floor, over the rim, and back down to the floor. s runs 0 → S_END;
  // s = 1 is the moment the ball drops through the rim.
  // Solve the parabola y = Y0 - A s + B s^2 for: passing the rim line (y = VP[1]) at s = 1, and an
  // apex APEX_ABOVE_BOARD above the board's top edge. Returns to Y0 at s = A / B.
  const APEX_ABOVE_BOARD = 16;
  const Y0 = CENTER[1];
  const BOARD_TOP_Y = VP[1] + (FLOOR - BOARD.top - VP[1]) * S0;
  const RISE = Y0 - VP[1], APEX = Y0 - (BOARD_TOP_Y - APEX_ABOVE_BOARD);
  const B = (4 * APEX - 2 * RISE + Math.sqrt((4 * APEX - 2 * RISE) ** 2 - 4 * RISE ** 2)) / 2;
  const A = B + RISE, S_END = A / B;
  const TS = 950;                                  // ms per unit of s
  const SHOT_MS = S_END * TS, APEX_MS = (A / (2 * B)) * TS;
  // The ball's pose at s.
  function shotPath(s) {
    const y = Y0 - A * s + B * s * s;
    const sc = Math.min(s, 1);
    const lean = -3 * Math.sin(Math.PI * sc);
    const depth = s <= 1
      ? 1 - (1 - RIM_DEPTH) * Math.sin(Math.PI * s / 2)
      : RIM_DEPTH + (1 - RIM_DEPTH) * easeInOut(clamp((s - 1) / (S_END - 1), 0, 1));
    // Stretch along the direction of travel in proportion to speed; round and slightly squashed at the apex.
    let vx = 0;
    if (s < 1) vx = -3 * Math.PI * Math.cos(Math.PI * s);
    const vy = 2 * B * s - A;
    const speed = Math.min(1, Math.hypot(vx, vy) / A);
    const sy = 1 + (0.24 * speed - 0.08 * (1 - speed)) * Math.min(1, (S_END - s) / (0.08 * S_END));
    return {
      x: lean, y: y - Y0, sx: depth / Math.sqrt(sy), sy: depth * sy,
      rot: Math.atan2(vx, -vy) * 180 / Math.PI,
    };
  }
  const shot = t => shotPath(t * S_END);

  function land(balls, { soft = false, duration = 280 } = {}) {
    const s = soft ? 0.4 : 1;
    sound('thud', soft ? 0.3 : 0.8, soft ? 200 : 150);
    return animateAll(balls, [
      pose({ op: 1, offset: 0 }),
      pose({ sx: 1 + 0.22 * s, sy: 1 - 0.22 * s, op: 1, offset: 0.25 }),
      pose({ sx: 1 - 0.05 * s, sy: 1 + 0.07 * s, op: 1, offset: 0.6 }),
      pose({ op: 1, offset: 1 }),
    ], duration, 'ease-out').done;
  }

  // ── Shared beats ──
  const lp = p => pose({ o: LOGO_FEET, ...p });
  // The ball squashed to the same width and height as the pressed logo, so the two swap without a pop.
  const FLAT = { sx: 1.7 / BALL_SCALE, sy: 0.74 / BALL_SCALE };

  // The logo is pressed flat onto its bottom edge, and the ball takes over from the same pancake
  // (same width and height, so there is no pop) and springs up round.
  async function squishIn({ logo, balls }) {
    await animateAll(logo, [lp({}), lp({ sx: 0.94, sy: 1.07 })], 140, 'ease-out').done;
    sound('squish');
    const flat = FLAT;
    animateAll(logo, [
      lp({ sx: 0.94, sy: 1.07, op: 1, ease: 'ease-in' }),
      lp({ sx: 1.2, sy: 0.5, y: FLOOR_DROP * 0.5, op: 1, offset: 0.55, ease: 'ease-in' }),
      lp({ sx: 1.6, sy: 0.3, y: FLOOR_DROP, op: 1, offset: 0.72 }),
      lp({ sx: 1.6, sy: 0.3, y: FLOOR_DROP, op: 0, offset: 0.8 }),
      lp({ sx: 1.6, sy: 0.3, y: FLOOR_DROP, op: 0 }),
    ], 300);
    await animateAll(balls, [
      pose({ ...flat, op: 0 }),
      pose({ ...flat, op: 0, offset: 0.4 }),
      pose({ ...flat, op: 1, offset: 0.45, ease: 'ease-out' }),
      pose({ sx: 0.85, sy: 1.25, op: 1, offset: 0.6, ease: 'ease-in-out' }),
      pose({ sx: 1.06, sy: 0.94, op: 1, offset: 0.78, ease: 'ease-in-out' }),
      pose({ sx: 0.98, sy: 1.03, op: 1, offset: 0.9, ease: 'ease-in-out' }),
      pose({ op: 1 }),
    ], 520).done;
  }

  // The reverse: the ball is pressed down to the pancake, and the logo springs up out of it.
  function squishOut({ logo, balls }) {
    animateAll(balls, [
      pose({ op: 1, ease: 'ease-in' }),
      pose({ ...FLAT, op: 1, offset: 0.55 }),
      pose({ ...FLAT, op: 0, offset: 0.7 }),
      pose({ ...FLAT, op: 0 }),
    ], 260);
    setTimeout(() => sound('pop'), 190);
    const pressed = { sx: 1.6, sy: 0.3, y: FLOOR_DROP };
    return animateAll(logo, [
      lp({ ...pressed, op: 0 }),
      lp({ ...pressed, op: 0, offset: 0.3 }),
      lp({ ...pressed, op: 1, offset: 0.34, ease: 'ease-out' }),
      lp({ sx: 0.9, sy: 1.22, y: FLOOR_DROP * 0.2, op: 1, offset: 0.6, ease: 'ease-in-out' }),
      lp({ sx: 1.04, sy: 0.94, op: 1, offset: 0.78, ease: 'ease-in-out' }),
      lp({ sx: 0.99, sy: 1.02, op: 1, offset: 0.9, ease: 'ease-in-out' }),
      lp({ op: 1 }),
    ], 560).done;
  }

  const crouch = ({ balls }) =>
    animateAll(balls, [pose({ op: 1 }), pose({ sx: 1.12, sy: 0.8, op: 1 })], 150, 'ease-out').done;

  // Two small bounces and a settle after the ball comes back down.
  async function bounceHome({ balls }) {
    await land(balls);
    await move(balls, t => ({ y: -8 * hop(t), sx: 1 - 0.03 * hop(t), sy: 1 + 0.05 * hop(t), op: 1 }), 240).done;
    await land(balls, { soft: true, duration: 220 });
    // One last little bounce, and it comes down into the logo.
    await move(balls, t => ({ y: -4 * hop(t), sx: 1 - 0.02 * hop(t), sy: 1 + 0.03 * hop(t), op: 1 }), 200).done;
    sound('thud', 0.2, 230);
  }

  // The hoop: swings up out of the floor toward you, and folds back down.
  function makeHoop(k) {
    const state = { phi: Math.PI / 2, wob: 0, op: 0 };
    const draw = () => renderHoop(k, state);
    draw();
    return {
      // Elastic swing of the net: damped, starting by stretching down.
      wobble: (amp, duration) => drive(duration, t => {
        state.wob = Math.exp(-4 * t) * Math.sin(TAU * 3 * t) * amp;
        draw();
      }),
      async unfold() {
        sound('whoosh', 0.4, 300, 1800, 0.22);
        setTimeout(() => sound('thud', 0.25, 220), 420);
        setTimeout(() => this.wobble(0.1, 600), 380);
        await drive(520, t => {
          state.phi = (Math.PI / 2) * (1 - easeOutBack(t));
          state.op = Math.min(1, t * 6);
          draw();
        });
      },
      fold: () => drive(420, t => {
        state.phi = (Math.PI / 2) * easeIn(t);
        state.op = 1 - clamp((t - 0.55) / 0.45, 0, 1);
        draw();
      }),
    };
  }

  // The ball rises in front of the hoop and drops into it, so it changes layer at the apex.
  const swap = (to, from) => {
    from.forEach(el => { el.style.visibility = 'hidden'; });
    to.forEach(el => { el.style.visibility = 'visible'; });
  };

  // A make: up over the board, down through the net, and back to the floor.
  async function flight(k, hoop) {
    const { balls, front, back } = k;
    sound('whoosh', 0.6, 300, 1500, 0.18);
    spin(k, 2, SHOT_MS);
    setTimeout(() => swap(back, front), APEX_MS);
    setTimeout(() => sound('swish'), 0.97 * TS);
    setTimeout(() => hoop.wobble(0.32, 750), 0.99 * TS);
    await move(balls, t => ({ ...shot(t), op: 1 }), SHOT_MS, CENTER, 90).done;
    // Back in front only once it is on the floor: earlier, it would still overlap the net and jump over it.
    swap(front, back);
  }

  // The whole animation: the logo squishes into the ball, the hoop folds up, the ball shoots and
  // swishes, bounces home, and the hoop folds away as the ball springs back into the logo.
  async function run(k) {
    const hoop = makeHoop(k);
    await squishIn(k);
    await hoop.unfold();
    await wait(200);
    await crouch(k);
    await flight(k, hoop);
    await bounceHome(k);
    hoop.fold();
    await squishOut(k);
  }

  async function play(root) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const q = sel => [...root.querySelectorAll(sel)];
    const one = sel => root.querySelector(sel);
    const k = {
      logo: q('.nba-logo__logo'),
      balls: q('.nba-logo__ball'),
      seams: q('.nba-logo__seams'),
      front: q('.nba-logo__ball--front'),
      back: q('.nba-logo__ball--back'),
      hoop: q('.nba-logo__hoop'),
      board: one('.nba-logo__board'),
      inner: one('.nba-logo__inner'),
      netBack: one('.nba-logo__net-back'),
      rimBack: one('.nba-logo__rim-back'),
      netFront: one('.nba-logo__net-front'),
      rimFront: one('.nba-logo__rim-front'),
      haloBoard: one('.nba-logo__halo-board'),
    };
    try {
      await run(k);
    } finally {
      [...k.logo, ...k.balls].forEach(el => {
        el.getAnimations().forEach(a => a.cancel());
        el.style.visibility = '';
      });
      k.hoop.forEach(el => { el.style.opacity = ''; });
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
