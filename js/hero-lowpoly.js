// Hero title low-poly SVG swap + cursor magnetic distortion.
//
// After the hero title's text-reveal finishes, the inline hero script calls
// heroLowPoly.swapIn(); on scroll-away reset it calls heroLowPoly.swapOut().
// While the SVG is shown, vertices near the cursor lean gently toward it and
// spring back. anime.js drives the global warp strength (enter/leave easing).
//
// Geometry comes from window.HERO_LOWPOLY (baked by scripts/bake-hero-lowpoly.mjs).

(function () {
  var data = window.HERO_LOWPOLY;
  var wrapper = document.getElementById('hero-title-wrapper');
  var titleEl = wrapper && wrapper.querySelector('.hero-title');
  if (!data || !wrapper || !titleEl) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var RADIUS_PX = 150;  // cursor influence radius (screen px)
  var MAX_PULL_PX = 44; // max vertex displacement toward cursor (screen px)
  var SPRING = 0.28;    // per-frame lerp toward target (higher = snappier)

  var SVGNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'hero-title-svg');
  svg.setAttribute('viewBox', data.viewBox.join(' '));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  var pathEl = document.createElementNS(SVGNS, 'path');
  pathEl.setAttribute('fill', '#ffffff');
  pathEl.setAttribute('fill-rule', 'evenodd');
  svg.appendChild(pathEl);
  wrapper.appendChild(svg);
  wrapper.setAttribute('aria-label', data.text);

  // base = baked points; cur = animated copy.
  var base = data.contours.map(function (c) { return c.map(function (p) { return [p[0], p[1]]; }); });
  var cur = data.contours.map(function (c) { return c.map(function (p) { return [p[0], p[1]]; }); });

  function buildD(contours) {
    var d = '';
    for (var i = 0; i < contours.length; i++) {
      var pts = contours[i];
      d += 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var j = 1; j < pts.length; j++) {
        d += 'L' + pts[j][0].toFixed(1) + ' ' + pts[j][1].toFixed(1);
      }
      d += 'Z';
    }
    return d;
  }
  pathEl.setAttribute('d', buildD(base));

  // Overlay the SVG exactly where the live text sits: scale by the rendered
  // font-size and align the font origin (x=0 left edge, y=0 baseline) to the
  // text's baseline-left. Keeps the crossfade jump-free.
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

    var baseX = rect.left; // text pen origin (x=0)
    var vb = data.viewBox;
    // Map font origin (0,0) → (baseX, baseY).
    svg.style.left = (baseX + vb[0] * scale - wrap.left) + 'px';
    svg.style.top = (baseY + vb[1] * scale - wrap.top) + 'px';
    svg.style.width = (vb[2] * scale) + 'px';
    svg.style.height = (vb[3] * scale) + 'px';
  }

  var strength = { v: 0 };
  var mouseU = { x: 0, y: 0, active: false };
  var rafId = null;
  var strengthAnim = null;

  function clientToUser(clientX, clientY) {
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    var inv = ctm.inverse();
    return { x: clientX * inv.a + clientY * inv.c + inv.e,
             y: clientX * inv.b + clientY * inv.d + inv.f };
  }

  function userPerPx() {
    var rect = svg.getBoundingClientRect();
    if (!rect.height) return 1;
    return data.viewBox[3] / rect.height;
  }

  function frame() {
    var scale = userPerPx();
    var R = RADIUS_PX * scale;
    var PULL = MAX_PULL_PX * scale;
    var R2 = R * R;
    var s = strength.v;
    var maxDelta = 0;

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

    pathEl.setAttribute('d', buildD(cur));

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
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseenter', onEnter);
    svg.addEventListener('mouseleave', onLeave);
    listening = true;
  }
  function removeListeners() {
    if (!listening) return;
    svg.removeEventListener('mousemove', onMove);
    svg.removeEventListener('mouseenter', onEnter);
    svg.removeEventListener('mouseleave', onLeave);
    listening = false;
  }

  var swapAnim = null;
  var shown = false;

  function swapIn() {
    if (shown) return;
    shown = true;
    // reset geometry to rest before showing
    for (var i = 0; i < base.length; i++)
      for (var j = 0; j < base[i].length; j++) {
        cur[i][j][0] = base[i][j][0];
        cur[i][j][1] = base[i][j][1];
      }
    pathEl.setAttribute('d', buildD(base));
    strength.v = 0;

    positionSvg();
    window.addEventListener('resize', positionSvg);
    svg.style.visibility = 'visible';
    if (swapAnim) swapAnim.cancel();
    if (REDUCED) {
      titleEl.style.opacity = '0';
      svg.style.opacity = '1';
      return;
    }
    anime.animate(titleEl, { opacity: [1, 0], duration: 250, ease: 'linear' });
    swapAnim = anime.animate(svg, {
      opacity: [0, 1], duration: 250, ease: 'linear',
      onComplete: function () { addListeners(); },
    });
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
    svg.style.opacity = '0';
    svg.style.visibility = 'hidden';
    titleEl.style.opacity = ''; // restore for re-reveal
  }

  window.heroLowPoly = { swapIn: swapIn, swapOut: swapOut };
})();
