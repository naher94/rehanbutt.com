/**
 * Disney Animation Hat (home intro)
 *
 * Clicking the inline hat plays one of six tricks: spin lift, tornado,
 * somersault, float, brooms, wand draw. Tricks come from a shuffled bag, so
 * all six play once before any repeats. Motion uses the Web Animations API;
 * sounds are synthesized with Web Audio, so there are no files to load.
 *
 * The SVG lives in _includes/wdas-hat.svg. Tricks were prototyped on /hat-lab.
 */
(function () {
  'use strict';

  const triggers = document.querySelectorAll('.wdas-hat-trigger');
  if (!triggers.length) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const wait = d => new Promise(r => setTimeout(r, d));
  const TAU = Math.PI * 2;
  const SVG_NS = 'http://www.w3.org/2000/svg';

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
  const sfx = {
    whoosh(dur, from, to, peak = 0.35) {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.4;
      f.frequency.setValueAtTime(from, t);
      f.frequency.exponentialRampToValueAtTime(to, t + dur);
      noise(t, dur).connect(f).connect(envelope(t, peak, dur * 0.45, dur * 0.55)).connect(master);
    },
    twinkle(dur) {
      const notes = [1568, 2093, 1760, 2637, 2349, 3136, 2794];
      const t0 = ctx.currentTime;
      notes.forEach((hz, i) => {
        const t = t0 + i * dur / notes.length;
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        o.connect(envelope(t, 0.12, 0.005, 0.25)).connect(master);
        o.start(t);
        o.stop(t + 0.3);
      });
    },
    thud(peak = 0.9, from = 160) {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
      o.connect(envelope(t, peak, 0.004, 0.22)).connect(master);
      o.start(t);
      o.stop(t + 0.3);
    },
    poof() {
      const t = ctx.currentTime;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1400, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      noise(t, 0.45).connect(f).connect(envelope(t, 0.3, 0.01, 0.4)).connect(master);
    },
    pop() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.08);
      o.connect(envelope(t, 0.4, 0.004, 0.12)).connect(master);
      o.start(t);
      o.stop(t + 0.2);
    },
  };
  function sound(name, ...args) {
    if (!ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }
  const secs = d => d / 1000;

  // ── Motion helpers ──
  const easeOut = t => 1 - (1 - t) ** 3;
  const easeInOut = t => 0.5 - Math.cos(Math.PI * t) / 2;
  const hop = t => 4 * t * (1 - t);

  // A cone spinning on its axis reads as a horizontal flip; clamp so it never collapses to a line.
  // rot turns around pivotY (px above the brim), so somersaults can pivot on the hat's middle.
  function pose({ x = 0, y = 0, spin = 0, sx = 1, sy = 1, depth = 1, rot = 0, pivotY = 0 }) {
    let c = Math.cos(spin);
    c = (c < 0 ? -1 : 1) * Math.max(Math.abs(c), 0.22);
    return {
      transform: `translate(${x}px, ${y}px) translate(0px, ${pivotY}px) rotate(${rot}deg) ` +
        `translate(0px, ${-pivotY}px) scale(${c * sx * depth}, ${sy * depth})`,
    };
  }
  const sample = fn => Array.from({ length: 41 }, (_, i) => pose(fn(i / 40)));

  function animateAll(els, keyframes, duration, easing = 'linear') {
    const anims = els.map(el => el.animate(keyframes, { duration, easing, fill: 'both' }));
    return { anims, done: Promise.all(anims.map(a => a.finished)) };
  }
  const move = (els, fn, duration) => animateAll(els, sample(fn), duration);

  // Calls spawn with the hat's pose every `every` ms while anim runs; returns a stop function.
  function trail(anim, fn, every, spawn) {
    const total = anim.effect.getTiming().duration;
    const id = setInterval(() => spawn(fn(Math.min((anim.currentTime || 0) / total, 1))), every);
    return () => clearInterval(id);
  }

  // Calls cb(t) every `every` ms until `duration` ms have passed.
  function tick(duration, every, cb) {
    const start = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) return clearInterval(id);
      cb(t);
    }, every);
  }

  // ── Particles ──
  function particle(fx, el, keyframes, duration, easing = 'ease-out') {
    fx.appendChild(el);
    el.animate(keyframes, { duration, easing, fill: 'both' }).finished.then(() => el.remove());
  }

  const SPARK_COLORS = ['#f5b82e', '#ffd66b', '#ffd66b', '#6bb1e2'];
  function starEl(fill = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)]) {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', 'M0-5C.8-.8.8-.8 5 0 .8.8.8.8 0 5-.8.8-.8.8-5 0-.8-.8-.8-.8 0-5z');
    el.setAttribute('fill', fill);
    return el;
  }
  // Particles are drawn in SVG units, so play() sets fx.dataset.scale to keep them legible when the
  // hat is text-sized. Returns [size, travel] multipliers.
  function fxScale(fx) {
    const s = Number(fx.dataset.scale) || 1;
    return [s, 1 + (s - 1) * 0.5];
  }
  function spark(fx, x, y, vx, vy, life = rand(550, 800)) {
    const [s, v] = fxScale(fx);
    vx *= v;
    vy *= v;
    particle(fx, starEl(), [
      { transform: `translate(${x}px, ${y}px) scale(0) rotate(0deg)` },
      { transform: `translate(${x + vx * 0.4}px, ${y + vy * 0.4}px) scale(${rand(0.7, 1.2) * s}) rotate(90deg)`, offset: 0.3 },
      { transform: `translate(${x + vx}px, ${y + vy + 10 * v}px) scale(0) rotate(200deg)` },
    ], life);
  }
  const trailSpark = (fx, x, y, side) => spark(fx, x, y, side * rand(8, 20), rand(-14, 2));
  function burst(fx, x, y, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rand(-0.2, 0.2), v = speed * rand(0.7, 1.1);
      spark(fx, x, y, Math.cos(a) * v, Math.sin(a) * v, rand(600, 850));
    }
  }
  // A spark that follows fn(t) -> {x, y, s} for the whole duration, fading at both ends.
  function followSpark(fx, fn, duration, el = starEl()) {
    const [s] = fxScale(fx);
    particle(fx, el, Array.from({ length: 61 }, (_, i) => {
      const t = i / 60, p = fn(t);
      return { transform: `translate(${p.x}px, ${p.y}px) scale(${p.s * s}) rotate(${t * 540}deg)`, opacity: Math.min(1, t * 8, (1 - t) * 8) };
    }), duration, 'linear');
  }

  function dust(fx, x, y, side, size = 1) {
    const [s, v] = fxScale(fx);
    for (let i = 0; i < 3; i++) {
      const el = document.createElementNS(SVG_NS, 'circle');
      el.setAttribute('r', (rand(4.5, 7.5) * size * s).toFixed(1));
      el.setAttribute('fill', '#d9cfbd');
      const dx = side * rand(10, 24) * size * v, dy = rand(3, 10) * size * v;
      setTimeout(() => particle(fx, el, [
        { transform: `translate(${x}px, ${y}px) scale(0.3)`, opacity: 0.95 },
        { transform: `translate(${x + dx}px, ${y - dy}px) scale(1.25)`, opacity: 0 },
      ], rand(500, 700), 'cubic-bezier(.1,.7,.3,1)'), i * 40);
    }
  }

  // ── Landing ──
  // Shared touchdown: thud, dust both sides, wings flinch, hat squash-and-settle.
  function land(k, { from = { sx: 0.94, sy: 1.12 }, duration = 380, soft = false } = {}) {
    const s = soft ? 0.45 : 1;
    sound('thud', soft ? 0.35 : 0.9);
    if (!soft) sound('poof');
    dust(k.fx, k.b.x + 4, k.brimY, -1, soft ? 0.6 : 1);
    dust(k.fx, k.b.x + k.b.width - 4, k.brimY, 1, soft ? 0.6 : 1);
    animateAll(k.wings, [
      { transform: 'scale(1, 1)' },
      { transform: `scale(${1 + 0.03 * s}, ${1 - 0.08 * s})`, offset: 0.25 },
      { transform: 'scale(1, 1)' },
    ], duration, 'ease-out');
    return animateAll(k.hat, [
      pose(from),
      { ...pose({ sx: 1 + 0.2 * s, sy: 1 - 0.22 * s }), offset: 0.25 },
      { ...pose({ sx: 1 - 0.05 * s, sy: 1 + 0.07 * s }), offset: 0.55 },
      { ...pose({ sx: 1 + 0.02 * s, sy: 1 - 0.02 * s }), offset: 0.8 },
      pose({}),
    ], duration, 'ease-out').done;
  }

  // ── Tricks ──
  // Each run(k) is a script of beats; k holds the hat parts, effects layer and resting position.
  const VERSIONS = [
    {
      id: 'v1', // Spin lift
      async run(k) {
        const { hat, fx, b, brimX, brimY } = k;
        const LIFT = 46, ORBIT_X = 30, ORBIT_Y = 7;
        // Orbit front point is where the lift ends; the back of the loop sits higher and smaller.
        const orbitAt = t => {
          const a = TAU * easeInOut(t);
          return { x: ORBIT_X * Math.sin(a), y: -LIFT - ORBIT_Y * (1 - Math.cos(a)), depth: 1 - 0.06 * (1 - Math.cos(a)) };
        };

        await animateAll(hat, [pose({}), pose({ sx: 1.08, sy: 0.88 })], 140, 'ease-out').done;

        sound('whoosh', secs(520), 500, 2400);
        await move(hat, t => {
          const e = easeOut(t);
          return { y: -LIFT * e, spin: TAU * e, sx: 1.08 - 0.08 * e, sy: 0.88 + 0.12 * e + 0.1 * Math.sin(Math.PI * t) };
        }, 520).done;

        sound('twinkle', secs(900));
        const orbitPose = t => ({ ...orbitAt(t), spin: TAU + 2 * TAU * t });
        const orbit = move(hat, orbitPose, 900);
        let side = 1;
        const stop = trail(orbit.anims[0], orbitPose, 55, p => {
          side = -side;
          trailSpark(fx, brimX + p.x + side * b.width * 0.42 * p.depth, brimY + p.y, side);
        });
        await orbit.done;
        stop();

        sound('whoosh', secs(300), 2200, 600, 0.2);
        await move(hat, t => {
          const e = t * t;
          return { y: -LIFT * (1 - e), spin: 3 * TAU + TAU * easeOut(t), sx: 1 - 0.06 * e, sy: 1 + 0.12 * e };
        }, 300).done;

        await land(k);
      },
    },
    {
      id: 'v2', // Tornado
      async run(k) {
        const { hat, fx, b, brimX, brimY } = k;
        const RISE = 70;

        await move(hat, t => ({ sx: 1 + 0.1 * easeOut(t), sy: 1 - 0.14 * easeOut(t) }), 120).done;

        sound('whoosh', secs(900), 300, 3500, 0.4);
        const risePose = t => {
          const settle = Math.min(t * 4, 1);
          return {
            x: 9 * Math.sin(4 * Math.PI * t) * Math.sin(Math.PI * t),
            y: -RISE * easeInOut(t),
            spin: 6 * Math.PI * t ** 1.6,
            sx: 1.1 - 0.1 * settle,
            sy: 0.86 + 0.14 * settle + 0.12 * Math.sin(Math.PI * t),
          };
        };
        const rise = move(hat, risePose, 900);
        let side = 1;
        const stop = trail(rise.anims[0], risePose, 40, p => {
          side = -side;
          spark(fx, brimX + p.x + side * b.width * 0.42, brimY + p.y, side * rand(4, 12), rand(4, 16));
        });
        await rise.done;
        stop();

        sound('pop');
        sound('twinkle', 0.35);
        burst(fx, brimX, brimY - RISE - b.height * 0.5, 12, 26);
        await move(hat, t => {
          const p = Math.sin(Math.PI * t);
          return { y: -RISE - 4 * p, sx: 1 + 0.12 * p, sy: 1 + 0.12 * p };
        }, 200).done;

        sound('whoosh', secs(320), 2400, 500, 0.2);
        await move(hat, t => ({ y: -RISE * (1 - t * t), sx: 1 - 0.06 * t * t, sy: 1 + 0.14 * t * t }), 320).done;
        await land(k, { from: { sx: 0.94, sy: 1.14 }, duration: 260 });

        await move(hat, t => ({ y: -14 * hop(t), sx: 1 - 0.03 * hop(t), sy: 1 + 0.05 * hop(t) }), 280).done;
        await land(k, { from: {}, soft: true });
      },
    },
    {
      id: 'v3', // Somersault
      async run(k) {
        const { hat, fx, b, brimX, brimY } = k;
        const JUMP = 58, pivotY = -b.height * 0.45;

        await move(hat, t => ({ sx: 1 + 0.1 * easeOut(t), sy: 1 - 0.18 * easeOut(t) }), 180).done;

        sound('whoosh', secs(380), 500, 2000, 0.3);
        await move(hat, t => {
          const e = easeOut(t);
          return { y: -JUMP * e, rot: -25 * e, pivotY, sx: 1.1 - 0.1 * e, sy: 0.82 + 0.18 * e + 0.1 * Math.sin(Math.PI * t) };
        }, 380).done;

        sound('twinkle', secs(520));
        setTimeout(() => burst(fx, brimX, brimY - JUMP - 6 + pivotY, 14, 28), 260);
        await move(hat, t => ({ y: -JUMP - 6 * Math.sin(Math.PI * t), rot: -25 + 385 * easeInOut(t), pivotY }), 520).done;

        sound('whoosh', secs(280), 2200, 600, 0.2);
        await move(hat, t => ({ y: -JUMP * (1 - t * t), rot: 360, pivotY, sx: 1 - 0.06 * t * t, sy: 1 + 0.12 * t * t }), 280).done;
        await land(k, { duration: 240 });

        await move(hat, t => ({ rot: 11 * (1 - t) ** 2 * Math.sin(TAU * 2.5 * t) }), 700).done;
      },
    },
    {
      id: 'v4', // Float
      async run(k) {
        const { hat, fx, b, brimX, brimY } = k;
        const H = 54, HOVER = 1200, pivotY = -b.height * 0.5;

        for (const h of [5, 8]) {
          sound('thud', 0.2, 320);
          await move(hat, t => ({ y: -h * hop(t), sx: 1 - 0.03 * hop(t), sy: 1 + 0.06 * hop(t) }), 170).done;
        }

        sound('pop');
        for (let i = 0; i < 10; i++) {
          spark(fx, brimX + rand(-0.3, 0.3) * b.width, brimY, rand(-12, 12), rand(-28, -14));
        }
        await move(hat, t => {
          const p = Math.sin(Math.PI * t);
          return { y: -H * easeOut(t), sx: 1 - 0.08 * p, sy: 1 + 0.15 * p };
        }, 280).done;

        sound('twinkle', secs(HOVER));
        const hover = t => ({ y: -H + 4 * Math.sin(TAU * 1.5 * t), rot: 6 * Math.sin(TAU * t), pivotY });
        const cy = brimY - b.height * 0.45;
        for (let i = 0; i < 3; i++) {
          followSpark(fx, t => {
            const a = TAU * 1.75 * t + (i * TAU) / 3;
            return { x: brimX + b.width * 0.75 * Math.cos(a), y: cy + hover(t).y + 9 * Math.sin(a), s: 0.75 + 0.35 * Math.sin(a) };
          }, HOVER);
        }
        await move(hat, hover, HOVER).done;

        await move(hat, t => ({ y: -H + (H - 10) * easeInOut(t) }), 520).done;
        sound('whoosh', secs(140), 1800, 500, 0.15);
        await move(hat, t => ({ y: -10 * (1 - t * t), sx: 1 - 0.04 * t, sy: 1 + 0.08 * t }), 140).done;
        await land(k, { from: { sx: 0.96, sy: 1.08 } });
      },
    },
    {
      id: 'v6', // Brooms
      async run(k) {
        const { hat, left, right, fx, b, brimY } = k;

        await move(hat, t => ({ y: -20 * hop(t), sx: 1 - 0.03 * hop(t), sy: 1 + 0.06 * hop(t) }), 300).done;
        await land(k, { from: {}, duration: 260 });

        sound('twinkle', 0.45);
        burst(fx, b.x - 10, brimY - 12, 6, 16);
        burst(fx, b.x + b.width + 10, brimY - 12, 6, 16);
        await wait(220);

        for (const [els, dir] of [[left, -1], [right, 1], [left, -1], [right, 1]]) {
          sound('thud', 0.3, dir < 0 ? 240 : 300);
          move(hat, t => ({ y: -3 * hop(t), rot: dir * 5 * hop(t) }), 220);
          await move(els, t => ({ y: -10 * hop(t), rot: dir * 6 * hop(t), sy: 1 + 0.05 * hop(t) }), 220).done;
        }

        sound('whoosh', secs(320), 600, 1800, 0.2);
        move(left, t => ({ y: -14 * hop(t), rot: -4 * hop(t) }), 320);
        move(right, t => ({ y: -14 * hop(t), rot: 4 * hop(t) }), 320);
        await move(hat, t => ({ y: -24 * hop(t), sx: 1 - 0.04 * hop(t), sy: 1 + 0.08 * hop(t) }), 320).done;
        await land(k, { from: {} });
      },
    },
    {
      id: 'v7', // Wand draw
      async run(k) {
        const { hat, fx, b, brimX, brimY } = k;
        const SWOOSH = 900, DRAW = 700, TOTAL = SWOOSH + DRAW, split = SWOOSH / TOTAL;
        const [, v] = fxScale(fx);
        const star = { x: brimX, y: brimY - b.height - 10 - 22 * v };
        const starPts = Array.from({ length: 10 }, (_, i) => {
          const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? 9 : 22) * v;
          return { x: star.x + r * Math.cos(a), y: star.y + r * Math.sin(a) };
        });
        // Lower-left swoosh with a curl, ending on the star's top point.
        const swoosh = t => {
          const e = easeInOut(t);
          return {
            x: brimX - 70 + 70 * e + 18 * Math.sin(TAU * e) * (1 - e),
            y: brimY - 20 - (b.height - 10 + 44 * v) * Math.sin((Math.PI / 2) * e) + 14 * Math.sin(TAU * 1.5 * e) * (1 - e),
          };
        };
        const drawStar = t => {
          const seg = t * 10, i = Math.min(Math.floor(seg), 9), f = seg - i;
          const p = starPts[i], q = starPts[(i + 1) % 10];
          return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
        };
        const wand = t => ({ ...(t < split ? swoosh(t / split) : drawStar((t - split) / (1 - split))), s: 1.4 });

        followSpark(fx, wand, TOTAL, starEl('#fff3b0'));
        tick(TOTAL, 28, t => {
          const p = wand(t);
          if (t < split) spark(fx, p.x, p.y, rand(-4, 4), rand(0, 8), rand(500, 700));
          else spark(fx, p.x, p.y, rand(-2, 2), rand(-2, 2), rand(900, 1100));
        });
        sound('whoosh', secs(SWOOSH), 400, 2600, 0.25);
        setTimeout(() => sound('twinkle', secs(DRAW)), SWOOSH);
        await move(hat, t => ({ rot: clamp((wand(t).x - brimX) * 0.35, -14, 14), y: -3 * Math.sin(Math.PI * t) }), TOTAL).done;

        sound('pop');
        burst(fx, star.x, star.y, 12, 24);
        sound('whoosh', secs(380), 500, 2400, 0.3);
        await move(hat, t => ({ y: -34 * easeOut(t), spin: TAU * easeOut(t), sy: 1 + 0.1 * Math.sin(Math.PI * t) }), 380).done;
        await move(hat, t => ({ y: -34 * (1 - t * t), sx: 1 - 0.06 * t * t, sy: 1 + 0.12 * t * t }), 260).done;
        await land(k);
      },
    },
  ];

  // ── Cycle ──
  // Shuffled bag: every trick plays once before any repeats, and a new round
  // never opens with the trick that just played.
  let bag = [], last = null;
  function nextVersion() {
    if (!bag.length) {
      bag = VERSIONS.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[0] === last) bag.push(bag.shift());
    }
    return (last = bag.shift());
  }

  // ── Play ──
  async function play(root) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const hat = [...root.querySelectorAll('.wdas-hat__hat')];
    const b = hat[0].getBBox();
    const left = [...root.querySelectorAll('.wdas-hat__wing-left')];
    const right = [...root.querySelectorAll('.wdas-hat__wing-right')];
    const k = {
      hat,
      left,
      right,
      wings: [...left, ...right],
      fx: root.querySelector('.wdas-hat__fx'),
      b,
      brimX: b.x + b.width / 2,
      brimY: b.y + b.height,
    };
    // 138 = viewBox height, so particles stay at least ~5px on screen at text size.
    k.fx.dataset.scale = Math.max(1.3, 138 / root.querySelector('svg').getBoundingClientRect().height);
    try {
      await nextVersion().run(k);
    } finally {
      [...k.hat, ...k.wings].forEach(el => el.getAnimations().forEach(a => a.cancel()));
      delete root.dataset.playing;
    }
  }

  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    unlockAudio();
    play(trigger);
  }));
})();
