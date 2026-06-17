/* ── Background: dark backdrop + parallax banded film grain ────────────────
   Flat dark fill (CSS on #noise-bg), with monochrome Gaussian film grain
   composited `overlay`. Grain strength is stepped by concentric rectangle
   bands whose aspect matches the viewport (max/Chebyshev metric): strongest at
   center, faint at the edge.

   Each band is its OWN stacked canvas (overlay blend). The layers follow the
   cursor with a per-layer magnitude — sparse outer bands travel far, the dense
   center barely moves — giving a parallax depth feel. Grain is static (drawn
   once per layer, re-drawn on debounced resize); only CSS transform animates,
   smoothed in a rAF lerp. Reduced-motion → static, centered, no loop.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  var wrapper = document.getElementById('noise-bg');
  if (!wrapper) return;

  // ── Tunables ──────────────────────────────────────────────────────────
  // Grain strength per band, center → out (full center, faint edge).
  var STRENGTH = [1.0, 0.78, 0.58, 0.40, 0.26, 0.14, 0.06];
  var GRAIN_SCALE = 2;        // grain generated at 1/N res then upscaled → coarseness
  var SIGMA = 0.85;           // grain intensity (std dev of luminance offset, 0..1)
  var MAX_SHIFT = 48;         // px parallax travel for the most mobile (outer) layer
  var EASE = 0.08;            // rAF lerp toward target offset (lower = laggier/smoother)
  var FOLLOW = 1;             // +1 = layers move toward cursor; -1 = push away (depth)

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = STRENGTH.length;

  // Box–Muller Gaussian ~ N(0,1).
  function gaussian() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Reveal glow — sits behind the grain (first child), screen-blended so it only
  // adds light. Pulsed per band in fadeIn(); styled in css (#noise-glow).
  var glow = document.createElement('div');
  glow.id = 'noise-glow';
  wrapper.appendChild(glow);

  // One stacked canvas per band. mag: sparse (low strength) moves more.
  var layers = [];
  for (var i = 0; i < N; i++) {
    var canvas = document.createElement('canvas');
    canvas.style.opacity = '0';                 // hidden until fadeIn (center → out)
    canvas.style.transition = 'opacity 0.8s ease';
    wrapper.appendChild(canvas);
    layers.push({
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      band: i,
      mag: MAX_SHIFT * (1 - STRENGTH[i]),
    });
  }

  // Re-usable offscreen for the downscaled grain.
  var offscreen = document.createElement('canvas');
  var offCtx = offscreen.getContext('2d');

  // Render one layer's grain: real grain only where the Chebyshev band == i,
  // neutral 128 elsewhere (invisible under overlay). Canvas is oversized by
  // MAX_SHIFT on all sides so translating never exposes a viewport edge.
  function renderLayer(layer, w, h, dpr) {
    var canvas = layer.canvas;
    var ctx = layer.ctx;

    // Padded element box (CSS px), shifted so the unpadded region maps to the viewport.
    var pw = w + 2 * MAX_SHIFT;
    var ph = h + 2 * MAX_SHIFT;
    canvas.style.left = -MAX_SHIFT + 'px';
    canvas.style.top = -MAX_SHIFT + 'px';
    canvas.style.width = pw + 'px';
    canvas.style.height = ph + 'px';
    canvas.width = pw * dpr;
    canvas.height = ph * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = 'source-over';

    // Downscaled grain buffer covering the padded box.
    var gw = Math.max(1, Math.floor((pw * dpr) / GRAIN_SCALE));
    var gh = Math.max(1, Math.floor((ph * dpr) / GRAIN_SCALE));
    offscreen.width = gw;
    offscreen.height = gh;

    var BW = 1 / N;
    var img = offCtx.createImageData(gw, gh);
    var data = img.data;

    // Pad in grain-buffer pixels, so we can normalize over the UNPADDED viewport
    // region → band rings land in the same on-screen positions as before.
    var padGX = (MAX_SHIFT * dpr) / GRAIN_SCALE;
    var padGY = (MAX_SHIFT * dpr) / GRAIN_SCALE;
    var innerW = gw - 2 * padGX;
    var innerH = gh - 2 * padGY;

    for (var idx = 0; idx < gw * gh; idx++) {
      var gx = idx % gw;
      var gy = (idx / gw) | 0;
      // Viewport-normalized position (unpadded region → -1..1); max metric → rects.
      var nx = (2 * (gx - padGX)) / innerW - 1;
      var ny = (2 * (gy - padGY)) / innerH - 1;
      var d = Math.max(Math.abs(nx), Math.abs(ny));
      var band = Math.floor(d / BW);
      if (band > N - 1) band = N - 1;

      var lum = 128;
      if (band === layer.band) {
        // Neutral 128 ⇒ overlay leaves backdrop unchanged. Strength scales deviation.
        lum = 128 + gaussian() * SIGMA * 128 * STRENGTH[band];
        lum = lum < 0 ? 0 : lum > 255 ? 255 : lum;
      }
      var p = idx * 4;
      data[p] = data[p + 1] = data[p + 2] = lum;
      data[p + 3] = 255;
    }
    offCtx.putImageData(img, 0, 0);

    ctx.imageSmoothingEnabled = false;   // crisp, coarse flecks on upscale
    ctx.drawImage(offscreen, 0, 0, pw, ph);
  }

  var vw = 0, vh = 0;
  function renderAll() {
    var dpr = window.devicePixelRatio || 1;
    vw = window.innerWidth;
    vh = window.innerHeight;
    for (var i = 0; i < N; i++) renderLayer(layers[i], vw, vh, dpr);
  }

  // ── Cursor-follow parallax ──────────────────────────────────────────────
  var tx = 0, ty = 0;   // target offset, normalized -1..1
  var cx = 0, cy = 0;   // current (lerped) offset
  var rafId = null;

  function apply() {
    for (var i = 0; i < N; i++) {
      var m = layers[i].mag;
      layers[i].canvas.style.transform =
        'translate3d(' + (FOLLOW * cx * m) + 'px,' + (FOLLOW * cy * m) + 'px,0)';
    }
  }

  function tick() {
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    apply();
    // Stop when settled to avoid a forever-spinning loop; mousemove restarts it.
    if (Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001) {
      cx = tx; cy = ty;
      apply();
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function onMove(e) {
    tx = (e.clientX / vw) * 2 - 1;
    ty = (e.clientY / vh) * 2 - 1;
    if (rafId == null) rafId = requestAnimationFrame(tick);
  }

  // ── Resize (debounced) ──────────────────────────────────────────────────
  var resizeTimer = null;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 150);
  }

  renderAll();
  window.addEventListener('resize', onResize);
  if (!REDUCED) window.addEventListener('mousemove', onMove);

  // ── Fade-in: center band (layers[0]) first, rippling outward ───────────────
  // Glow pulse for band i: brighter + smaller at center, fainter + wider outward.
  function pulseGlow(i) {
    var scale = 0.35 + (i / (N - 1)) * 1.05;        // center small → outer wide
    var peak = 0.5 * (0.35 + 0.65 * STRENGTH[i]);    // center bright → outer faint
    glow.style.transform = 'scale(' + scale.toFixed(3) + ')';
    glow.style.opacity = peak.toFixed(3);
    setTimeout(function () { glow.style.opacity = '0'; }, 200); // flare then settle
  }

  var faded = false;
  function fadeIn() {
    if (faded) return;
    faded = true;
    for (var i = 0; i < N; i++) {
      if (REDUCED) {
        layers[i].canvas.style.opacity = '1';   // no stagger / glow on reduced-motion
      } else {
        (function (canvas, band, delay) {
          setTimeout(function () {
            canvas.style.opacity = '1';
            pulseGlow(band);                     // ring glows as it reveals
          }, delay);
        })(layers[i].canvas, i, i * 200);
      }
    }
  }
  // Trigger after the hero is revealed (blue box + name), so the grain ripples in
  // once the hero has landed — not at the same moment. Fallback in case the event is
  // missed, so the background can never stay invisible.
  window.addEventListener('heroRevealed', fadeIn);
  // Safety net only — must outlast the full intro + hero reveal (~15s) so it never
  // preempts the heroRevealed trigger and burn the one-shot reveal behind the overlay.
  setTimeout(fadeIn, 20000);
})();
