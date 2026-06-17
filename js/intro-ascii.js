(function () {
  var region = document.getElementById('ascii-bg-region');
  var canvas = document.getElementById('ascii-bg-canvas');
  if (!canvas || !region) return;

  var CELL_PX = 18;
  var CHUNK_X = 20;
  var CHUNK_Y = 4;
  var DELAY = 80;
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

  function animate() {
    var chunks = [];
    for (var br = 0; br < gridRows; br += CHUNK_Y) {
      for (var bc = 0; bc < gridCols; bc += CHUNK_X) {
        chunks.push({ r: br, c: bc });
      }
    }
    var idx = 0;

    function revealNext() {
      if (idx >= chunks.length) {
        allChunksRevealedAt = performance.now();
        return;
      }
      var origin = chunks[idx];
      var rEnd = Math.min(origin.r + CHUNK_Y, gridRows);
      var cEnd = Math.min(origin.c + CHUNK_X, gridCols);
      var now = performance.now();
      for (var r = origin.r; r < rEnd; r++) {
        for (var c = origin.c; c < cEnd; c++) {
          revealTimes[r * gridCols + c] = now;
        }
      }
      idx++;
      setTimeout(revealNext, DELAY);
    }
    revealNext();
  }

  window._asciiDone = false;
  requestAnimationFrame(drawFrame);
  animate();
})();
