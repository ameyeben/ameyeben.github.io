/* Portrait peek: reveals the original (ogBen) photo alongside the stylized portrait.
   Two modes share #portrait-peek + its img (ogBen.png):
   – Desktop (hover: hover): the original follows the cursor as a fixed overlay.
   – Touch: when the portrait scrolls into view, it cross-fades to the original
     with the caption visible — the scroll equivalent of the hover peek. */
(function () {
  var peek = document.getElementById('portrait-peek');
  var portrait = document.querySelector('.about-portrait');
  if (!peek || !portrait) return;

  if (window.matchMedia('(hover: hover)').matches) {
    /* ── Desktop: fixed overlay tracking the cursor ── */
    portrait.addEventListener('pointerenter', function () { peek.classList.add('on'); });
    portrait.addEventListener('pointerleave', function () { peek.classList.remove('on'); });
    portrait.addEventListener('pointermove', function (e) {
      peek.style.transform =
        'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%,-50%)';
    });
    return;
  }

  /* ── Touch: scroll-linked cross-fade ──
     Move #portrait-peek inline, under the portrait, and drive its opacity from
     how much of *itself* is in view. Fades in as the user scrolls down to it and
     back out as it scrolls off — both directions tracked by scroll position, not
     a single on/off flip. */
  peek.classList.add('peek--inline');
  if (portrait.parentNode) portrait.parentNode.insertBefore(peek, portrait.nextSibling);

  // Enough thresholds to make the fade read as continuous; the CSS opacity
  // transition eases between the steps.
  var steps = [];
  for (var i = 0; i <= 20; i++) steps.push(i / 20);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      // A short image may never be 100% on screen, so reach full opacity a bit
      // early (×1.6, clamped).
      var o = e.isIntersecting ? Math.min(e.intersectionRatio * 1.6, 1) : 0;
      peek.style.opacity = String(o);
    });
  }, { threshold: steps });
  io.observe(peek);
})();
