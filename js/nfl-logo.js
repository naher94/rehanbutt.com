/**
 * NFL Logo Orbit (home intro)
 *
 * Clicking the inline NFL shield pops its football out of the shield. The ball
 * grows and fades from white into leather brown, flies once around the shield
 * as a spiral (nose along its path, laces turning), passing behind the shield
 * and then in front, and lands back in its place as the colors fade out. The
 * shield squashes a little when the ball leaves and again when it lands.
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

  // The orbit options. thetaEnd is how far round it goes (negative: over the top, behind the shield,
  // then round the front); 300° is a half orbit that ends sweeping up the face, and the full orbit
  // adds one more turn in front of that. spins are the spiral turns about its long axis, and whoosh
  // is when the second whoosh plays. lead is how much of the flight it takes to leave the shield (a
  // longer lead is a gentler pop), leadOut is the same for the landing (a longer one makes the turn
  // back into the stamp wider), and linear is how much of the swing is at a constant speed (the
  // rest eases in and out, so a lower number starts more slowly).
  const VARIANTS = {
    full: {
      label: 'Full orbit',
      note: 'A full orbit round the shield, then round again and up the front to land.',
      thetaEnd: -660 * DEG, ms: 3200, spins: 9, whoosh: 1700, lead: 0.08, linear: 0.2,
    },
    half: {
      label: 'Half orbit',
      note: 'Out to the right, behind the shield, round the front and up the face to land.',
      thetaEnd: -300 * DEG, ms: 2300, spins: 6, whoosh: 1300, lead: 0.08, linear: 0.2,
    },
    kick: {
      label: 'Kicked over the shield',
      note: 'The shield jolts as the ball is kicked up and over the top, tumbling end over end. It lands to the right, bounces, and hops back across the front to the shield.',
      kick: true, ms: 2800, squash: 1.6,
      cues: [[0, 'thud', 0.8, 180], [60, 'whoosh', 0.8, 300, 1500, 0.2], [1380, 'thud', 0.6, 160], [1700, 'whoosh', 0.5, 700, 1400, 0.12]],
    },
    kickBack: {
      label: 'Kicked front to back',
      note: 'The ball is kicked away from you, up and over the top of the shield, shrinking as it goes, and drops behind it. A thump from behind, then it is kicked back over the top, growing toward you, and lands in the shield.',
      kickBack: true, ms: 2250, squash: 1.6, pulses: [[1050, 0.9]],
      cues: [[0, 'thud', 0.8, 180], [60, 'whoosh', 0.8, 300, 1500, 0.2], [1000, 'thud', 0.5, 140], [1250, 'whoosh', 0.5, 400, 1500, 0.15]],
    },
    pass: {
      label: 'Pass and catch',
      note: 'The ball is thrown off to the right in a tight spiral, shrinking into the distance, then thrown back, growing as it comes in, and caught by the shield with a squash.',
      path: 'pass', ms: 2800, spins: 8, squash: 1.2, landSquash: 1.3,
      cues: [[0, 'thud', 0.6, 200], [60, 'whoosh', 0.8, 500, 1700, 0.2], [1450, 'whoosh', 0.7, 1500, 500, 0.15]],
    },
    spike: {
      label: 'Touchdown spike',
      note: 'The ball pops up over the shield and is spiked down onto its base. The shield bounces, the stars burst off and drop back into place, and the ball rebounds and rolls home.',
      path: 'spike', ms: 3200, spins: 6, squash: 1.2, pulses: [[1280, 2.6]], stars: 1280,
      cues: [[0, 'pop'], [60, 'whoosh', 0.8, 400, 1700, 0.2], [1180, 'whoosh', 0.5, 1600, 600, 0.15], [1280, 'thud', 0.9, 120], [1300, 'clank'], [1900, 'thud', 0.4, 180]],
    },
    top: {
      label: 'Spinning top',
      note: 'The ball rises over the shield, stands on its tip on the notch and spins like a top, laces whirling, with a wobble that dies down. It tips over and settles back into the shield.',
      path: 'top', ms: 3200, squash: 1, landSquash: 0.8,
      cues: [[0, 'pop'], [120, 'whoosh', 0.7, 400, 1500, 0.2], [2300, 'whoosh', 0.5, 1500, 500, 0.12]],
    },
    goal: {
      label: 'Through the goalposts',
      note: 'The ball pops up and the shield is pressed flat and springs back up as goalposts. The ball flies through the uprights, away from you, round behind and across the front, while the goalposts press flat and the shield springs back to catch it.',
      path: 'goal', ms: 3600, spins: 7, squash: 1, landSquash: 1,
      morphs: [[400, 'toGoal'], [2100, 'toShield']],
      cues: [[0, 'pop'], [60, 'whoosh', 0.8, 400, 1700, 0.2], [380, 'thud', 0.5, 200], [700, 'pop'], [1000, 'whoosh', 0.7, 1500, 500, 0.15], [2100, 'thud', 0.4, 200], [2450, 'pop'], [2300, 'whoosh', 0.6, 400, 1500, 0.15]],
    },
    halfSmooth: {
      label: 'Half orbit, smooth pop',
      note: 'The half orbit with a gentler pop: the ball eases out of the shield and picks up speed, instead of leaving at once.',
      thetaEnd: -300 * DEG, ms: 2600, spins: 6, whoosh: 1500, lead: 0.2, leadOut: 0.34, linear: 0.04,
    },
  };
  window.nflLogoVariants = VARIANTS;

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
    // Stars shaken loose: two bright partials that die fast.
    clank() {
      sweep('triangle', 1900, 1500, 0.18, 0.3, 0.002);
      sweep('sine', 2800, 2300, 0.12, 0.18, 0.002);
    },
  };
  // nfl-playground.html sets window.nflLogoDebug to log cues, mute them, and replay them in time.
  function sound(name, ...args) {
    const debug = window.nflLogoDebug;
    if (debug && debug.onSound) debug.onSound(name, args);
    if ((debug && debug.mute) || !ctx || ctx.state !== 'running') return;
    sfx[name](...args);
  }
  window.nflLogoSound = (name, ...args) => { unlockAudio(); sound(name, ...args); };

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

  // The shield and the goalposts trade places: one is pressed flat onto the ground, and the other
  // springs up out of the same flat shape.
  function press(els, away) {
    const [ox, oy] = SHIELD_FEET;
    const frame = (sx, sy, op, offset, easing) => ({
      transform: `translate(${ox}px, ${oy}px) scale(${sx}, ${sy}) translate(${-ox}px, ${-oy}px)`, opacity: op, offset, easing,
    });
    const flat = [1.6, 0.3];
    const frames = away
      ? [frame(1, 1, 1, 0, 'ease-in'), frame(...flat, 1, 0.7), frame(...flat, 0, 0.85), frame(...flat, 0, 1)]
      : [frame(...flat, 0, 0), frame(...flat, 1, 0.12, 'ease-out'), frame(0.9, 1.15, 1, 0.45, 'ease-in-out'),
        frame(1.03, 0.97, 1, 0.68, 'ease-in-out'), frame(0.99, 1.01, 1, 0.84, 'ease-in-out'), frame(1, 1, 1, 1)];
    els.forEach(el => el.animate(frames, { duration: away ? 520 : 760, fill: 'both' }));
  }
  const MORPHS = {
    toGoal: k => { press(k.shield, true); setTimeout(() => press(k.goal, false), 330); },
    toShield: k => { press(k.goal, true); setTimeout(() => press(k.shield, false), 330); },
  };

  // The stars shaken loose: each flies out from the middle of the shield, spinning, then drops back
  // into place with a little settle.
  function burstStars(stars) {
    stars.forEach(star => {
      const bb = star.getBBox();
      const dx = bb.x + bb.width / 2 - CENTER[0], dy = bb.y + bb.height / 2 - CENTER[1];
      const len = Math.hypot(dx, dy) || 1, spin = (dx < 0 ? -1 : 1) * (150 + 60 * Math.abs(Math.sin(bb.x)));
      const fly = [dx / len * 24, dy / len * 24 - 10];
      const at = (m, k, r, sc, offset, ease) => ({
        transform: `translate(${fly[0] * m}px, ${fly[1] * m + k}px) rotate(${spin * r}deg) scale(${sc})`, offset, easing: ease,
      });
      star.animate([
        { transform: 'none', offset: 0, easing: 'ease-out' },
        at(1, 0, 1, 1.6, 0.25, 'ease-in-out'),
        at(0.3, 10, 0.4, 1.2, 0.62, 'ease-in'),
        at(0, -1.5, 0, 1.08, 0.82, 'ease-out'),
        { transform: 'none', offset: 1 },
      ], { duration: 1100, fill: 'both' });
    });
  }

  // ── The flight ──
  // The ball leaves the printed football and swings out to the right of the shield, goes round it as
  // far as the variant says, and sweeps up the front of the shield to land. wIn and wOut are how far
  // it has left the shield at each end: the orbit is blended into the stamp's position so it leaves
  // and lands exactly on the printed football.
  // The kick: up and over the top of the shield in one high arc (gravity: straight up and down,
  // steady sideways), a bounce on the ground to its right, then a hop back across the front. It
  // tumbles end over end rather than spiralling: three turns on the way out and one coming back.
  function kickFlight() {
    const GROUND = 40, LAND_X = 44, APEX = -14;
    const T1 = 0.5, T2 = 0.62;                             // end of the kick, end of the bounce
    // y(tau) = y0 + vy tau + g tau^2 / 2 reaches the apex and comes back down to the ground at tau = 1.
    const dy = GROUND - STAMP.y, rise = STAMP.y - APEX;
    const vy = -(2 * rise + Math.sqrt(4 * rise * (rise + dy)));
    const g = 2 * (dy - vy);
    return t => {
      let x, y, turns;
      if (t < T1) {
        const u = t / T1;
        x = STAMP.x + (LAND_X - STAMP.x) * u;
        y = STAMP.y + vy * u + g * u * u / 2;
        turns = 3 * u;
      } else if (t < T2) {
        const u = (t - T1) / (T2 - T1);
        x = LAND_X;
        y = GROUND - 9 * 4 * u * (1 - u);
        turns = 3;
      } else {
        const u = (t - T2) / (1 - T2), e = easeInOut(u);
        x = LAND_X + (STAMP.x - LAND_X) * e;
        y = GROUND + (STAMP.y - GROUND) * e - 10 * 4 * u * (1 - u);
        turns = 3 + e;
      }
      const w = smooth(clamp(t / 0.08, 0, 1)) * smooth(clamp((1 - t) / 0.12, 0, 1));
      return {
        x, y, z: 0, w, length: 1,
        angle: STAMP.angle + 360 * turns,
        size: 1 + GROW * w,
        phi: 0,
        layerZ: 1,
        k: smooth(clamp((t - 0.03) / 0.15, 0, 1)) * (1 - smooth(clamp((t - 0.82) / 0.15, 0, 1))),
      };
    };
  }

  // Kicked from the front to the back: an arc up and over the top of the shield, receding (smaller
  // with depth) and dropping behind it; a beat hidden; then the same arc in reverse, coming forward
  // and growing, to land on the stamp. The ball tumbles end over end, two turns each way.
  function kickBackFlight() {
    const BEHIND_Y = 34, BEHIND_X = 21, APEX = -18, DEPTH = -55;
    const T1 = 4 / 9, T2 = 5 / 9;                          // end of the kick, start of the return
    // y(u) = y0 + vy u + g u^2 / 2 goes up to the apex and down to y1 as u runs from 0 to 1.
    const arc = (y0, y1) => {
      const rise = y0 - APEX, dy = y1 - y0;
      const vy = -(2 * rise + Math.sqrt(4 * rise * (rise + dy)));
      return u => y0 + vy * u + (2 * (dy - vy)) * u * u / 2;
    };
    const kick = arc(STAMP.y, BEHIND_Y), back = arc(BEHIND_Y, STAMP.y);
    const recede = u => DEPTH * smooth(clamp((u - 0.35) / 0.5, 0, 1));
    return t => {
      let x, y, z, turns;
      if (t < T1) {
        const u = t / T1;
        x = STAMP.x + (BEHIND_X - STAMP.x) * u; y = kick(u); z = recede(u); turns = 2 * u;
      } else if (t < T2) {
        const u = (t - T1) / (T2 - T1);
        x = BEHIND_X; y = BEHIND_Y - 3 * 4 * u * (1 - u); z = DEPTH; turns = 2;
      } else {
        const u = (t - T2) / (1 - T2);
        x = BEHIND_X + (STAMP.x - BEHIND_X) * u; y = back(u); turns = 2 + 2 * u;
        z = DEPTH * (1 - smooth(clamp((u - 0.15) / 0.5, 0, 1)));
      }
      const w = smooth(clamp(t / 0.08, 0, 1)) * smooth(clamp((1 - t) / 0.12, 0, 1));
      return {
        x, y, z, w, length: 1,
        angle: STAMP.angle + 360 * turns,
        size: (1 + GROW * w) * (70 / (70 - z)),
        phi: 0,
        layerZ: z + 8,                                     // behind once it is past the apex and receding
        k: smooth(clamp((t - 0.03) / 0.15, 0, 1)) * (1 - smooth(clamp((t - 0.82) / 0.15, 0, 1))),
      };
    };
  }

  // ── Paths ──
  // A path is t (0 to 1) -> { x, y, z, w, ... }: where the ball is, how far out it has grown (w, 0 at
  // both ends), and optionally opacity, angle and phi when it does not just follow its velocity.
  const lerp = (a, b, u) => a + (b - a) * u;
  const ends = t => smooth(clamp(t / 0.08, 0, 1)) * smooth(clamp((1 - t) / 0.12, 0, 1));
  const PATHS = {
    // Thrown off to the right, away from you, and back: out of sight for a beat in between.
    pass() {
      const FAR = [46, 14], DEPTH = -60, T1 = 0.4, T2 = 0.5;
      return t => {
        let x, y, z, opacity;
        if (t < T1) {
          const u = t / T1;
          x = lerp(STAMP.x, FAR[0], u); y = lerp(STAMP.y, FAR[1], u) - 16 * 4 * u * (1 - u);
          z = DEPTH * smooth(u); opacity = 1 - smooth(clamp((u - 0.6) / 0.4, 0, 1));
        } else if (t < T2) {
          x = FAR[0]; y = FAR[1]; z = DEPTH; opacity = 0;
        } else {
          const u = (t - T2) / (1 - T2), e = easeInOut(u);
          x = lerp(FAR[0], STAMP.x, e); y = lerp(FAR[1], STAMP.y, u) - 20 * 4 * u * (1 - u);
          z = DEPTH * (1 - smooth(clamp(u / 0.9, 0, 1))); opacity = smooth(clamp(u / 0.25, 0, 1));
        }
        return { x, y, z, w: ends(t), opacity };
      };
    },
    // Up over the shield, slammed down onto its base, rebounding to the right, and back up the face.
    spike() {
      const APEX = -14, BASE = 40;
      return t => {
        let x, y;
        if (t < 0.3) {
          const u = t / 0.3;
          x = lerp(STAMP.x, 20, u); y = lerp(STAMP.y, APEX, 1 - (1 - u) * (1 - u));
        } else if (t < 0.4) {
          const u = (t - 0.3) / 0.1;
          x = lerp(20, 15.5, u); y = APEX + (BASE - APEX) * u * u;
        } else if (t < 0.62) {
          const u = (t - 0.4) / 0.22;
          x = lerp(15.5, 27, u); y = lerp(BASE, 38, u) - 20 * 4 * u * (1 - u);
        } else {
          const u = (t - 0.62) / 0.38, e = easeInOut(u);
          x = lerp(27, STAMP.x, e); y = lerp(38, STAMP.y, e) - 12 * 4 * u * (1 - u);
        }
        return { x, y, z: 0, w: ends(t) };
      };
    },
    // Up to the goalposts' window, through it away from you (front to back), down behind the posts,
    // out to the left, across the front along the bottom, and up the face to land.
    goal() {
      const WINDOW = [15.5, -4], APEX = -13, DEPTH = -55;
      return t => {
        let x, y, z;
        if (t < 0.22) {
          const u = t / 0.22, e = 1 - (1 - u) * (1 - u);
          x = lerp(STAMP.x, WINDOW[0], e); y = lerp(STAMP.y, WINDOW[1], e); z = 6 * smooth(u);
        } else if (t < 0.4) {
          const u = (t - 0.22) / 0.18;
          x = lerp(WINDOW[0], 14, u); y = lerp(WINDOW[1], 14, u) - (WINDOW[1] - APEX) * 4 * u * (1 - u);
          z = lerp(6, DEPTH, smooth(clamp(u * 1.1, 0, 1)));
        } else if (t < 0.55) {
          const u = (t - 0.4) / 0.15;
          x = lerp(14, -10, easeInOut(u)); y = lerp(14, 28, u); z = lerp(DEPTH, 8, smooth(clamp((u - 0.25) / 0.7, 0, 1)));
        } else if (t < 0.78) {
          const phi = Math.PI * (1 - (t - 0.55) / 0.23);          // along the bottom, left to right
          x = 13 + 23 * Math.cos(phi); y = 30 + 10 * Math.sin(phi); z = 8;
        } else {
          const u = (t - 0.78) / 0.22, e = easeInOut(u);
          x = lerp(36, STAMP.x, e); y = lerp(30, STAMP.y, e) - 10 * 4 * u * (1 - u); z = lerp(8, 0, e);
        }
        return { x, y, z, w: ends(t), layerZ: z };
      };
    },
    // Rises to stand on its tip over the notch, spinning on its long axis with a wobble that dies
    // down, then tips back down into the stamp.
    top() {
      const TOP = [15.5, -8], T1 = 0.28, T2 = 0.8, TURNS = 22;
      const wobble = u => Math.sin(TAU * 2.5 * u) * 10 * (1 - u);
      return t => {
        let x, y, angle;
        if (t < T1) {
          const u = smooth(t / T1);
          x = lerp(STAMP.x, TOP[0], u); y = lerp(STAMP.y, TOP[1], u); angle = lerp(STAMP.angle, -90, u);
        } else if (t < T2) {
          const u = (t - T1) / (T2 - T1);
          x = TOP[0] + wobble(u) * 0.12; y = TOP[1] + 1.2 * Math.sin(TAU * 2 * u); angle = -90 + wobble(u);
        } else {
          const u = smooth((t - T2) / (1 - T2));
          x = lerp(TOP[0], STAMP.x, u); y = lerp(TOP[1], STAMP.y, u); angle = lerp(-90 + wobble(1), STAMP.angle, u);
        }
        return { x, y, z: 0, w: ends(t), angle, phi: TAU * TURNS * (1 - (1 - t) * (1 - t)) };
      };
    },
  };

  // Turns a path into everything render needs: the nose follows the velocity (and shortens when the
  // ball travels toward or away from you) unless the path says otherwise.
  function track(variant, position) {
    return t => {
      const p = position(t);
      const dt = 0.002, a = position(Math.max(0, t - dt)), c = position(Math.min(1, t + dt));
      const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
      const speed = Math.hypot(vx, vy, vz) || 1;
      p.length = p.angle === undefined ? clamp(Math.hypot(vx, vy) / speed, 0.55, 1) : 1;
      if (p.angle === undefined) {
        let d = ((Math.atan2(vy, vx) / DEG - STAMP.angle) % 180 + 180) % 180;
        if (d > 90) d -= 180;
        p.angle = STAMP.angle + d * p.w;
      }
      p.size = (1 + GROW * p.w) * (70 / (70 - p.z));
      if (p.phi === undefined) p.phi = (variant.spins || 6) * TAU * t;
      if (p.layerZ === undefined) p.layerZ = 1;
      p.k = smooth(clamp((t - 0.03) / 0.15, 0, 1)) * (1 - smooth(clamp((t - 0.82) / 0.15, 0, 1)));
      return p;
    };
  }

  const flights = {};
  function flight(variant) {
    if (flights[variant.label]) return flights[variant.label];
    if (variant.kick) return flights[variant.label] = kickFlight();
    if (variant.kickBack) return flights[variant.label] = kickBackFlight();
    if (variant.path) return flights[variant.label] = track(variant, PATHS[variant.path]());
    function orbit(t) {
      const wIn = smooth(clamp(t / variant.lead, 0, 1)), wOut = smooth(clamp((1 - t) / (variant.leadOut || 0.15), 0, 1));
      const w = wIn * wOut;
      const u = U0 + (1 - U0) * w;
      const theta = THETA_START + (variant.thetaEnd - THETA_START) * (variant.linear * t + (1 - variant.linear) * easeInOut(t));
      const x0 = u * R * Math.cos(theta), y0 = u * R * Math.sin(theta) * SIN_A, z0 = u * R * Math.sin(theta) * COS_A;
      return {
        wIn, wOut, w,
        x: CENTER[0] + x0 * COS_B - y0 * SIN_B,
        y: CENTER[1] + x0 * SIN_B + y0 * COS_B,
        z: z0,                                           // toward you is positive
      };
    }
    const START = orbit(0), END = orbit(1);
    const D0 = [STAMP.x - START.x, STAMP.y - START.y], D1 = [STAMP.x - END.x, STAMP.y - END.y];
    const position = t => {
      const o = orbit(t), b0 = 1 - o.wIn, b1 = 1 - o.wOut;
      return { x: o.x + D0[0] * b0 + D1[0] * b1, y: o.y + D0[1] * b0 + D1[1] * b1, z: o.z, w: o.w };
    };
    // The first moment it is clear of the shield's right edge (or, if it never gets that far out, when it is farthest out).
    let tClear = -1, best = 0;
    for (let i = 0; i <= 400 && tClear < 0; i++) {
      const x = position(i / 400).x;
      if (x > 40.5) tClear = i / 400;
      else if (i / 400 < 0.4 && x > position(best / 400).x) best = i;
    }
    if (tClear < 0) tClear = best / 400;

    return flights[variant.label] = t => {
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
      p.phi = variant.spins * TAU * t;
      // In front of the shield until it has cleared its edge, so it pops out over the face; after that,
      // by depth. Each later swap happens at the far left or right of the orbit, clear of the shield.
      p.layerZ = t < tClear ? 1 : p.z;
      // Leather brown with white laces in flight; white with navy laces on the shield.
      p.k = smooth(clamp((t - 0.03) / 0.15, 0, 1)) * (1 - smooth(clamp((t - 0.82) / 0.15, 0, 1)));
      return p;
    };
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

  function render(k, ballAt, t) {
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
    if (p.opacity !== undefined) k.balls.forEach(el => { el.style.opacity = p.opacity; });
    const behind = p.layerZ < 0;
    k.front.forEach(el => { el.style.visibility = behind ? 'hidden' : 'visible'; });
    k.back.forEach(el => { el.style.visibility = behind ? 'visible' : 'hidden'; });
  }

  async function run(k, variant) {
    const ballAt = flight(variant);
    // The football is on the shield; the animated one takes over from it.
    k.balls.forEach(el => { el.style.opacity = 1; });
    k.stamp.forEach(el => { el.style.opacity = 0; });
    render(k, ballAt, 0);
    squash(k.shield, variant.squash || 1, variant.squash ? 460 : 380);
    const cues = variant.cues || [[0, 'pop'], [160, 'whoosh', 0.9, 400, 1800, 0.22], [variant.whoosh, 'whoosh', 0.7, 1600, 500, 0.15]];
    cues.forEach(([at, ...cue]) => (at ? setTimeout(() => sound(...cue), at) : sound(...cue)));
    (variant.pulses || []).forEach(([at, amount]) => setTimeout(() => squash(k.shield, amount, 320), at));
    if (variant.stars) setTimeout(() => burstStars(k.stars), variant.stars);
    (variant.morphs || []).forEach(([at, name]) => setTimeout(() => MORPHS[name](k), at));
    await drive(variant.ms, t => render(k, ballAt, t));

    // Back on the shield.
    k.balls.forEach(el => { el.style.opacity = 0; });
    k.stamp.forEach(el => { el.style.opacity = 1; });
    sound('thud', 0.5, 200);
    sound('pop');
    await squash(k.shield, variant.landSquash || 0.6, 340);
  }

  async function play(root) {
    if (root.dataset.playing) return;
    root.dataset.playing = 'true';
    const q = sel => [...root.querySelectorAll(sel)];
    const k = {
      shield: q('.nfl-logo__shield'),
      stars: q('.nfl-logo__star'),
      goal: q('.nfl-logo__goal'),
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
      await run(k, VARIANTS[root.dataset.nflVariant] || VARIANTS.full);
    } finally {
      [...k.shield, ...k.stars, ...k.goal].forEach(el => el.getAnimations().forEach(a => a.cancel()));
      [...k.balls, ...k.stamp].forEach(el => { el.style.opacity = ''; el.style.visibility = ''; });
      delete root.dataset.playing;
    }
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (reduceMotion.matches && !window.nflLogoDebug) return;
    unlockAudio();
    play(trigger);
  }));
})();
