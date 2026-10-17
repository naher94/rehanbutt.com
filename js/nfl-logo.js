/**
 * NFL Logo Orbit (home intro)
 *
 * Clicking the inline NFL shield pops its football out of the shield. The ball
 * grows and fades from white into leather brown, flies half way around the
 * shield as a spiral (nose along its path, laces turning), passing behind the
 * shield and then in front, and lands back in its place as the colors fade out.
 * The shield squashes a little when the ball leaves and again when it lands.
 *
 * The SVG lives in _includes/nfl-logo.svg. Everything is in SVG units (the
 * shield is 31 × 44). The football is drawn by script each frame; the shield's
 * squash uses the Web Animations API. Sounds are synthesized with Web Audio.
 */
(function () {
  'use strict';

  const triggers = document.querySelectorAll('.nfl-logo-trigger');
  if (!triggers.length) return;

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = t => t * t * (3 - 2 * t);
  const easeInOut = t => 0.5 - Math.cos(Math.PI * t) / 2;

  const SHIELD_FEET = [15.5, 44];                        // the shield squashes from its point
  // The football printed on the shield, which the animated one starts from and lands on.
  const STAMP = { x: 15.46, y: 12.1, angle: -57, a: 5.8, b: 3.4 };
  const WHITE = '#ffffff', NAVY = '#013369', LEATHER = '#8a4a22', LEATHER_DARK = '#4a2410';

  // The orbit: a circle around the shield, tilted back so it reads as an ellipse, then turned.
  const CENTER = [15.5, 22];
  const R = 32;                                          // orbit radius
  const SIN_A = Math.sin(35 * DEG), COS_A = Math.cos(35 * DEG);   // tilt: how open the ellipse is
  const SIN_B = Math.sin(-18 * DEG), COS_B = Math.cos(-18 * DEG); // turn of the ellipse on screen
  const U0 = 0.33;                                       // the ball starts this far out, as a fraction of R
  const THETA_START = 0;                                 // the right side of the orbit
  const GROW = 0.55;                                     // how much bigger it gets in flight

  // thetaEnd is how far round it goes (negative: over the top, behind the shield, then round the
  // front); 300° is a half orbit that ends sweeping up the face. spins are the spiral turns about
  // its long axis, and whoosh is when the second whoosh plays. lead is how much of the flight it
  // takes to leave the shield (a longer lead is a gentler pop), leadOut is the same for the landing
  // (a longer one makes the turn back into the stamp wider), and linear is how much of the swing is
  // at a constant speed (the rest eases in and out, so a lower number starts more slowly).
  const ORBIT = { thetaEnd: -300 * DEG, ms: 2600, spins: 6, whoosh: 1500, lead: 0.2, leadOut: 0.34, linear: 0.04 };

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
    pop() { sweep('triangle', 300, 1400, 0.1, 0.4, 0.004); },
    thud(peak = 0.7, from = 150) { sweep('sine', from, 50, 0.18, peak, 0.004); },
  };
  function sound(name, ...args) {
    if (!ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }

  // ── The shield's squash ──
  function squash(shield, amount, duration) {
    const [ox, oy] = SHIELD_FEET;
    const frame = (sx, sy, offset) => ({
      transform: `translate(${ox}px, ${oy}px) scale(${sx}, ${sy}) translate(${-ox}px, ${-oy}px)`,
      offset,
    });
    return Promise.all(shield.map(el => el.animate([
      frame(1, 1, 0),
      frame(1 + 0.035 * amount, 1 - 0.06 * amount, 0.3),
      frame(1 - 0.01 * amount, 1 + 0.025 * amount, 0.65),
      frame(1, 1, 1),
    ], { duration, easing: 'ease-out', fill: 'both' }).finished));
  }

  // ── The flight ──
  // The ball leaves the printed football and swings out to the right of the shield, goes round it
  // half way, and sweeps up the front of the shield to land. wIn and wOut are how far it has left
  // the shield at each end: the orbit is blended into the stamp's position so it leaves and lands
  // exactly on the printed football.
  function orbit(t) {
    const wIn = smooth(clamp(t / ORBIT.lead, 0, 1)), wOut = smooth(clamp((1 - t) / ORBIT.leadOut, 0, 1));
    const w = wIn * wOut;
    const u = U0 + (1 - U0) * w;
    const theta = THETA_START + (ORBIT.thetaEnd - THETA_START) * (ORBIT.linear * t + (1 - ORBIT.linear) * easeInOut(t));
    const x0 = u * R * Math.cos(theta), y0 = u * R * Math.sin(theta) * SIN_A, z0 = u * R * Math.sin(theta) * COS_A;
    return {
      wIn, wOut, w,
      x: CENTER[0] + x0 * COS_B - y0 * SIN_B,
      y: CENTER[1] + x0 * SIN_B + y0 * COS_B,
      z: z0,                                             // toward you is positive
    };
  }
  const START = orbit(0), END = orbit(1);
  const D0 = [STAMP.x - START.x, STAMP.y - START.y], D1 = [STAMP.x - END.x, STAMP.y - END.y];
  function position(t) {
    const o = orbit(t), b0 = 1 - o.wIn, b1 = 1 - o.wOut;
    return { x: o.x + D0[0] * b0 + D1[0] * b1, y: o.y + D0[1] * b0 + D1[1] * b1, z: o.z, w: o.w };
  }
  // The first moment it is clear of the shield's right edge (or, if it never gets that far out, when it is farthest out).
  let tClear = -1, best = 0;
  for (let i = 0; i <= 400 && tClear < 0; i++) {
    const x = position(i / 400).x;
    if (x > 40.5) tClear = i / 400;
    else if (i / 400 < 0.4 && x > position(best / 400).x) best = i;
  }
  if (tClear < 0) tClear = best / 400;

  function ballAt(t) {
    const p = position(t);
    // Velocity, for the nose direction and for foreshortening when it travels toward or away from you.
    const dt = 0.002, a = position(Math.max(0, t - dt)), c = position(Math.min(1, t + dt));
    const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    const speed = Math.hypot(vx, vy, vz) || 1;
    p.length = clamp(Math.hypot(vx, vy) / speed, 0.55, 1);
    // The long axis follows the velocity (it is the same line both ways), turning in from the stamp's angle.
    let d = ((Math.atan2(vy, vx) / DEG - STAMP.angle) % 180 + 180) % 180;
    if (d > 90) d -= 180;
    p.angle = STAMP.angle + d * p.w;
    p.size = (1 + GROW * p.w) * (1 + p.z * p.w / 90);
    p.phi = ORBIT.spins * TAU * t;
    // In front of the shield until it has cleared its edge, so it pops out over the face; after that,
    // by depth. Each later swap happens at the far left or right of the orbit, clear of the shield.
    p.layerZ = t < tClear ? 1 : p.z;
    // Leather brown with white laces in flight; white with navy laces on the shield.
    p.k = smooth(clamp((t - 0.03) / 0.15, 0, 1)) * (1 - smooth(clamp((t - 0.82) / 0.15, 0, 1)));
    return p;
  }

  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (c1, c2, k) => {
    const a = hex(c1), b = hex(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  // The laces, on the surface of a spheroid turned by phi about the long axis. Only the half facing
  // you is drawn, so they slide across the ball and disappear around the back as it spins.
  function lacesPath(phi) {
    const { a, b } = STAMP;
    let d = '';
    const runs = pts => {
      let run = [], prev = null;
      const flush = () => { if (run.length > 1) d += 'M' + run.join('L'); run = []; };
      const fmt = p => p.x.toFixed(2) + ' ' + p.y.toFixed(2);
      pts.forEach(cur => {
        if (prev && (prev.z >= 0) !== (cur.z >= 0)) {
          const f = prev.z / (prev.z - cur.z);
          const edge = { x: prev.x + (cur.x - prev.x) * f, y: prev.y + (cur.y - prev.y) * f };
          if (prev.z >= 0) { run.push(fmt(edge)); flush(); } else run = [fmt(edge)];
        }
        if (cur.z >= 0) run.push(fmt(cur));
        prev = cur;
      });
      flush();
    };
    const onSurface = (u, angle) => {
      const rho = b * Math.sqrt(1 - u * u);
      return { x: u * a, y: rho * Math.sin(angle), z: rho * Math.cos(angle) };
    };
    runs(Array.from({ length: 15 }, (_, i) => onSurface(-0.44 + 0.88 * i / 14, phi)));
    [-0.27, -0.09, 0.09, 0.27].forEach(u => runs([onSurface(u, phi - 0.42), onSurface(u, phi + 0.42)]));
    return d;
  }

  function render(k, t) {
    const p = ballAt(t);
    const transform = `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.angle.toFixed(2)}) ` +
      `scale(${(p.size * p.length).toFixed(3)} ${p.size.toFixed(3)})`;
    const laces = lacesPath(p.phi);
    const body = mix(WHITE, LEATHER, p.k), outline = mix(WHITE, LEATHER_DARK, p.k), lace = mix(NAVY, WHITE, p.k);
    k.footballs.forEach(el => el.setAttribute('transform', transform));
    k.halos.forEach(el => el.setAttribute('stroke-opacity', p.k.toFixed(3)));
    k.bodies.forEach(el => { el.setAttribute('fill', body); el.setAttribute('stroke', outline); });
    k.laces.forEach(el => { el.setAttribute('d', laces); el.setAttribute('stroke', lace); });
    // Behind the shield while on the far side of the orbit, in front otherwise.
    const behind = p.layerZ < 0;
    k.front.forEach(el => { el.style.visibility = behind ? 'hidden' : 'visible'; });
    k.back.forEach(el => { el.style.visibility = behind ? 'visible' : 'hidden'; });
  }

  async function run(k) {
    // The football is on the shield; the animated one takes over from it.
    k.balls.forEach(el => { el.style.opacity = 1; });
    k.stamp.forEach(el => { el.style.opacity = 0; });
    render(k, 0);
    squash(k.shield, 1, 380);
    sound('pop');
    setTimeout(() => sound('whoosh', 0.9, 400, 1800, 0.22), 160);
    setTimeout(() => sound('whoosh', 0.7, 1600, 500, 0.15), ORBIT.whoosh);
    await drive(ORBIT.ms, t => render(k, t));

    // Back on the shield.
    k.balls.forEach(el => { el.style.opacity = 0; });
    k.stamp.forEach(el => { el.style.opacity = 1; });
    sound('thud', 0.5, 200);
    sound('pop');
    await squash(k.shield, 0.6, 340);
  }

  async function play(root) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const q = sel => [...root.querySelectorAll(sel)];
    const k = {
      shield: q('.nfl-logo__shield'),
      stamp: q('.nfl-logo__stamp'),
      balls: q('.nfl-logo__ball'),
      front: q('.nfl-logo__ball--front'),
      back: q('.nfl-logo__ball--back'),
      footballs: q('.nfl-logo__football'),
      halos: q('.nfl-logo__halo'),
      bodies: q('.nfl-logo__body'),
      laces: q('.nfl-logo__laces'),
    };
    try {
      await run(k);
    } finally {
      k.shield.forEach(el => el.getAnimations().forEach(a => a.cancel()));
      [...k.balls, ...k.stamp].forEach(el => { el.style.opacity = ''; el.style.visibility = ''; });
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
