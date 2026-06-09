function createTextReveal(el, opts) {
  var duration = (opts && opts.duration) || 600;
  var hideDuration = (opts && opts.hideDuration) || Math.round(duration * 0.5);

  var originalText = el.textContent;
  el.textContent = '';

  var currentAnim = null;

  function cancel() {
    if (currentAnim) {
      try { currentAnim.cancel(); } catch (e) {}
      currentAnim = null;
    }
  }

  function show(onComplete) {
    cancel();
    currentAnim = anime.animate(el, {
      innerHTML: anime.scrambleText({
        text: originalText,
        chars: 'blocks',
        from: 'left',
        cursor: '░▒▓█',
        override: '',
        duration: duration,
        perturbation: 0.05,
        settleDuration: 120,
      }),
      onComplete: function () {
        currentAnim = null;
        if (onComplete) onComplete();
      },
    });
  }

  function hide(onComplete) {
    cancel();
    currentAnim = anime.animate(el, {
      innerHTML: anime.scrambleText({
        text: '',
        chars: 'blocks',
        from: 'right',
        cursor: '░▒▓█',
        override: false,
        duration: hideDuration,
        perturbation: 0,
        settleDuration: 80,
      }),
      onComplete: function () {
        currentAnim = null;
        if (onComplete) onComplete();
      },
    });
  }

  function reset() {
    cancel();
    el.textContent = '';
  }

  return { show: show, hide: hide, reset: reset };
}
