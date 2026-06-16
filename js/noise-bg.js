/* ── Background: dark backdrop + center-dense banded film grain ───────────
   Flat dark fill, with a monochrome Gaussian film grain composited `overlay`.
   Grain strength is stepped by concentric rectangle bands whose aspect matches
   the viewport (max/Chebyshev metric): strongest at center, faint at the edge.

   Self-contained: one IIFE, single fixed canvas behind all content,
   pointer-events none. Static — rendered once, re-rendered on debounced
   resize. No animation loop.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  var canvas = document.getElementById('noise-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ── Tunables ──────────────────────────────────────────────────────────
  var BG = '#1a1a1a';         // flat backdrop (matches site theme)
  // Grain strength per band, center → out (full center, faint edge).
  var STRENGTH = [1.0, 0.78, 0.58, 0.40, 0.26, 0.14, 0.06];
  var GRAIN_SCALE = 2;        // grain generated at 1/N res then upscaled → coarseness
  var SIGMA = 0.5;            // grain intensity (std dev of luminance offset, 0..1)
  var BLEND = 'overlay';      // grain blend mode ('overlay' strong, 'soft-light' gentle)

  var offscreen = document.createElement('canvas');
  var offCtx = offscreen.getContext('2d');

  // Box–Muller Gaussian ~ N(0,1).
  function gaussian() {
    var u = 1 - Math.random();
    var v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function render() {
    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = 'source-over';

    // ── Pass 1: flat dark fill ────────────────────────────────────────
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // ── Pass 2: banded Gaussian grain, overlay blend ──────────────────
    var N = STRENGTH.length;
    var BW = 1 / N;
    var gw = Math.max(1, Math.floor((w * dpr) / GRAIN_SCALE));
    var gh = Math.max(1, Math.floor((h * dpr) / GRAIN_SCALE));
    offscreen.width = gw;
    offscreen.height = gh;

    var img = offCtx.createImageData(gw, gh);
    var data = img.data;
    for (var idx = 0; idx < gw * gh; idx++) {
      var gx = idx % gw;
      var gy = (idx / gw) | 0;
      // Viewport-normalized position; max metric → rectangle bands matching aspect.
      var nx = (2 * gx) / gw - 1;
      var ny = (2 * gy) / gh - 1;
      var d = Math.max(Math.abs(nx), Math.abs(ny));
      var band = Math.floor(d / BW);
      if (band > N - 1) band = N - 1;
      var s = STRENGTH[band];

      // Neutral 128 ⇒ overlay leaves backdrop unchanged. Strength scales the
      // deviation: full grain at center, ~neutral (faint) at the edge.
      var lum = 128 + gaussian() * SIGMA * 128 * s;
      lum = lum < 0 ? 0 : lum > 255 ? 255 : lum;
      var p = idx * 4;
      data[p] = data[p + 1] = data[p + 2] = lum;
      data[p + 3] = 255;
    }
    offCtx.putImageData(img, 0, 0);

    ctx.imageSmoothingEnabled = false;   // crisp, coarse flecks on upscale
    ctx.globalCompositeOperation = BLEND;
    ctx.drawImage(offscreen, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  var resizeTimer = null;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  }

  render();
  window.addEventListener('resize', onResize);
})();
