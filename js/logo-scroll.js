/* Morphing logo driver (#logo-bg) + footer nav swap.

   One document-absolute element, two keyframe rects in document coords:
   - DOCK-HERO:    centers on the page where the name leaves room, with padded
                   box edges
   - DOCK-CONTACT: #logo-anchor-contact, right of the contact links
   The logo scrolls away with the hero; during misc → contact (sp) it flies
   down and settles on the contact anchor. Pointer holo works at both docks,
   plus an occasional idle sweep blue → red while unhovered.

   The docked hero logo joins the hero intro: hidden until the page's
   'heroRevealed' event, then fades/rises in (CSS .revealed).

   Also hides the sticky header once the footer (which carries its own copy
   of the nav links) is in view. */
(function () {
  'use strict';

  const clamp01 = v => Math.max(0, Math.min(1, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = p => p * p * (3 - 2 * p);

  const el = document.getElementById('logo-bg');
  const wrapper = document.getElementById('hero-title-wrapper');
  const misc = document.getElementById('misc');
  const contact = document.getElementById('contact');
  const contactH2 = contact && contact.querySelector('h2');
  const contactUl = contact && contact.querySelector('.contact-links');
  const anchor = document.getElementById('logo-anchor-contact');
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');

  if (el && el._holo && wrapper && misc && contact) {
    const t = el._holo;
    const ASPECT = 140 / 120;         // glyph h/w (trimmed viewBox, see holo-logo.js)
    const LOGO_CONTENT_RIGHT = 5 / 6; // ignore the bottom-right tail square
    const LOGO_NAME_GAP = 8;
    const BOX_PADDING = 24;
    const LOGO_CONTACT_SCALE = 1.5;   // contact dock is larger than the hero dock

    let pointerOn = false;            // pointer holo only while docked
    let hovering = false;

    function update() {
      const scrollY = window.scrollY;
      const headerH = header ? header.offsetHeight : 0;

      // Center the logo on the page where the name leaves room. If the name
      // reaches the page center, keep the logo left of it instead.
      const wr = wrapper.getBoundingClientRect();
      const name = wrapper.querySelector('.hero-title');
      const nameLeft = name ? name.getBoundingClientRect().left : wr.right;
      let h = wr.height * 0.92;
      let w = Math.min(h / ASPECT, wr.width);
      const centerX = window.innerWidth / 2;
      const centerRoom = nameLeft - LOGO_NAME_GAP - centerX;
      if (centerRoom > 0 && w / 3 > centerRoom) {
        w = centerRoom * 3;
        h = w * ASPECT;
      }
      const desiredX = centerX - w / 2;
      const maxX = nameLeft - LOGO_NAME_GAP - w * LOGO_CONTENT_RIGHT;
      const x = Math.min(desiredX, maxX);
      wrapper.style.setProperty(
        '--hero-box-pad-left',
        Math.max(BOX_PADDING, wr.left - x + BOX_PADDING) + 'px'
      );
      const dockH = {
        w,
        x,
        y: wr.top + scrollY,
      };

      // fly to the contact dock during misc → contact (skip if the anchor is
      // hidden). The dock spans the section's header through its links; the
      // anchor only supplies the right edge.
      let sp = 0, dockC = null;
      if (anchor) {
        const ar = anchor.getBoundingClientRect();
        if (ar.width > 0) {
          const h2r = contactH2 ? contactH2.getBoundingClientRect() : ar;
          const ulr = contactUl ? contactUl.getBoundingClientRect() : ar;
          const ch = Math.max(ar.height, ulr.bottom - h2r.top);
          const cw = ch / ASPECT * LOGO_CONTACT_SCALE;
          dockC = { w: cw, x: ar.right - cw, y: h2r.top + scrollY };
          sp = smooth(clamp01(
            (scrollY - (misc.offsetTop - headerH)) /
            Math.max(1, contact.offsetTop - misc.offsetTop)));
        }
      }

      const isHeroDock = sp < 0.5;
      el.toggleAttribute('data-holo-invert', isHeroDock);

      const rw = dockC ? lerp(dockH.w, dockC.w, sp) : dockH.w;
      el.style.width = rw + 'px';
      el.style.left = (dockC ? lerp(dockH.x, dockC.x, sp) : dockH.x) + 'px';
      el.style.top = (dockC ? lerp(dockH.y, dockC.y, sp) : dockH.y) + 'px';
      pointerOn = sp < 0.05 || sp > 0.95;
    }

    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();

    // docked pointer holo — same feel as the pointer-driven stages
    el.addEventListener('pointermove', e => {
      if (!pointerOn) return;
      hovering = true;
      const b = el.getBoundingClientRect();
      t.nx = clamp01((e.clientX - b.left) / b.width);
      t.ny = clamp01((e.clientY - b.top) / b.height);
      t.active = 1;
    });
    el.addEventListener('pointerleave', () => {
      hovering = false;
      if (!pointerOn) return;
      t.nx = 0.5; t.ny = 0.5; t.active = 0;
    });

    // join the hero intro: reveal with the other hero elements
    addEventListener('heroPreparing', () => el.classList.remove('revealed'));
    addEventListener('heroRevealed', () => el.classList.add('revealed'));
    setTimeout(() => {
      if (wrapper.classList.contains('name-revealed')) el.classList.add('revealed');
    }, 8000); // ponytail: fallback only after the name reveal has started

    // name dimming: blue logo shown → "Ameye" dims; red → "Ben" dims.
    // The baked name is one path, so instead of splitting it we float two
    // box-blue bands over each word's region — invisible against the blue
    // box itself, they only dim the white name under them.
    const dimBen = document.createElement('div');
    const dimAmeye = document.createElement('div');
    dimBen.className = 'hero-name-dim hero-name-dim--ben';
    dimAmeye.className = 'hero-name-dim hero-name-dim--ameye';
    wrapper.appendChild(dimBen);
    wrapper.appendChild(dimAmeye);
    (function dimTick() {
      const cur = el._holoCur;
      if (cur) {
        const d = cur.ny - 0.5;
        const g = clamp01(Math.abs(d) * 2.4) * cur.active;
        const amt = g * 0.75;
        dimAmeye.style.opacity = d < 0 ? amt : 0;  // blue b → dim Ameye
        dimBen.style.opacity = d > 0 ? amt : 0;    // red a → dim Ben
        // the name color follows the shown version: mix toward blue/red
        wrapper.style.setProperty('--hero-name-live', g > 0.01
          ? `color-mix(in srgb, hsl(${d < 0 ? 222 : 350} 90% 52%) ${Math.round(g * 90)}%, var(--hero-name))`
          : 'var(--hero-name)');
      }
      requestAnimationFrame(dimTick);
    })();

    // idle: while docked and unhovered, occasionally sweep blue → red
    const idleOk = () => pointerOn && !hovering;
    setInterval(() => {
      if (!idleOk()) return;
      t.active = 1; t.ny = 0.1;                                        // blue b
      setTimeout(() => { if (idleOk()) t.ny = 0.9; }, 1100);           // red a
      setTimeout(() => { if (idleOk()) { t.ny = 0.5; t.active = 0; } }, 2200);
    }, 7000);
  }

  if (header && footer) {
    new IntersectionObserver(entries => {
      header.classList.toggle('header--hidden', entries[0].isIntersecting);
    }, { threshold: 0.3 }).observe(footer);
  }
})();
