const CHAR_SETS = {
  cp850:
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞß' +
    'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
  cp852:
    'ĄĆČĎĘĚĹĽŁŃŇÓÔŐÖŘŚŠŞŤŢÚŮÜÝŹŽ' +
    'ąćčďęěĺľłńňóôőöřśšşťţúůüýźž' +
    'ĂÂÎÔŘŢĂâîôţ',
  cp866:
    'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' +
    'абвгдежзийклмнопрстуфхцчшщъыьэюя',
};

CHAR_SETS.ibm = CHAR_SETS.cp850 + CHAR_SETS.cp852 + CHAR_SETS.cp866;
CHAR_SETS.latin = CHAR_SETS.cp850 + CHAR_SETS.cp852;

const scrambleCache = new Map();

function generateScramble(text, opts = {}) {
  const { charSet = 'latin' } = opts;
  const key = `${text}:${charSet}`;
  if (scrambleCache.has(key)) return scrambleCache.get(key);

  const chars = CHAR_SETS[charSet] ?? CHAR_SETS.latin;
  const scramble = Array.from({ length: text.length }, (_, i) => {
    if (text[i] === ' ' || text[i] === '\n') return null;
    return chars[Math.floor(Math.random() * chars.length)];
  });

  scrambleCache.set(key, scramble);
  return scramble;
}

function scrambleText(els, text, opts = {}) {
  const {
    duration = 2.0,
    cycles = 2,
    charSet = 'latin',
    holdDuration = 0,
    onComplete = null,
  } = opts;

  const targetEls = Array.isArray(els) ? els : [els];
  const scramble = generateScramble(text, { charSet });

  const out = Array(text.length).fill('');

  const spanToText = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\n') spanToText.push(i);
  }

  targetEls.forEach((el) => {
    el.style.opacity = '0';
    el.innerHTML = [...text].map((c) => c === '\n' ? '<br>' : '<span></span>').join('');
  });
  const allSpans = targetEls.map((el) => el.querySelectorAll('span'));
  const lockedFlags = allSpans.map(spans => new Uint8Array(spans.length));

  targetEls.forEach((el) => {
    const spans = el.querySelectorAll('span');
    spans.forEach((span, idx) => {
      const charIndex = spanToText[idx];
      if (charIndex !== undefined) {
        span.textContent = text[charIndex];
        span.style.width = span.offsetWidth + 'px';
        span.textContent = '';
      }
    });
  });

  const render = () => {
    allSpans.forEach((spans, elIdx) => {
      const flags = lockedFlags[elIdx];
      spans.forEach((s, spanIdx) => {
        if (flags[spanIdx]) return;
        const i = spanToText[spanIdx];
        if (out[i] === text[i]) {
          s.textContent = text[i];
          s.className = 'locked';
          flags[spanIdx] = 1;
        } else if (out[i] !== '') {
          s.textContent = out[i];
          s.className = 'scrambling';
        } else {
          s.textContent = text[i];
          s.className = 'pending';
        }
      });
    });
  };

  const totalDuration = duration * 1000;
  const animatedCount = [...text].filter(c => c !== ' ' && c !== '\n').length;
  const stepMs = Math.max(1, Math.round(totalDuration / Math.max(animatedCount, 1)));
  const startTime = performance.now();
  let lastIndex = -1;

  targetEls.forEach((el) => { el.style.opacity = '1'; });
  render();

  const tick = () => {
    const elapsed = performance.now() - startTime;
    const targetIndex = Math.min(Math.floor(elapsed / stepMs), text.length - 1);

    for (let i = lastIndex + 1; i <= targetIndex; i++) {
      if (text[i] !== ' ' && text[i] !== '\n') {
        out[i] = scramble[i];
      } else if (text[i] === ' ') {
        out[i] = ' ';
      }
    }
    if (targetIndex > lastIndex) {
      render();
      lastIndex = targetIndex;
    }

    if (elapsed >= totalDuration) {
      for (let i = lastIndex + 1; i < text.length; i++) {
        if (text[i] !== ' ' && text[i] !== '\n') {
          out[i] = scramble[i];
        } else if (text[i] === ' ') {
          out[i] = ' ';
        }
      }
      render();

      setTimeout(() => {
        targetEls[0].style.left = '0';
        for (let i = 0; i < text.length; i++) {
          out[i] = text[i];
        }
        render();

        if (onComplete) {
          onComplete();
        } else {
          targetEls[0].style.opacity = '0';
          if (targetEls[1]) targetEls[1].style.color = '#ffffff';
        }
      }, holdDuration);
      return;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function runIntro() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent('introComplete'));
    overlay.remove();
    return;
  }

  document.body.style.overflow = 'hidden';

  const bg = overlay.querySelector('.intro-title-bg');
  const fg = overlay.querySelector('.intro-title-fg');
  if (!bg || !fg) return;

  const text = bg.dataset.text || 'PORTFOLIO';

  const blurEl = document.getElementById('intro-blur');
  if (blurEl) {
    const blurState = { v: 4 };
    anime.animate(blurState, {
      v: 0,
      duration: 1500,
      ease: 'linear',
      onUpdate() {
        const val = blurState.v.toFixed(2) + 'px';
        blurEl.style.backdropFilter = `blur(${val})`;
        blurEl.style.webkitBackdropFilter = `blur(${val})`;
      },
    });
  }

  scrambleTextAnime([bg, fg], text, {
    duration: 1.5,
    charSet: 'latin-ascii',
    holdDuration: 500,
    settleHoldDuration: 2500,
    flashAfterScramble: 150,
    flashBeforeSettle: 150,
    onSettle: () => {
      bg.style.opacity = '0';
    },
    onComplete: () => {
      setTimeout(() => {
        overlay.classList.add('intro-done');
        overlay.classList.add('intro-bsod');

        const variants = [
          'Bienvenue',
          '欢迎',
          'Bienvenido',
          '환영합니다',
          'ようこそ',
          'Willkommen',
          'Welcome',
        ];

        // Low-poly scatter→settle (same effect as the hero name) drives the words
        // when available; the welcome div hosts the SVG and is sized to each glyph
        // so the BSOD box hugs it. Without it, fall back to a plain text cycle.
        const lowPoly = window.introLowPoly || null;

        const welcome = document.createElement('div');
        welcome.className = 'intro-welcome';
        if (lowPoly) lowPoly.mount(welcome);
        else welcome.textContent = variants[0];
        overlay.querySelector('.intro-content').appendChild(welcome);

        const bsodBox = document.createElement('div');
        bsodBox.className = 'intro-bsod-box';
        overlay.appendChild(bsodBox);

        // Size the host to a word's settled glyph (low-poly) so getBoundingClientRect
        // reports the tight box; plain-text fallback lets the text size it.
        function sizeWelcome(i) {
          if (!lowPoly) { welcome.textContent = variants[i]; return; }
          const s = lowPoly.size(i);
          welcome.style.width = s.w + 'px';
          welcome.style.height = s.h + 'px';
        }

        function updateBox() {
          const rect = welcome.getBoundingClientRect();
          const pad = 16;
          bsodBox.style.top    = (rect.top    - pad) + 'px';
          bsodBox.style.left   = (rect.left   - pad) + 'px';
          bsodBox.style.width  = (rect.width  + pad * 2) + 'px';
          bsodBox.style.height = (rect.height + pad * 2) + 'px';
        }
        sizeWelcome(0);
        updateBox();

        let removed = false;
        function removeOverlay() {
          if (removed) return;
          removed = true;
          window.dispatchEvent(new CustomEvent('introComplete'));
          overlay.remove();
        }

        function exitOverlay() {
          window.scrollTo(0, 0);
          document.body.style.overflow = '';
          overlay.classList.add('intro-exit');
          const state = { t: 50, l: 50 };
          anime.animate(state, {
            t: 0,
            l: 0,
            duration: 700,
            ease: anime.cubicBezier(0.65, 0, 0.35, 1),
            onUpdate: () => {
              overlay.style.setProperty('--reveal-t', state.t + '%');
              overlay.style.setProperty('--reveal-l', state.l + '%');
            },
            onComplete: removeOverlay,
          });
          setTimeout(removeOverlay, 1500);
        }

        const HOLD_MS = 450;     // pause on a settled word before advancing
        const FADE_MS = 160;     // fade-out between words (low-poly only)
        const LAST_HOLD = 1700;  // pause on the final word before exiting

        let exited = false;
        function doExit() { if (exited) return; exited = true; exitOverlay(); }
        const exitFallback = setTimeout(doExit, 16000);

        function advanceAfter(i) {
          if (i >= variants.length - 1) {
            clearTimeout(exitFallback);
            setTimeout(doExit, LAST_HOLD);
            return;
          }
          setTimeout(() => {
            if (lowPoly) lowPoly.hide();
            setTimeout(() => showWord(i + 1), lowPoly ? FADE_MS : 0);
          }, HOLD_MS);
        }

        function showWord(i) {
          sizeWelcome(i);
          updateBox();
          if (lowPoly) lowPoly.show(i, () => advanceAfter(i));
          else advanceAfter(i);
        }

        showWord(0);
      }, 400);
    },
  });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(runIntro);
} else {
  runIntro();
}
