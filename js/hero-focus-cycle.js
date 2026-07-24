// Cycling "current focus" word at the end of the hero subtitle.
// Started after the subtitle's text-reveal completes; scrambles between phrases
// in the site's terminal-decode style. Stopped (and span removed) on reset so a
// re-reveal starts clean.

(function () {
  var PHRASES = ['AI/ML', 'Custom CLI tools', '"Functional Programming w/ scala"'];
  var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789<>/\\{}[]#%&@░▒▓█';

  var SCRAMBLE_MS = 650; // decode duration per phrase
  var HOLD_MS = 2200;    // dwell on a settled phrase

  var span = null;
  var pEl = null;
  var rafId = null;
  var timer = null;
  var idx = 0;
  var running = false;

  function rand() { return CHARS[(Math.random() * CHARS.length) | 0]; }

  // The focus span lives inside focusEl, which is a text-reveal target. A stray
  // re-reveal can rebuild focusEl's innerHTML and orphan our span, so re-attach
  // it if it ever gets detached — otherwise writes go to a node no one can see.
  function ensureSpan() {
    if (span && pEl && !span.isConnected) pEl.appendChild(span);
  }

  function scrambleTo(text, done) {
    var start = performance.now();
    function frame() {
      if (!running) return;
      ensureSpan();
      var t = (performance.now() - start) / SCRAMBLE_MS;
      if (t >= 1) {
        span.textContent = text;
        rafId = null;
        if (done) done();
        return;
      }
      var locked = Math.floor(t * text.length);
      var out = '';
      for (var i = 0; i < text.length; i++) {
        out += (i < locked || text[i] === ' ') ? text[i] : rand();
      }
      span.textContent = out;
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);
  }

  function next() {
    if (!running) return;
    scrambleTo(PHRASES[idx], function () {
      if (!running) return;
      timer = setTimeout(function () {
        idx = (idx + 1) % PHRASES.length;
        next();
      }, HOLD_MS);
    });
  }

  // The markup seeds the sentence with a static trailing word (no-JS fallback);
  // strip it so the cycle owns everything after the prefix instead of appending
  // a second word next to it.
  var PREFIX = 'Current focus is ';

  function start(p) {
    if (!p) return;
    stop();               // clean restart: never bail on a stale run with an orphaned span
    pEl = p;
    pEl.textContent = PREFIX;
    span = document.createElement('span');
    span.className = 'hero-focus';
    pEl.appendChild(span);
    // Reduced motion: settle on the first phrase, skip the endless scramble loop.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      span.textContent = PHRASES[0];
      return;
    }
    idx = 0;
    running = true;
    next();
  }

  function stop() {
    running = false;
    if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    if (timer != null) { clearTimeout(timer); timer = null; }
    if (span && span.parentNode) span.parentNode.removeChild(span);
    span = null;
  }

  window.heroFocusCycle = { start: start, stop: stop };
})();
