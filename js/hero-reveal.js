(function () {
  var heroSection = document.getElementById('hero');
  if (!heroSection) return;

  var REVEAL_DURATION = 600;
  var revealEls = [
    heroSection.querySelector('.hero-title'),
    heroSection.querySelector('p'),
    heroSection.querySelector('.hero-subtitle--focus'),
  ].concat(Array.from(heroSection.querySelectorAll('a')));
  revealEls = revealEls.filter(Boolean);

  var reveals = revealEls.map(function (el) {
    return createTextReveal(el, { duration: REVEAL_DURATION });
  });

  var heroVisible = false;
  var introCompleted = false;

  function showHero() {
    function showNext(idx) {
      if (idx >= reveals.length) return;
      reveals[idx].show(function () {
        if (idx === 0 && window.heroLowPoly) window.heroLowPoly.swapIn();
        if (idx === 2 && window.heroFocusCycle) window.heroFocusCycle.start(revealEls[2]);
        setTimeout(function () { showNext(idx + 1); }, 80);
      });
    }
    showNext(0);
  }

  function hideHero(onComplete) {
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
