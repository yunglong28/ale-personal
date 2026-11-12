/* =========================================================
   AYL — the page, put through a press.
   (replaces life.js; that file is kept)

   One canvas, fixed behind the whole screen. Borrowed from the
   MINOR INDEX atelier as a way of working, not as a picture: no
   mark, no sun, no cell. What is borrowed is the press.

   - The forms are distance fields: soft bodies drifting over the
     screen, joined with a smooth union, so they meet and part the
     way ink does.
   - Coverage becomes dot area on a rotated screen. Two plates: the
     first ink at 15°, the second at 75°, the same field let out a
     little further and pulled slightly out of register.
   - The press breathes: over ~14 s the ink floods until the forms
     grow together, then is choked back until only kernels are left.
   - Copier grain: a fresh speckle a few times a second, some of it
     on the empty sheet.
   - Reading comes first: the text column is a clean sheet. The ink
     stops short of it and comes back to full strength in the margins.

   - Now and then a bubble in a margin grows into a figure, holds it and
     slowly turns back into a bubble: the assistant, the shoggoth, the
     bricoleur, the REINCANTAMENTO eye, a flower, a token. Each is a
     distance field (press-figures.js), so the bubble is morphed into it,
     one field arriving at another, rather than swapped for a picture.
     Two figures at most, and one change at a time.

   Inks come from --ink-a / --ink-b in styles.css.
   ========================================================= */
(() => {
  const cv = document.querySelector('.press');
  if (!cv || !cv.getContext) return;
  const g = cv.getContext('2d');
  const col = document.querySelector('.wrap');

  const PITCH  = 6;      /* css px per screen cell */
  /* a copier, not a film: 20 frames a second where the machine can afford
     it, down to 12 where a frame costs too much (very large screens) */
  const FPS_HI = 20, FPS_LO = 12, BUDGET = 14;   /* ms a frame may take */
  const BREATH = 14000;  /* ms for one flood and choke */
  const FALL   = 10;     /* the fringe of a body, css px */
  /* share of each ink left over the text column: the toner leaves it
     altogether, the second ink stays as a pale trace of the forms */
  const GHOST  = [0, 0];
  const EDGE_MAX = 140;  /* css px outside the column over which the ink comes back */
  let EDGE = EDGE_MAX;   /* shorter on medium screens, so narrow margins still get full ink */
  const CLEAR  = 56;     /* css px of margin kept as quiet as the column itself */
  const K      = 30;     /* smooth-union radius, css px */
  const BUCKET = 96;     /* css px: the grid that sorts bodies by where they can reach */
  /* Phones: the text column fills the screen, so there are no margins to
     keep the ink in. The press prints over the whole screen instead,
     smaller dots, and styles.css fades the sheet so the text stays first. */
  const phone = window.matchMedia('(max-width:620px)');
  let narrow = phone.matches;
  const SOFT = 0.55;     /* phones: share of the dot size left, everywhere */

  let W = 0, H = 0, DPR = 1, inkA = '#14140f', inkB = '#d23a1c';
  let colL = 0, colR = 0;

  /* value noise, hashed — the same construction as the atelier's noise2 */
  function noise2(s) {
    const h = (i, j) => {
      let v = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) ^ s;
      v = Math.imul(v ^ (v >>> 13), 1274126177);
      return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
    };
    const sm = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
      const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
    };
  }
  const nA = noise2(7), nB = noise2(977), wob = noise2(4441);
  const rng = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

  /* the bodies: about one for every 260×260 of screen */
  let bodies = [];
  function grow() {
    const r = rng(105);
    const n = Math.max(6, Math.round((W * H) / (260 * 260)));
    bodies = Array.from({ length: n }, () => ({
      x0: r(), y0: r(), ph: r() * 100,
      r: 18 + r() * 34, ry: 0.6 + r() * 0.5,
      vx: (r() - 0.5) * 0.000012, vy: (r() - 0.5) * 0.000008,
    }));
  }
  const wrap01 = (v) => ((v % 1) + 1) % 1;
  const tri = (v) => 1 - Math.abs(2 * wrap01(v) - 1);      /* there and back, no jump */
  /* The first KEEP bodies never leave the margins: they wander up and down
     their own strip of page, so the screen is never without bubbles. The
     others drift across the whole screen, and behind the text they are not
     printed at all. */
  const KEEP = 3;
  function strips() {
    const lo = colL - CLEAR - EDGE * 0.4, hi = colR + CLEAR + EDGE * 0.4;
    const out = [];
    if (lo > 40) out.push([12, lo]);
    if (W - hi > 40) out.push([hi, W - 12]);
    return out;
  }
  function at(t) {
    const S = strips();
    return bodies.map((b, i) => {
      const r = b.r * (0.8 + nA(b.ph + 9, t / 4500) * 0.5);
      if (i < KEEP && S.length) {
        const [a0, a1] = S[i % S.length];
        const m = Math.min(r * 1.1, (a1 - a0) / 2);
        return {
          x: a0 + m + tri(b.x0 + t * 0.000004 * (1 + i)) * Math.max(0, a1 - a0 - 2 * m),
          y: 40 + tri(b.y0 + t * 0.000012 * (1 + i * 0.3)) * (H - 80),
          r: Math.max(r, 24), ry: b.ry,
        };
      }
      return {
        x: wrap01(b.x0 + b.vx * t) * (W + 160) - 80 + (nA(b.ph, t / 7000) - 0.5) * 140,
        y: wrap01(b.y0 + b.vy * t) * (H + 160) - 80 + (nB(b.ph, t / 6000) - 0.5) * 120,
        r, ry: b.ry,
      };
    });
  }

  /* smooth union: two bodies over-inked until they share one contour */
  const smin = (a, b, k) => {
    const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k));
    return b * (1 - h) + a * h - k * h * (1 - h);
  };

  /* ---- figures ----
     A bubble in a margin grows into a figure, holds it, and slowly goes
     back to being a bubble. Never more than two figures at once, and only
     one of them is changing at any moment: a change starts only when the
     last one has finished. The host is one of the bodies, so nothing
     appears or vanishes: it drifts to its place as it grows, and drifts
     back into the flow as it lets go. */
  const FIGS = window.PRESS_FIGURES;
  const FIG_ORDER = ['assistant', 'shoggoth', 'bricoleur', 'eye', 'flower', 'token']
    .filter((n) => FIGS && FIGS.f[n]);
  const FIG_IN = 3200, FIG_HOLD = 7000, FIG_OUT = 6500;  /* ms; going back is the slow part */
  const FIG_GAP = 2200;                                   /* ms of rest between two changes */
  const FIG_MAX = 2;
  const figGrid = {};
  let figs = [], figIdx = 0, nextChange = 4000;

  function figField(name) {
    if (figGrid[name]) return figGrid[name];
    const raw = atob(FIGS.f[name]), a = new Int8Array(raw.length);
    for (let i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i) << 24 >> 24;
    return (figGrid[name] = a);
  }
  /* signed distance to the figure in grid cells, bilinear, and honest
     outside the grid: the edge value plus the way still to go */
  function figSample(a, u, v) {
    const n = FIGS.n, m = n - 1;
    const cu = Math.max(0, Math.min(m, u)), cv = Math.max(0, Math.min(m, v));
    const i = Math.min(m - 1, cu | 0), j = Math.min(m - 1, cv | 0), fx = cu - i, fy = cv - j;
    const q = a[j * n + i] * (1 - fx) + a[j * n + i + 1] * fx;
    const r = a[(j + 1) * n + i] * (1 - fx) + a[(j + 1) * n + i + 1] * fx;
    return q * (1 - fy) + r * fy + Math.hypot(u - cu, v - cv);
  }
  const ease = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const inMargin = (x) => x < colL - 60 || x > colR + 60;

  function figStep(t, P) {
    if (!FIG_ORDER.length) return;
    /* where each figure is in its life */
    for (const f of figs) {
      if (f.phase === 'in') {
        f.m = ease(Math.min(1, (t - f.t0) / FIG_IN));
        if (t - f.t0 >= FIG_IN) { f.phase = 'hold'; f.t0 = t; }
      } else if (f.phase === 'hold') {
        f.m = 1;
      } else {
        f.m = 1 - ease(Math.min(1, (t - f.t0) / FIG_OUT));
        if (t - f.t0 >= FIG_OUT) f.done = true;
      }
    }
    figs = figs.filter((f) => !f.done);
    /* one change at a time */
    const busy = figs.some((f) => f.phase !== 'hold');
    if (!busy && t >= nextChange) {
      const ripe = figs.filter((f) => f.phase === 'hold' && t - f.t0 >= FIG_HOLD)
                       .sort((p, q) => p.t0 - q.t0)[0];
      if (ripe) {                                  /* the oldest figure lets go */
        ripe.phase = 'out'; ripe.t0 = t;
        nextChange = t + FIG_OUT + FIG_GAP;
      } else if (figs.length < FIG_MAX) {          /* a bubble takes a figure */
        const wide = colL > 240 && W - colR > 240;
        const taken = new Set(figs.map((f) => f.body));
        let best = -1;
        for (let i = 0; i < P.length; i++) {
          const p = P[i];
          if (taken.has(i) || p.y < H * 0.18 || p.y > H * 0.82 || p.x < 0 || p.x > W) continue;
          if (wide && !inMargin(p.x)) continue;
          if (figs.some((f) => Math.hypot(f.ax - p.x, f.ay - p.y) < f.S * 1.1)) continue;
          best = i; break;
        }
        if (best >= 0) {
          const p = P[best];
          let S, ax;
          if (wide) {
            const left = p.x < colL, mw = left ? colL : W - colR;
            S = Math.min(mw * 0.8, H * 0.45, 320);
            ax = left ? colL / 2 : (colR + W) / 2;
          } else {                                 /* narrow screen: a trace behind the text */
            S = Math.min(W * 0.66, H * 0.38, 260);
            ax = W / 2;
          }
          const ay = Math.max(H * 0.2 + S / 2, Math.min(H * 0.8 - S / 2, p.y));
          if (!figs.some((f) => Math.abs(f.ax - ax) < S && Math.abs(f.ay - ay) < (f.S + S) / 2)) {
            figs.push({ body: best, name: FIG_ORDER[figIdx++ % FIG_ORDER.length],
                        S, ax, ay, t0: t, phase: 'in', m: 0 });
            nextChange = t + FIG_IN + FIG_GAP;
          } else nextChange = t + 900;
        } else nextChange = t + 900;               /* no bubble in a margin yet: look again soon */
      }
    }
    /* the hosts drift to their places as they grow, and back as they let go */
    for (const f of figs) {
      const p = P[f.body];
      p.x += (f.ax - p.x) * f.m;
      p.y += (f.ay - p.y) * f.m;
      p.fig = f;
    }
  }

  /* how far outside the ink this point is. Bodies too far away to matter are
     not asked, which is what lets the field cover a whole screen. A host
     body is its bubble on the way to its figure (sMorph), and the flood is
     held back on a figure so its eyes and gaps stay open. */
  function field(x, y, P, t, reach, grow, near) {
    const wx = x + (wob(x / 34, y / 34 + t / 1800) - 0.5) * 7;
    const wy = y + (wob(x / 34 + 50, y / 34 + t / 1800) - 0.5) * 5;
    let d = 1e9;
    for (let q = 0; q < near.length; q++) {
      const p = P[near[q]], f = p.fig;
      const bound = f ? Math.max(p.r, f.S * 0.62 * f.m) : p.r;
      const dx = wx - p.x;
      if (dx > bound + reach || dx < -bound - reach) continue;
      const dy = (wy - p.y) / (f ? 1 + (p.ry - 1) * (1 - f.m) : p.ry);
      if (dy > bound + reach || dy < -bound - reach) continue;
      let e = Math.hypot(dx, dy) - p.r;
      if (f && f.m > 0) {
        const a = figField(f.name), n = FIGS.n, k = f.S / n;
        const df = figSample(a, (x - p.x) / k + n / 2, (y - p.y) / k + n / 2) * k + grow * 0.85;
        e = e * (1 - f.m) + df * f.m;
      }
      d = d === 1e9 ? e : (f && f.m > 0.6 ? Math.min(d, e) : smin(d, e, K));
    }
    return d;
  }

  /* the column guard: full ink in the margins, a ghost over the text */
  function guard(x, y, ghost) {
    if (narrow) return SOFT;
    if (colR <= colL) return 1;
    const out = Math.max(colL - x, x - colR, 0);      /* px outside the text column */
    if (out <= CLEAR) return ghost;
    return ghost + (1 - ghost) * Math.min(1, (out - CLEAR) / EDGE);
  }

  function size() {
    narrow = phone.matches;
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const cs = getComputedStyle(cv);
    inkA = cs.getPropertyValue('--ink-a').trim() || inkA;
    inkB = cs.getPropertyValue('--ink-b').trim() || inkB;
    if (col) {
      const r = col.getBoundingClientRect();
      const cs2 = getComputedStyle(col);
      colL = r.left + (parseFloat(cs2.paddingLeft) || 0);
      colR = r.right - (parseFloat(cs2.paddingRight) || 0);
      EDGE = Math.max(40, Math.min(EDGE_MAX, (colL - CLEAR) * 0.6));
    }
    grow();
  }

  function print(t) {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.clearRect(0, 0, W, H);
    const P = at(t);
    figStep(t, P);
    const breath = Math.sin((t / BREATH) * Math.PI * 2);
    const spread = 6 + breath * 16;                       /* choked (-) … flooded (+) */
    const regX = (nA(3.3, t / 7000) - 0.5) * 8, regY = (nB(7.7, t / 7000) - 0.5) * 4;
    const grain = rng(((t / 600) | 0) + 13);   /* a fresh speckle ~1.7 times a second: texture, not flicker */

    const plates = [
      { ang: 15, ink: inkB, grow: spread + 7, dx: regX, dy: regY, pitch: PITCH * 1.15 },  /* let out, out of register */
      { ang: 75, ink: inkA, grow: spread,     dx: 0,    dy: 0,    pitch: PITCH },
    ];

    /* Which bodies can reach which part of the screen, worked out once a
       frame on a coarse grid, so each dot only asks the two or three bodies
       near it instead of every body on the page. */
    const reachMax = K + Math.max(0, spread + 7) + FALL + 12 + 12;
    const bw = Math.ceil(W / BUCKET) + 1, bh = Math.ceil(H / BUCKET) + 1;
    const buckets = Array.from({ length: bw * bh }, () => []);
    for (let i = 0; i < P.length; i++) {
      const p = P[i], f = p.fig;
      const R = (f ? Math.max(p.r, f.S * 0.62 * f.m) : p.r / Math.min(1, p.ry)) + reachMax + 8;
      const x0 = Math.max(0, Math.floor((p.x - R) / BUCKET)), x1 = Math.min(bw - 1, Math.floor((p.x + R) / BUCKET));
      const y0 = Math.max(0, Math.floor((p.y - R) / BUCKET)), y1 = Math.min(bh - 1, Math.floor((p.y + R) / BUCKET));
      for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) buckets[by * bw + bx].push(i);
    }
    const quiet0 = colL - CLEAR, quiet1 = colR + CLEAR;   /* the clean sheet over the text */
    for (let k = 0; k < plates.length; k++) {
      const pl = plates[k];
      const reach = K + Math.max(0, pl.grow) + FALL + 12;
      const a = pl.ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const cx = W / 2, cy = H / 2;
      const N = Math.ceil(Math.hypot(W, H) / (2 * pl.pitch)) + 1;
      g.globalCompositeOperation = k ? 'multiply' : 'source-over';
      g.fillStyle = pl.ink;
      g.beginPath();
      const ps = pl.pitch * sa, pc = pl.pitch * ca;
      for (let i = -N; i <= N; i++) {
        /* only the stretch of this lattice row that lands on the screen */
        const A = cx + i * pl.pitch * ca, B = cy + i * pl.pitch * sa;
        const j0 = Math.ceil(Math.max((A - (W + 3)) / ps, (-3 - B) / pc));
        const j1 = Math.floor(Math.min((A + 3) / ps, (H + 3 - B) / pc));
        for (let j = j0; j <= j1; j++) {
          const x = A - j * ps, y = B + j * pc;
          if (!narrow && x > quiet0 && x < quiet1) continue;
          const sx = x - pl.dx, sy = y - pl.dy;
          const bxi = Math.min(bw - 1, Math.max(0, (sx / BUCKET) | 0)), byi = Math.min(bh - 1, Math.max(0, (sy / BUCKET) | 0));
          const near = buckets[byi * bw + bxi];
          if (!near.length) continue;                       /* empty sheet: no ink can land here */
          const d = field(sx, sy, P, t, reach, pl.grow, near) - pl.grow;
          let cov = d > FALL ? 0 : Math.min(1, 1 - d / FALL);
          /* loose grain on the empty sheet, but none within 150px of the text */
          const stray = narrow ? 0 : Math.max(colL - x, x - colR, 0) < 150 ? 0 : 0.3;
          cov += (grain() - 0.5) * 0.2 * (cov > 0.02 ? 1 : stray);
          cov *= guard(x, y, GHOST[k]);
          if (cov <= 0.03) continue;
          const rr = pl.pitch * 0.55 * Math.sqrt(Math.min(1, cov));
          if (rr < 0.3) continue;
          const px = x + (grain() - 0.5) * 0.9, py = y + (grain() - 0.5) * 0.9;
          g.moveTo(px + rr, py);
          g.arc(px, py, rr, 0, Math.PI * 2);
        }
      }
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }

  size();
  const t0 = performance.now();
  print(0);

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); print(performance.now() - t0); }, 200); });
  window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener?.('change', () => { size(); print(performance.now() - t0); });
  document.addEventListener('themechange', () => { size(); print(performance.now() - t0); });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let last = 0, cost = 0, fps = FPS_HI;
  (function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 1000 / fps - 2) return;
    last = now;
    const s0 = performance.now();
    print(now - t0);
    cost = cost * 0.9 + (performance.now() - s0) * 0.1;     /* running average */
    fps = narrow || cost > BUDGET ? FPS_LO : cost < BUDGET * 0.7 ? FPS_HI : fps;
  })(performance.now());
})();
