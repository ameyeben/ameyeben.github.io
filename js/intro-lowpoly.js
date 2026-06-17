// Intro "welcome" low-poly scatter→settle — the same effect as the hero name
// (js/hero-lowpoly.js), but sequenced over the welcome cycle and non-interactive
// (no cursor magnetism). Each word's baked vertices (window.INTRO_LOWPOLY) start
// flung out by a random vector, then a spring loop lerps them home into a clean
// filled glyph.
//
// API (used by js/scramble-text.js):
//   introLowPoly.mount(hostEl)        — attach the SVG into the .intro-welcome host
//   introLowPoly.show(index, onSettled) — scatter word `index`, spring to rest,
//                                         call onSettled() once settled
//   introLowPoly.size(index)          — { w, h } px of the settled glyph (box fit)

(function () {
  var data = window.INTRO_LOWPOLY;
  if (!data || !data.length) return;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var TARGET_PX = 44;            // rendered glyph height-scale reference (font px)
  var SPRING = 0.3;              // per-frame lerp toward rest (higher = snappier)
  var REVEAL_SCATTER = 70;       // px each vertex is flung out before settling
  var SETTLE_EPS = 0.6;          // user-unit maxDelta below which a word is "settled"
  var FILL = '#ffffff';          // white glyph on the blue BSOD box

  var scale = TARGET_PX / 1000;  // px per font unit (baked at fontSize 1000)

  var host = null;
  var svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.cssText =
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
    'pointer-events:none;opacity:0;transition:opacity .22s linear;overflow:visible';
  var pathEl = document.createElementNS(SVGNS, 'path');
  pathEl.setAttribute('fill', FILL);
  pathEl.setAttribute('fill-rule', 'evenodd');
  svg.appendChild(pathEl);

  var base = null, cur = null;   // current word geometry (arrays of contour points)
  var rafId = null;
  var onSettledCb = null;
  var settled = false;

  function mount(hostEl) {
    host = hostEl;
    if (svg.parentNode !== host) host.appendChild(svg);
  }

  // Tight glyph box in px (for sizing the .intro-welcome host → BSOD box hug).
  function size(index) {
    var d = data[index];
    return {
      w: (d.ink[2] - d.ink[0]) * scale,
      h: (d.ink[3] - d.ink[1]) * scale,
    };
  }

  function buildD(contours) {
    var out = '';
    for (var i = 0; i < contours.length; i++) {
      var pts = contours[i];
      out += 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var j = 1; j < pts.length; j++) out += 'L' + pts[j][0].toFixed(1) + ' ' + pts[j][1].toFixed(1);
      out += 'Z';
    }
    return out;
  }

  function frame() {
    var maxDelta = 0;
    for (var i = 0; i < base.length; i++) {
      var bc = base[i], cc = cur[i];
      for (var j = 0; j < bc.length; j++) {
        var px = cc[j][0], py = cc[j][1];
        var ux = px + (bc[j][0] - px) * SPRING;
        var uy = py + (bc[j][1] - py) * SPRING;
        cc[j][0] = ux; cc[j][1] = uy;
        var del = Math.abs(ux - px) + Math.abs(uy - py);
        if (del > maxDelta) maxDelta = del;
      }
    }
    pathEl.setAttribute('d', buildD(cur));

    if (maxDelta > SETTLE_EPS) {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = null;
      if (!settled) {
        settled = true;
        if (onSettledCb) onSettledCb();
      }
    }
  }

  // Scatter word `index` and spring it home. onSettled fires once it comes to rest.
  function show(index, onSettled) {
    var d = data[index];
    var vb = d.viewBox;
    svg.setAttribute('viewBox', vb.join(' '));
    svg.style.width = (vb[2] * scale) + 'px';
    svg.style.height = (vb[3] * scale) + 'px';

    base = d.contours.map(function (c) { return c.map(function (p) { return [p[0], p[1]]; }); });
    cur = d.contours.map(function (c) { return c.map(function (p) { return [p[0], p[1]]; }); });

    var scatterU = REVEAL_SCATTER / scale; // px → user units
    for (var i = 0; i < cur.length; i++)
      for (var j = 0; j < cur[i].length; j++) {
        var a = Math.random() * Math.PI * 2;
        var m = scatterU * (0.5 + Math.random() * 0.5);
        cur[i][j][0] = base[i][j][0] + Math.cos(a) * m;
        cur[i][j][1] = base[i][j][1] + Math.sin(a) * m;
      }
    pathEl.setAttribute('d', buildD(cur));

    settled = false;
    onSettledCb = onSettled || null;
    svg.style.opacity = '1';
    if (rafId == null) rafId = requestAnimationFrame(frame);
  }

  function hide() {
    svg.style.opacity = '0';
  }

  window.introLowPoly = { mount: mount, show: show, size: size, hide: hide };
})();
