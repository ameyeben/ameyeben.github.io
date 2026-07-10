/* ── Projects: per-item reveal + "scroll for more" ────────────────────────────
   The #projects section pins to one viewport and scrolls its <ul> internally.
   Each item gets the same fade+rise reveal as the rest of the site, but driven
   by the inner scroll: an item reveals only when it is essentially fully inside
   the <ul> viewport, so partially-scrolled items read as hidden (clean edges,
   no half-clipped card). Toggling on scroll-out gives the exit effect for free.
   Two "scroll for more" tags signal hidden items above / below the fold.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  var section = document.getElementById('projects');
  if (!section) return;
  var ul = section.querySelector('.container > ul');
  if (!ul) return;
  var items = ul.querySelectorAll(':scope > li');
  var moreUp = section.querySelector('.scroll-more--up');
  var moreDown = section.querySelector('.scroll-more--down');

  // Hysteresis: reveal at >=0.99, hide only below 0.8. The reveal's translateY
  // shifts the item's geometry, nudging its own intersection ratio — without a
  // dead band that feedback flip-flops the class near the edge (flicker).
  // ponytail: threshold 0.99 means an item taller than the <ul> viewport can
  // never fully fit → it would stay hidden. Current items are short. If a
  // viewport-tall item is ever added, switch to a rootMargin/edge test.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var shown = e.target.classList.contains('in-view');
      if (!shown && e.intersectionRatio >= 0.99) e.target.classList.add('in-view');
      else if (shown && e.intersectionRatio < 0.8) e.target.classList.remove('in-view');
    });
  }, { root: ul, threshold: [0, 0.5, 0.8, 0.99, 1] });
  items.forEach(function (li) { io.observe(li); });

  function update() {
    if (moreUp) moreUp.classList.toggle('visible', ul.scrollTop > 2);
    if (moreDown) {
      var below = ul.scrollTop + ul.clientHeight < ul.scrollHeight - 2;
      moreDown.classList.toggle('visible', below);
    }
  }
  ul.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
