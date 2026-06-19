(function () {
  var region = document.getElementById('ascii-bg-region');
  var canvas = document.getElementById('ascii-bg-canvas');
  if (!canvas || !region) return;

  var CELL_PX = 18;
  var CHUNK_X = 20;
  var CHUNK_Y = 4;
  var FLASH_MS = 800;
  var ALPHA_FLASH = 0.35;
  var ALPHA_REST = 0.12;

  var dpr = window.devicePixelRatio || 1;
  var w = region.clientWidth;
  var h = region.clientHeight;
  var gridCols = Math.floor(w / CELL_PX);
  var gridRows = Math.floor(h / CELL_PX);

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  var total = gridRows * gridCols;
  var revealTimes = new Float64Array(total);
  var allChunksRevealedAt = 0;

  // Real load progress: declared page resources that have a finished Performance
  // entry / total. ponytail: poll Performance instead of wiring load/error per
  // element. The reveal counter is monotonic so a dip in the ratio never un-reveals.
  var urls = [], resTotal = 1, forced = false;
  function collect() {
    urls = [].slice.call(
      document.querySelectorAll('img[src],script[src],link[rel="stylesheet"][href]')
    ).map(function (e) { return e.src || e.href; });
    resTotal = urls.length || 1;
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', collect); // full DOM → stable total
  else collect();
  window.addEventListener('load', function () { forced = true; });
  setTimeout(function () { forced = true; }, 8000);          // cap, mirrors scramble-text
  function progress() {
    if (forced) return 1;
    if (!urls.length) return 0;
    var done = new Set(performance.getEntriesByType('resource')
      .filter(function (r) { return r.responseEnd > 0; })
      .map(function (r) { return r.name; }));
    var n = 0;
    for (var i = 0; i < urls.length; i++) if (done.has(urls[i])) n++;
    return n / resTotal;
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  function drawFrame(now) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'black';
    var allDone = allChunksRevealedAt > 0;

    for (var r = 0; r < gridRows; r++) {
      for (var c = 0; c < gridCols; c++) {
        var rt = revealTimes[r * gridCols + c];
        if (!rt) { allDone = false; continue; }
        var t = (now - rt) / FLASH_MS;
        if (t < 1) { allDone = false; } else { t = 1; }
        ctx.globalAlpha = ALPHA_FLASH + (ALPHA_REST - ALPHA_FLASH) * easeOut(t);
        ctx.fillText('\\', c * CELL_PX + CELL_PX * 0.5, r * CELL_PX + CELL_PX * 0.5);
      }
    }
    ctx.globalAlpha = 1;

    if (allDone) {
      region.classList.add('ascii-hidden');
      setTimeout(function () { window._asciiDone = true; }, 500);
      return;
    }
    requestAnimationFrame(drawFrame);
  }

  function revealChunk(origin) {
    var rEnd = Math.min(origin.r + CHUNK_Y, gridRows);
    var cEnd = Math.min(origin.c + CHUNK_X, gridCols);
    var now = performance.now();
    for (var r = origin.r; r < rEnd; r++) {
      for (var c = origin.c; c < cEnd; c++) {
        revealTimes[r * gridCols + c] = now;
      }
    }
  }

  function animate() {
    var chunks = [];
    for (var br = 0; br < gridRows; br += CHUNK_Y) {
      for (var bc = 0; bc < gridCols; bc += CHUNK_X) {
        chunks.push({ r: br, c: bc });
      }
    }
    var revealed = 0;

    // Reveal chunks in step with real load progress (monotonic).
    (function pump() {
      var target = Math.ceil(progress() * chunks.length);
      while (revealed < target && revealed < chunks.length) {
        revealChunk(chunks[revealed]);
        revealed++;
      }
      if (revealed >= chunks.length) {
        allChunksRevealedAt = performance.now();
        return;
      }
      requestAnimationFrame(pump);
    })();
  }

  window._asciiDone = false;
  requestAnimationFrame(drawFrame);
  animate();
})();
