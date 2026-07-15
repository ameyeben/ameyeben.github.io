/* ── Section transitions ──────────────────────────────────────────────────
   Two paths share one fade+rise (CSS: .section--reveal .container → .in-view):

   1. Scroll-triggered: an IntersectionObserver toggles `.in-view` as each
      non-hero section enters / leaves the viewport, so content fades + rises in
      on entry and re-animates on re-entry.

   2. Nav-link click = "cut, no travel": instead of smooth-scrolling through the
      in-between sections, jump the scroll position instantly to the target. The
      observer then fires for the target and its content transitions in — the
      content comes to the user. The global `scroll-behavior: smooth` is overridden
      to `auto` for the jump, then restored.

   Hero owns its own bespoke reveal and is not part of this system; jumping away
   from it fires hero-reveal.js's own observer, which resets it.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  var sections = document.querySelectorAll('.section--reveal');
  var navLinks = document.querySelectorAll('header nav a[href^="#"]');
  var docEl = document.documentElement;

  function validHash(h) {
    return !!h && h.length > 1 && h.charAt(0) === '#';
  }

  // ── 1. Scroll-triggered reveal ──────────────────────────────────────────
  // Small threshold, not 0.4: a section taller than the viewport (About/Projects
  // stacked on mobile) can never show 40% of itself at once, so 0.4 would leave
  // its content stuck at opacity 0. 0.05 fires as soon as the section enters.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
      else entry.target.classList.remove('in-view');
    });
  }, { threshold: 0.05 });
  sections.forEach(function (s) { io.observe(s); });

  // ── 2. Instant jump (cut, no travel) ────────────────────────────────────
  function jumpTo(hash, push) {
    var el = validHash(hash) ? document.querySelector(hash) : null;
    var prev = docEl.style.scrollBehavior;
    docEl.style.scrollBehavior = 'auto';      // override global smooth → instant
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    docEl.style.scrollBehavior = prev;
    if (push && validHash(hash)) history.pushState(null, '', hash);
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var hash = link.getAttribute('href');
      if (!validHash(hash) || !document.querySelector(hash)) return;
      e.preventDefault();
      jumpTo(hash, true);
    });
  });

  // Back / forward: honor the hash without a smooth re-scroll.
  window.addEventListener('popstate', function () {
    jumpTo(location.hash, false);
  });

  // Deep link: land on the hash once the intro overlay has cleared (the intro
  // resets scroll to top just before dispatching, so we run after it).
  window.addEventListener('introComplete', function () {
    if (validHash(location.hash) && document.querySelector(location.hash)) {
      jumpTo(location.hash, false);
    }
  });
})();
