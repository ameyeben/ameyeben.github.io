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

  /* ── Touch: scroll-triggered cross-fade ──
     Move #portrait-peek inline, under the portrait, and toggle .on via
     IntersectionObserver so it reveals as the user scrolls to it. */
  peek.classList.add('peek--inline');
  if (portrait.parentNode) portrait.parentNode.insertBefore(peek, portrait.nextSibling);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) peek.classList.add('on');
      else peek.classList.remove('on');
    });
  }, { threshold: 0.5 });
  io.observe(portrait);
})();
