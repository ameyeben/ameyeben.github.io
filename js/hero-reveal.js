(function () {
  var heroSection = document.getElementById('hero');
  if (!heroSection) return;

  var REVEAL_DURATION = 600;
  var titleWrapper = document.getElementById('hero-title-wrapper');
  var focusEl = heroSection.querySelector('.hero-subtitle--focus');
  // Name is revealed by the low-poly module (settle-from-distortion), not here.
  var revealEls = [
    heroSection.querySelector('p'),
    focusEl,
  ].concat(Array.from(heroSection.querySelectorAll('a')));
  revealEls = revealEls.filter(Boolean);

  var reveals = revealEls.map(function (el) {
    return createTextReveal(el, { duration: REVEAL_DURATION });
  });

  var heroVisible = false;
  var introCompleted = false;

  function showHero() {
    // 1. Blue box wipes open from center (CSS clip-path on ::before).
    if (titleWrapper) titleWrapper.classList.add('revealed');
    // 2. Name settles from distortion once the box has begun opening.
    setTimeout(function () {
      if (window.heroLowPoly) window.heroLowPoly.revealIn();
    }, 300);
    // 3. Subtitle / focus / links reveal after the name has begun settling.
    function showNext(idx) {
      if (idx >= reveals.length) return;
      reveals[idx].show(function () {
        if (revealEls[idx] === focusEl && window.heroFocusCycle) {
          window.heroFocusCycle.start(focusEl);
        }
        setTimeout(function () { showNext(idx + 1); }, 80);
      });
    }
    setTimeout(function () { showNext(0); }, 1000);
  }

  function hideHero(onComplete) {
    if (titleWrapper) titleWrapper.classList.remove('revealed');
    if (window.heroLowPoly) window.heroLowPoly.swapOut();
    if (window.heroFocusCycle) window.heroFocusCycle.stop();
    function hideNext(idx) {
      if (idx < 0) {
        reveals.forEach(function (r) { r.reset(); });
        if (onComplete) onComplete();
        return;
      }
      reveals[idx].hide(function () { hideNext(idx - 1); });
    }
    hideNext(reveals.length - 1);
  }

  function tryShow() {
    if (introCompleted && heroVisible) showHero();
  }

  window.addEventListener('introComplete', function () {
    introCompleted = true;
    tryShow();
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !heroVisible) {
        heroVisible = true;
        tryShow();
      } else if (!entry.isIntersecting && heroVisible) {
        heroVisible = false;
        if (titleWrapper) titleWrapper.classList.remove('revealed');
        if (window.heroLowPoly) window.heroLowPoly.swapOut();
        if (window.heroFocusCycle) window.heroFocusCycle.stop();
        reveals.forEach(function (r) { r.reset(); });
      }
    });
  }, { threshold: 0.5 });

  observer.observe(heroSection);

  document.querySelectorAll('header nav a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = link.getAttribute('href');
      if (target === '#hero' || !heroVisible) return;
      e.preventDefault();
      hideHero(function () {
        var el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      });
    });
  });
})();
