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
  const { cycles = 2, charSet = 'latin' } = opts;
  const key = `${text}:${cycles}:${charSet}`;
  if (scrambleCache.has(key)) return scrambleCache.get(key);

  const chars = CHAR_SETS[charSet] ?? CHAR_SETS.latin;
  const scramble = Array.from({ length: text.length }, (_, i) => {
    if (text[i] === ' ' || text[i] === '\n') return null;
    const seq = [];
    for (let c = 0; c < cycles; c++) {
      seq.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return seq;
  });

  scrambleCache.set(key, scramble);
  return scramble;
}

function scrambleText(els, text, opts = {}) {
  const {
    duration = 2.0,
    cycles = 2,
    charSet = 'latin',
    onComplete = null,
  } = opts;

  const targetEls = Array.isArray(els) ? els : [els];
  const scramble = generateScramble(text, { cycles, charSet });

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
    allSpans.forEach((spans) => {
      spans.forEach((s, spanIdx) => {
        const i = spanToText[spanIdx];
        if (out[i] === text[i]) {
          s.textContent = text[i];
          s.className = 'locked';
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
        out[i] = scramble[i][0];
      } else if (text[i] === ' ') {
        out[i] = ' ';
      }
    }
    if (targetIndex > lastIndex) {
      render();
      lastIndex = targetIndex;
    }

    if (elapsed >= totalDuration) {
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
      return;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function runIntro() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  const bg = overlay.querySelector('.intro-title-bg');
  const fg = overlay.querySelector('.intro-title-fg');
  if (!bg || !fg) return;

  const text = bg.dataset.text || 'PORTFOLIO';

  // Keep the screen-reader label in sync with the single intro text source.
  fg.setAttribute('aria-label', text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim());

  scrambleText([bg, fg], text, {
    duration: 1.5,
    cycles: 1,
    charSet: 'latin',
    onComplete: () => {
      fg.style.color = '#000000';
      bg.style.display = 'none';
      setTimeout(() => {
        overlay.classList.add('intro-exit');
        overlay.addEventListener('animationend', () => {
          overlay.remove();
        }, { once: true });
      }, 3000);
    },
  });
}

if (document.fonts?.ready) {
  document.fonts.ready.then(runIntro);
} else {
  runIntro();
}
