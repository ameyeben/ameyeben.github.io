// Hero title low-poly SVG swap + cursor magnetic distortion.
//
// On hero reveal the orchestrator calls heroLowPoly.revealIn() — the SVG name is
// shown directly and settles from scattered vertices into rest (no text crossfade);
// on scroll-away it calls heroLowPoly.swapOut(). While the SVG is shown, vertices
// near the cursor lean gently toward it and spring back. anime.js drives the global
// warp strength (enter/leave easing).
//
// Two stacked layers share one cursor/strength sim: a darker-blue echo painted
// underneath (stronger pull + small rest offset) and the original white name on
// top. The blue copy spills past the white edges under the cursor.
//
// Geometry comes from window.HERO_LOWPOLY (baked by scripts/bake-hero-lowpoly.mjs).

(function () {
  var data = window.HERO_LOWPOLY;
  var wrapper = document.getElementById('hero-title-wrapper');
  var titleEl = wrapper && wrapper.querySelector('.hero-title');
  if (!data || !wrapper || !titleEl) return;

  // Cursor interaction spans the hero title box (the blue golden-ratio wrapper),
  // not the whole hero section.
  var hitEl = wrapper;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SPRING = 0.28;     // per-frame lerp toward target (higher = snappier)
  var HIT_PAD_PX = 130;  // canvas margin so pulled vertices don't clip (≥ max pull)
  var REVEAL_SCATTER = 90; // px each vertex is flung out before settling on reveal

  // Vertical-line halftone: the glyph path is filled with a vertical-stripe
  // pattern instead of a solid color, so the letters read as vertical lines.
  // Flip HALFTONE to false to render the plain solid name (pre-effect look);
  // the pattern/ghost code below stays intact for re-enabling.
  var HALFTONE = false;
  // ponytail: the two aesthetic knobs — line spacing + how much of each period
  // is inked. In viewBox user units (glyph cap-height ≈ data.metrics.fontSize).
  var STRIPE_PERIOD = 70; // center-to-center spacing of the lines
  var STRIPE_DUTY = 0.3;  // fraction of the period inked (lower = thinner lines)

  // Layer specs, back-to-front (paint order = DOM order). pull is max vertex
  // displacement in screen px; reachMul scales the influence radius relative to
  // the hero section's diagonal (1 = letters react from anywhere in the hero);
  // offsetPx is a constant screen-px shift applied at draw time.
  var LAYERS = [
    { fill: '#1741b8', pull: 90, reachMul: 1.0, offsetPx: [0, 0], opacity: 1 },    // darker-blue echo
    { fill: '#ffffff', pull: 44, reachMul: 0.85, offsetPx: [0, 0], opacity: HALFTONE ? 0.78 : 1 }, // white name
    { fill: '#ffffff', pull: 44, reachMul: 0.85, offsetPx: [7, 5], opacity: 0.78 }, // offset ghost
  ].slice(0, HALFTONE ? 3 : 2); // drop ghost layer when not halftone

  var SVGNS = 'http://www.w3.org/2000/svg';

  function makeLayer(spec, index) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'hero-title-svg');
    svg.setAttribute('viewBox', data.viewBox.join(' '));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Vertical-stripe pattern in user space — tiles with the path coords, so it
    // scales with the name and warps through the glyph as the path distorts.
    var patternId = 'hero-stripes-' + index;
    if (HALFTONE) {
      // Full-height tile (not 1 unit — that scales sub-pixel and renders empty).
      var tileH = data.viewBox[3];
      var defs = document.createElementNS(SVGNS, 'defs');
      var pattern = document.createElementNS(SVGNS, 'pattern');
      pattern.setAttribute('id', patternId);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('x', data.viewBox[0]);
      pattern.setAttribute('y', data.viewBox[1]);
      pattern.setAttribute('width', STRIPE_PERIOD);
      pattern.setAttribute('height', tileH);
      var stripe = document.createElementNS(SVGNS, 'rect');
      stripe.setAttribute('x', 0);
      stripe.setAttribute('y', 0);
      stripe.setAttribute('width', STRIPE_PERIOD * STRIPE_DUTY);
      stripe.setAttribute('height', tileH);
      stripe.setAttribute('fill', spec.fill);
      pattern.appendChild(stripe);
      defs.appendChild(pattern);
      svg.appendChild(defs);
    }

    var pathEl = document.createElementNS(SVGNS, 'path');
    pathEl.setAttribute('fill', HALFTONE ? 'url(#' + patternId + ')' : spec.fill);
    pathEl.setAttribute('fill-rule', 'evenodd');
    svg.appendChild(pathEl);
    wrapper.appendChild(svg);

    // base = baked points; cur = animated copy.
    var base = data.contours.map(function (c) { return c.map(function (p) { return [p[0], p[1]]; }); });
    var cur = data.contours.map(function (c) { return c.map(function (p) { return [p[0], p[1]]; }); });

    return {
      spec: spec, svg: svg, pathEl: pathEl, base: base, cur: cur,
      offUser: [0, 0], // px offset converted to user units (set in positionSvg)
    };
  }

  var layers = LAYERS.map(function (spec, i) { return makeLayer(spec, i); });
  var frontLayer = layers[layers.length - 1]; // white — hosts cursor hit-testing
  // Interaction is handled on the hero section (hitEl); the svg canvases are
  // purely visual, so they ignore pointer events and never block clicks.
  layers.forEach(function (l) { l.svg.style.pointerEvents = 'none'; });
  wrapper.setAttribute('aria-label', data.text);

  function buildD(contours, off) {
    var ox = off[0], oy = off[1];
    var d = '';
    for (var i = 0; i < contours.length; i++) {
      var pts = contours[i];
      d += 'M' + (pts[0][0] + ox).toFixed(1) + ' ' + (pts[0][1] + oy).toFixed(1);
      for (var j = 1; j < pts.length; j++) {
        d += 'L' + (pts[j][0] + ox).toFixed(1) + ' ' + (pts[j][1] + oy).toFixed(1);
      }
      d += 'Z';
    }
    return d;
  }

  function drawLayer(layer) {
    layer.pathEl.setAttribute('d', buildD(layer.cur, layer.offUser));
  }

  // Overlay the SVGs exactly where the live text sits: scale by the rendered
  // font-size and align the font origin (x=0 right edge, y=0 = last-line
  // baseline) to the text's baseline-right. Keeps the crossfade jump-free.
  function positionSvg() {
    var fontPx = parseFloat(getComputedStyle(titleEl).fontSize);
    var scale = fontPx / data.metrics.fontSize; // px per font unit

    var rect = titleEl.getBoundingClientRect();
    var wrap = wrapper.getBoundingClientRect();

    // Empirically find the text baseline: a zero-height inline-block aligned to
    // the baseline reports its top at the baseline y (no font-metric guessing).
    var probe = document.createElement('span');
    probe.style.cssText =
      'display:inline-block;width:0;height:0;vertical-align:baseline';
    titleEl.appendChild(probe);
    var baseY = probe.getBoundingClientRect().top;
    titleEl.removeChild(probe);

    var baseX = rect.right; // baked x=0 is the text right edge (right-aligned)
    var vb = data.viewBox;
    var padU = HIT_PAD_PX / scale; // pad expressed in user units
    var upp = scale ? data.metrics.fontSize / fontPx : 1; // user units per px
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      // Pad the viewBox so the canvas extends HIT_PAD_PX beyond the glyph on all
      // sides — the path coords are unchanged, so the glyph stays put while the
      // hit rect grows.
      layer.svg.setAttribute('viewBox',
        (vb[0] - padU) + ' ' + (vb[1] - padU) + ' ' +
        (vb[2] + 2 * padU) + ' ' + (vb[3] + 2 * padU));
      // Map font origin (0,0) → (baseX, baseY) = (right edge, last-line baseline),
      // then shift out by the pad so the glyph renders in the same spot.
      layer.svg.style.left = (baseX + vb[0] * scale - wrap.left - HIT_PAD_PX) + 'px';
      layer.svg.style.top = (baseY + vb[1] * scale - wrap.top - HIT_PAD_PX) + 'px';
      layer.svg.style.width = (vb[2] * scale + 2 * HIT_PAD_PX) + 'px';
      layer.svg.style.height = (vb[3] * scale + 2 * HIT_PAD_PX) + 'px';
      // Convert the constant screen-px rest offset into user units for draw.
      layer.offUser = [layer.spec.offsetPx[0] * upp, layer.spec.offsetPx[1] * upp];
      drawLayer(layer);
    }
  }

  var strength = { v: 0 };
  var mouseU = { x: 0, y: 0, active: false };
  var rafId = null;
  var strengthAnim = null;

  function clientToUser(clientX, clientY) {
    var ctm = frontLayer.svg.getScreenCTM();
    if (!ctm) return null;
    var inv = ctm.inverse();
    return { x: clientX * inv.a + clientY * inv.c + inv.e,
             y: clientX * inv.b + clientY * inv.d + inv.f };
  }

  function userPerPx() {
    // Derive from the font scale (pad-independent): the svg rect now includes
    // HIT_PAD_PX, so rect.height no longer maps to data.viewBox[3].
    var fontPx = parseFloat(getComputedStyle(titleEl).fontSize);
    if (!fontPx) return 1;
    return data.metrics.fontSize / fontPx;
  }

  function frame() {
    var scale = userPerPx();
    var s = strength.v;
    var maxDelta = 0;

    // Influence radius spans the hero section: base it on the section's diagonal
    // (screen px) so the letters can be pulled from anywhere in the hero.
    var hr = hitEl.getBoundingClientRect();
    var reachPx = Math.sqrt(hr.width * hr.width + hr.height * hr.height);

    for (var li = 0; li < layers.length; li++) {
      var layer = layers[li];
      var base = layer.base, cur = layer.cur;
      var R = reachPx * layer.spec.reachMul * scale;
      var PULL = layer.spec.pull * scale;
      var R2 = R * R;

      for (var i = 0; i < base.length; i++) {
        var bc = base[i], cc = cur[i];
        for (var j = 0; j < bc.length; j++) {
          var bx = bc[j][0], by = bc[j][1];
          var tx = bx, ty = by;
          if (s > 0.001 && mouseU.active) {
            var dx = mouseU.x - bx, dy = mouseU.y - by;
            var d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 0.0001) {
              var d = Math.sqrt(d2);
              var f = 1 - d / R; f = f * f;          // smooth falloff
              var amt = PULL * f * s;
              tx = bx + (dx / d) * amt;
              ty = by + (dy / d) * amt;
            }
          }
          var px = cc[j][0], py = cc[j][1];
          var ux = px + (tx - px) * SPRING;
          var uy = py + (ty - py) * SPRING;
          cc[j][0] = ux;
          cc[j][1] = uy;
          var del = Math.abs(ux - px) + Math.abs(uy - py);
          if (del > maxDelta) maxDelta = del;
        }
      }

      drawLayer(layer);
    }

    if (mouseU.active || s > 0.001 || maxDelta > 0.1) {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = null;
    }
  }

  function ensureLoop() {
    if (rafId == null) rafId = requestAnimationFrame(frame);
  }

  function onMove(e) {
    var u = clientToUser(e.clientX, e.clientY);
    if (!u) return;
    mouseU.x = u.x; mouseU.y = u.y; mouseU.active = true;
    ensureLoop();
  }
  function onEnter() {
    if (strengthAnim) strengthAnim.cancel();
    strengthAnim = anime.animate(strength, { v: 1, duration: 300, ease: 'out(3)' });
    ensureLoop();
  }
  function onLeave() {
    mouseU.active = false;
    if (strengthAnim) strengthAnim.cancel();
    strengthAnim = anime.animate(strength, { v: 0, duration: 450, ease: 'out(2)' });
    ensureLoop();
  }

  var listening = false;
  function addListeners() {
    if (listening || REDUCED) return;
    hitEl.addEventListener('mousemove', onMove);
    hitEl.addEventListener('mouseenter', onEnter);
    hitEl.addEventListener('mouseleave', onLeave);
    listening = true;
  }
  function removeListeners() {
    if (!listening) return;
    hitEl.removeEventListener('mousemove', onMove);
    hitEl.removeEventListener('mouseenter', onEnter);
    hitEl.removeEventListener('mouseleave', onLeave);
    listening = false;
  }

  var swapAnim = null;
  var shown = false;

  // Reveal: show the SVG name directly (no live-text crossfade) and settle it from
  // distortion — each vertex is flung out by a random vector, then the spring loop
  // (frame(), target = base while the cursor is inactive) pulls it home.
  function revealIn() {
    if (shown) return;
    shown = true;

    var scale = userPerPx();           // px → user units for the scatter magnitude
    var scatterU = REVEAL_SCATTER * scale;
    for (var li = 0; li < layers.length; li++) {
      var layer = layers[li];
      for (var i = 0; i < layer.base.length; i++)
        for (var j = 0; j < layer.base[i].length; j++) {
          var a = Math.random() * Math.PI * 2;
          var m = scatterU * (0.5 + Math.random() * 0.5);
          layer.cur[i][j][0] = layer.base[i][j][0] + Math.cos(a) * m;
          layer.cur[i][j][1] = layer.base[i][j][1] + Math.sin(a) * m;
        }
    }
    strength.v = 0;
    mouseU.active = false;
    titleEl.style.opacity = '0';       // hide live text — SVG is the visible name

    positionSvg(); // draws each layer at its scattered start (with offset)
    window.addEventListener('resize', positionSvg);
    layers.forEach(function (l) { l.svg.style.visibility = 'visible'; });
    if (swapAnim) swapAnim.cancel();
    if (REDUCED) {
      // No scatter on reduced-motion: snap geometry to rest, show instantly.
      for (var rli = 0; rli < layers.length; rli++) {
        var rl = layers[rli];
        for (var ri = 0; ri < rl.base.length; ri++)
          for (var rj = 0; rj < rl.base[ri].length; rj++) {
            rl.cur[ri][rj][0] = rl.base[ri][rj][0];
            rl.cur[ri][rj][1] = rl.base[ri][rj][1];
          }
        drawLayer(rl);
        rl.svg.style.opacity = String(rl.spec.opacity);
      }
      return;
    }
    layers.forEach(function (l) {
      anime.animate(l.svg, { opacity: [0, l.spec.opacity], duration: 250, ease: 'linear' });
    });
    // Attach listeners once the layers have faded in.
    swapAnim = anime.animate(frontLayer.svg, {
      opacity: [0, frontLayer.spec.opacity], duration: 250, ease: 'linear',
      onComplete: function () { addListeners(); },
    });
    ensureLoop();                      // spring the scattered vertices home
  }

  function swapOut() {
    if (!shown) return;
    shown = false;
    window.removeEventListener('resize', positionSvg);
    removeListeners();
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    if (strengthAnim) { strengthAnim.cancel(); strengthAnim = null; }
    if (swapAnim) { swapAnim.cancel(); swapAnim = null; }
    strength.v = 0;
    mouseU.active = false;
    layers.forEach(function (l) {
      l.svg.style.opacity = '0';
      l.svg.style.visibility = 'hidden';
    });
    titleEl.style.opacity = '0'; // keep live text hidden; SVG is the visible name
  }

  window.heroLowPoly = { revealIn: revealIn, swapOut: swapOut };
})();
