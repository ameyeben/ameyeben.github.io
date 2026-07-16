/* Keyword highlight: when a mark.kw scrolls into view, sweep the accent in.
   Delay scales with the word's horizontal position so highlights run across
   the screen left→right (plus a small top-to-bottom offset so rows cascade).
   Un-highlights on exit so the effect replays per visit. */
(function () {
  var kws = document.querySelectorAll('mark.kw');
  if (!kws.length || !('IntersectionObserver' in window)) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      if (entry.isIntersecting) {
        if (!reduce) {
          var r = entry.boundingClientRect;
          var d = (r.left / window.innerWidth) * 0.5 +
                  (Math.max(r.top, 0) / window.innerHeight) * 0.25;
          el.style.setProperty('--kw-delay', d.toFixed(2) + 's');
        }
        el.classList.add('kw-on');
      } else {
        el.classList.remove('kw-on');
      }
    });
  }, { threshold: 0.5 });

  kws.forEach(function (k) { io.observe(k); });
})();
