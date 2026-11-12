/* =========================================================
   AYL — the portrait.
   Two photographs that keep turning into each other.
   Each one rests for a while; then a field of cells runs over the
   frame (Conway's rule, held at a steady share of live cells by a
   balancer). Every live cell redraws its patch as one flat block and
   may leave that patch switched to the other photograph, so the next
   portrait grows out of the automaton's own shapes rather than out
   of a sweep or a fade. When the switch is complete the blocks go
   and the new photograph rests in turn. No hover, no input.
   ========================================================= */
(() => {
  const frame = document.querySelector('.portrait__frame');
  if (!frame) return;
  const img = frame.querySelector('img');
  const cv  = frame.querySelector('.portrait__px');
  const av  = frame.querySelector('.portrait__alt');
  if (!img || !cv || !cv.getContext || !av || !av.getContext || !img.dataset.alt) return;

  const ctx  = cv.getContext('2d');
  const actx = av.getContext('2d');

  const CELL   = 7;      /* css px to a block */
  const STEP   = 110;    /* ms a generation lasts */
  const HOLD   = 45000;  /* ms each photograph rests before the next change: every 45 seconds */
  const SHARE  = 0.19;   /* share of the field pixellated during a change */
  const EASE   = 0.4;    /* how hard the balancer pulls back to SHARE */
  const LIFT   = 0.16;   /* how much brighter a block sits than the photo */
  const FLIP   = 0.9;    /* chance a live cell switches its patch to the target photo */
  const DRIFT  = 0.04;   /* chance any other patch switches anyway, so the change never stalls */
  const FINISH = 0.12;   /* below this share of cells left to switch, close the gap */

  /* a visitor who asked for less motion gets the first photograph, still */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const alt = new Image();
  let altReady = false;
  alt.decoding = 'async';
  alt.addEventListener('load', () => { altReady = true; rebuild(); });
  alt.src = img.dataset.alt;

  let COLS = 0, ROWS = 0, W = 0, H = 0;
  let grid = null, next = null, rev = null;
  let tinyA = null, tinyB = null;  /* each photograph, one pixel to a cell */
  let raf = 0, last = 0, ready = false, timer = 0;
  let target = 0;                  /* 0 = first photo, 1 = second */

  /* ---- a photograph, cropped as object-fit:cover would ---- */
  function crop(src) {
    const iw = src.naturalWidth, ih = src.naturalHeight;
    const ia = iw / ih, fa = W / H;
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (ia > fa) { sw = ih * fa; sx = (iw - sw) / 2; }
    else         { sh = iw / fa; sy = (ih - sh) / 2; }
    return { sx, sy, sw, sh };
  }
  /* ... and downsampled to the grid, one pixel to a cell */
  function shrink(src) {
    const c = crop(src);
    const t = document.createElement('canvas');
    t.width = COLS; t.height = ROWS;
    const tc = t.getContext('2d');
    tc.imageSmoothingEnabled = true;
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(src, c.sx, c.sy, c.sw, c.sh, 0, 0, COLS, ROWS);
    return t;
  }

  /* ---- the field ---- */
  function seed() {
    for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < SHARE ? 1 : 0;
  }

  /* conway on a torus — the same rule the header band opens on */
  function tick() {
    for (let y = 0; y < ROWS; y++) {
      const up = ((y - 1 + ROWS) % ROWS) * COLS,
            mid = y * COLS,
            dn = ((y + 1) % ROWS) * COLS;
      for (let x = 0; x < COLS; x++) {
        const l = (x - 1 + COLS) % COLS, r = (x + 1) % COLS;
        const n = grid[up + l] + grid[up + x] + grid[up + r]
                + grid[mid + l]              + grid[mid + r]
                + grid[dn + l] + grid[dn + x] + grid[dn + r];
        const i = mid + x;
        next[i] = grid[i] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    }
    const swap = grid; grid = next; next = swap;
  }

  /* left alone, life thins out to a few still lifes: nudge it back to SHARE */
  function balance() {
    let n = 0;
    for (let i = 0; i < grid.length; i++) n += grid[i];
    let d = Math.round((SHARE * grid.length - n) * EASE);
    let guard = grid.length * 4;
    while (d !== 0 && guard-- > 0) {
      const i = (Math.random() * grid.length) | 0;
      if (d > 0) { if (!grid[i]) { grid[i] = 1; d--; } }
      else       { if ( grid[i]) { grid[i] = 0; d++; } }
    }
  }

  /* the mutation; returns how many cells still show the other photograph */
  function mutate() {
    let left = 0;
    for (let i = 0; i < rev.length; i++) {
      if (rev[i] === target) continue;
      if ((grid[i] && Math.random() < FLIP) || Math.random() < DRIFT) rev[i] = target;
      else left++;
    }
    if (left && left < rev.length * FINISH) {
      left = 0;
      for (let i = 0; i < rev.length; i++) {
        if (rev[i] !== target && Math.random() < 0.5) rev[i] = target;
        if (rev[i] !== target) left++;
      }
    }
    return left;
  }

  /* ---- draw ---- */
  /* the second photograph, sharp, in every cell that shows it */
  function drawAlt() {
    actx.clearRect(0, 0, av.width, av.height);
    const c = crop(alt);
    const kx = c.sw / COLS, ky = c.sh / ROWS;
    const dx = av.width / COLS, dy = av.height / ROWS;
    for (let i = 0; i < rev.length; i++) {
      if (!rev[i]) continue;
      const x = i % COLS, y = (i / COLS) | 0;
      /* a hair of overlap so no seams show between neighbouring patches */
      actx.drawImage(alt, c.sx + x * kx, c.sy + y * ky, kx, ky,
                     Math.floor(x * dx), Math.floor(y * dy), Math.ceil(dx) + 1, Math.ceil(dy) + 1);
    }
  }

  /* the blocks: one canvas pixel to a cell, blown up by CSS with
     image-rendering:pixelated; a block shows the photo it is turning into */
  function drawBlocks() {
    ctx.clearRect(0, 0, COLS, ROWS);
    const src = target ? tinyB : tinyA;
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) continue;
      const x = i % COLS, y = (i / COLS) | 0;
      ctx.drawImage(src, x, y, 1, 1, x, y, 1, 1);
    }
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255,255,255,${LIFT})`;
    ctx.fillRect(0, 0, COLS, ROWS);
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---- run ---- */
  function build() {
    const r = frame.getBoundingClientRect();
    if (!r.width || !r.height || !img.naturalWidth || !altReady) return false;
    W = r.width; H = r.height;
    COLS = Math.max(6, Math.round(W / CELL));
    ROWS = Math.max(6, Math.round(H / CELL));
    cv.width = COLS; cv.height = ROWS;
    ctx.imageSmoothingEnabled = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    av.width = Math.round(W * dpr); av.height = Math.round(H * dpr);
    tinyA = shrink(img);
    tinyB = shrink(alt);
    grid = new Uint8Array(COLS * ROWS);
    next = new Uint8Array(COLS * ROWS);
    rev  = new Uint8Array(COLS * ROWS).fill(target);
    drawAlt();
    return (ready = true);
  }

  const visible = () => !document.hidden && frame.getBoundingClientRect().width > 0;

  /* a change: run generations until every cell shows the target photo */
  function frameLoop(t) {
    raf = requestAnimationFrame(frameLoop);
    if (t - last < STEP) return;
    last = t;
    tick();
    balance();
    const left = mutate();
    drawAlt();
    drawBlocks();
    if (!left) {
      cancelAnimationFrame(raf); raf = 0;
      frame.classList.remove('is-mutating');
      rest();
    }
  }

  function change() {
    timer = 0;
    if (!ready && !build()) return rest();
    if (!visible()) return rest();             // hidden panel or tab: try again later
    target = target ? 0 : 1;
    seed();
    frame.classList.add('is-mutating');
    last = 0;
    raf = requestAnimationFrame(frameLoop);
  }

  function rest() {
    clearTimeout(timer);
    timer = setTimeout(change, HOLD);
  }

  function rebuild() {
    cancelAnimationFrame(raf); raf = 0;
    frame.classList.remove('is-mutating');
    ready = false;
    build();
    rest();
  }

  /* The panel is display:none until the about filter is picked, and the
     photographs are lazy — size and pixels can arrive long after load. */
  img.addEventListener('load', rebuild);
  if (window.ResizeObserver) {
    let rt;
    new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const r = frame.getBoundingClientRect();
        if (!r.width) return;
        if (!ready || Math.abs(r.width - COLS * CELL) > CELL) rebuild();
      }, 150);
    }).observe(frame);
  }
  rest();
})();
