/* Holographic "ba" logo sticker. Rests as a flat glyph in the theme's fg
   color; tilt saturates toward blue (the b, up) or red (the a, down), with
   per-cell sinusoidal hue offsets faking diffraction facets.

   Builds the full SVG inside every `.holo-stage .holo-sticker` on the page,
   so instances in markup are just <div class="holo-stage"><div
   class="holo-sticker"></div></div>.

   Drivers:
   - default: pointer position over the stage (up = blue, down = red)
   - [data-holo-manual]: no pointer listeners, no 3D tilt — an external
     script writes stage._holo = { nx, ny, active } (see js/logo-scroll.js) */
(function () {
  'use strict';

  /* Cell map: 6 cols × 4 rows, cell = 20×40 units.
     letter: 'b' = b-only stroke, 'a' = a-only stroke, 'ba' = shared bowl.
     part: 'full' █ · 'top' ▀ · 'bottom' ▄ */
  const CELLS = [
    // row 0 — top curve (a) over the shared bottom-left corner
    { c: 0, r: 0, part: 'bottom', letter: 'ba' },
    { c: 1, r: 0, part: 'top',    letter: 'a'  },
    { c: 2, r: 0, part: 'top',    letter: 'a'  },
    { c: 3, r: 0, part: 'top',    letter: 'a'  },
    { c: 4, r: 0, part: 'bottom', letter: 'a'  },
    // row 1 — b stem left, a stem right, shared crossbar
    { c: 0, r: 1, part: 'full',   letter: 'b'  },
    { c: 1, r: 1, part: 'bottom', letter: 'ba' },
    { c: 2, r: 1, part: 'bottom', letter: 'ba' },
    { c: 3, r: 1, part: 'bottom', letter: 'ba' },
    { c: 4, r: 1, part: 'full',   letter: 'a'  },
    // row 2 — shared bowl walls
    { c: 0, r: 2, part: 'full',   letter: 'ba' },
    { c: 4, r: 2, part: 'full',   letter: 'ba' },
    // row 3 — shared base (incl. bottom-left corner), a's tail
    { c: 0, r: 3, part: 'top',    letter: 'ba' },
    { c: 1, r: 3, part: 'top',    letter: 'ba' },
    { c: 2, r: 3, part: 'top',    letter: 'ba' },
    { c: 3, r: 3, part: 'top',    letter: 'ba' },
    { c: 5, r: 3, part: 'top',    letter: 'a'  },
  ];

  // H is the content height: the bottom row only uses its top half-cell
  // (3×40 + 20 = 140), so the viewBox is trimmed to it — the glyph's visual
  // bottom lines up with the element's bottom edge.
  const CW = 20, CH = 40, W = 120, H = 140;
  const NS = 'http://www.w3.org/2000/svg';
  const HUE_BLUE = 222, HUE_RED = 350;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let uid = 0;

  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function initStage(stage) {
    const sticker = stage.querySelector('.holo-sticker');
    if (!sticker) return;
    const manual = stage.hasAttribute('data-holo-manual');
    const id = `holo${uid++}`;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, 'shape-rendering': 'crispEdges', 'aria-hidden': 'true' });
    const defs = el('defs', {});
    const mask = el('mask', { id: `${id}-mask` });
    const maskG = el('g', { fill: '#fff' });
    mask.appendChild(maskG);
    // glyph shape doubles as the mask for the specular sheen band
    const grad = el('linearGradient', { id: `${id}-sheen`, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H });
    for (const [off, op] of [[0, 0], [.45, .55], [.5, .85], [.55, .55], [1, 0]]) {
      grad.appendChild(el('stop', { offset: off, 'stop-color': '#fff', 'stop-opacity': op }));
    }
    defs.appendChild(mask); defs.appendChild(grad);
    const cellsG = el('g', {});
    const sheenRect = el('rect', {
      x: 0, y: 0, width: W, height: H,
      fill: `url(#${id}-sheen)`, mask: `url(#${id}-mask)`,
      style: 'mix-blend-mode:screen', opacity: 0,
    });
    svg.appendChild(defs); svg.appendChild(cellsG); svg.appendChild(sheenRect);
    sticker.appendChild(svg);

    const rects = [];
    for (const cell of CELLS) {
      const r = el('rect', {
        x: cell.c * CW,
        y: cell.r * CH + (cell.part === 'bottom' ? CH / 2 : 0),
        width: CW,
        height: cell.part === 'full' ? CH : CH / 2,
      });
      cellsG.appendChild(r);
      maskG.appendChild(r.cloneNode());
      rects.push({ el: r, ...cell });
    }

    // tilt scales the 3D rotation: 1 = full pointer tilt, 0 = flat (giant
    // background state). Pointer-driven stages just leave it at 1.
    const target = { nx: 0.5, ny: 0.5, active: 0, tilt: 1 };
    const cur = { nx: 0.5, ny: 0.5, active: 0, tilt: 1 };
    stage._holo = target;   // manual driver writes here (js/logo-scroll.js)
    stage._holoCur = cur;   // read-only smoothed state for external effects

    function paint() {
      const { nx, ny, active } = cur;
      const d = ny - 0.5;               // deviation from center: − = up/blue, + = down/red
      const hue = d < 0 ? HUE_BLUE : HUE_RED;
      const g = clamp01(Math.abs(d) * 2.4) * active;   // overall tilt amount
      // on the light theme the glyph rests dark, not white
      const lightTheme = document.documentElement.dataset.theme === 'light';
      for (const cell of rects) {
        // each letter saturates faster in its own direction
        const gain = cell.letter === 'ba' ? 1
                   : (cell.letter === 'b') === (d < 0) ? 1.5 : 0.5;
        const s = clamp01(Math.abs(d) * 2.4 * gain) * active; // 0 → flat rest color
        // diffraction-facet shimmer: neighbours catch different hues
        const h = hue + Math.sin(cell.c * 1.9 + cell.r * 1.2 + nx * 6.28) * 14 * s;
        const sat = 94 * s;
        const shimmer = Math.sin(cell.c * 1.3 - cell.r * 0.8 + nx * 6.28) * 5 * s;
        const invert = stage.hasAttribute('data-holo-invert');
        const lig = (lightTheme !== invert)
          ? 7 + 38 * s + shimmer
          : 100 - 38 * s + shimmer;
        cell.el.setAttribute('fill', `hsl(${h} ${sat}% ${lig}%)`);
        // while the blue/red version shows, only that letter (its own cells +
        // the shared bowl) stays visible — the other letter goes fully
        // transparent with the tilt
        const shown = cell.letter === 'ba' || (cell.letter === 'b') === (d < 0);
        cell.el.setAttribute('fill-opacity', (shown ? 1 : 1 - g).toFixed(3));
      }
      // specular band tracks the tilt height
      const bandY = ny * H;
      grad.setAttribute('y1', bandY - 55);
      grad.setAttribute('y2', bandY + 55);
      sheenRect.setAttribute('opacity', 0.5 * clamp01(Math.abs(d) * 2.4) * active);
      if (!reduceMotion) {
        const k = active * cur.tilt;
        sticker.style.transform =
          `rotateX(${(0.5 - ny) * 16 * k}deg) rotateY(${(nx - 0.5) * 14 * k}deg)`;
      }
    }

    function tick() {
      // smooth toward target — this easing is what makes it feel physical
      for (const k of ['nx', 'ny', 'active', 'tilt']) cur[k] += (target[k] - cur[k]) * 0.14;
      paint();
      requestAnimationFrame(tick);
    }
    tick();

    if (manual) return;
    stage.addEventListener('pointermove', e => {
      const b = stage.getBoundingClientRect();
      target.nx = clamp01((e.clientX - b.left) / b.width);
      target.ny = clamp01((e.clientY - b.top) / b.height);
      target.active = 1;
    });
    stage.addEventListener('pointerleave', () => { target.nx = 0.5; target.ny = 0.5; target.active = 0; });
    stage.addEventListener('pointerdown', e => stage.setPointerCapture(e.pointerId)); // touch-drag on mobile
  }

  document.querySelectorAll('.holo-stage').forEach(initStage);
})();
