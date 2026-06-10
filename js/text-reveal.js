function createTextReveal(el, opts) {
  var duration    = (opts && opts.duration)     || 600;
  var hideDuration = (opts && opts.hideDuration) || Math.round(duration * 0.5);

  var originalText = el.textContent;
  el.textContent = '';

  var currentAnim = null;

  var mode = (opts && opts.mode) || 'char';

  // char mode state
  var charSpans = null;
  var textChars = null;

  // word mode state
  var wordSpanEls = null;

  function cancel() {
    if (currentAnim) {
      try { currentAnim.cancel(); } catch (e) {}
      currentAnim = null;
    }
  }

  function buildCharSpans() {
    el.innerHTML = [...originalText]
      .map(function (c) { return c === '\n' ? '<br>' : '<span class="rev-hidden"></span>'; })
      .join('');
    charSpans = [...el.querySelectorAll('span')];
    textChars  = [...originalText].filter(function (c) { return c !== '\n'; });
    charSpans.forEach(function (s, i) {
      s.textContent = textChars[i];
      s.style.minWidth = s.offsetWidth + 'px';
      s.textContent = '';
    });
  }

  function buildWordSpans() {
    var tokens = originalText.split(/(\s+)/);
    el.innerHTML = tokens.map(function (t) {
      return /^\s+$/.test(t)
        ? t
        : '<span class="rev-word" style="opacity:0">' + t + '</span>';
    }).join('');
    wordSpanEls = [...el.querySelectorAll('.rev-word')];
  }

  function show(onComplete) {
    cancel();

    if (mode === 'word') {
      buildWordSpans();
      if (!wordSpanEls.length) { if (onComplete) onComplete(); return; }
      var n        = wordSpanEls.length;
      var step     = Math.round(duration / n);
      var wordDur  = Math.max(80, Math.round(step * 0.6));
      currentAnim = anime.animate(wordSpanEls, {
        opacity: [0, 1],
        duration: wordDur,
        delay: anime.stagger(step),
        ease: 'linear',
        onComplete: function () {
          currentAnim = null;
          if (onComplete) onComplete();
        },
      });
    } else {
      buildCharSpans();
      var state = { progress: 0 };
      currentAnim = anime.animate(state, {
        progress: charSpans.length,
        duration: duration,
        ease: 'linear',
        onUpdate: function () {
          var i = Math.min(Math.floor(state.progress), charSpans.length - 1);
          charSpans.forEach(function (s, idx) {
            if (idx < i - 1) {
              s.textContent = textChars[idx];
              s.className = 'rev-locked';
            } else if (idx === i - 1) {
              s.textContent = '█';
              s.className = 'rev-follower';
            } else if (idx === i) {
              s.textContent = '█';
              s.className = 'rev-cursor';
            } else {
              s.textContent = '';
              s.className = 'rev-hidden';
            }
          });
        },
        onComplete: function () {
          charSpans.forEach(function (s, idx) {
            s.textContent = textChars[idx];
            s.className = 'rev-locked';
          });
          currentAnim = null;
          if (onComplete) onComplete();
        },
      });
    }
  }

  function hide(onComplete) {
    cancel();

    if (mode === 'word' && wordSpanEls && wordSpanEls.length) {
      var reversed = [...wordSpanEls].reverse();
      var n        = reversed.length;
      var step     = Math.round(hideDuration / n);
      var wordDur  = Math.max(60, Math.round(step * 0.6));
      currentAnim = anime.animate(reversed, {
        opacity: [1, 0],
        duration: wordDur,
        delay: anime.stagger(step),
        ease: 'linear',
        onComplete: function () {
          el.textContent = '';
          currentAnim = null;
          if (onComplete) onComplete();
        },
      });
    } else {
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
  }

  function reset() {
    cancel();
    el.textContent = '';
    charSpans   = null;
    textChars   = null;
    wordSpanEls = null;
  }

  return { show: show, hide: hide, reset: reset };
}
