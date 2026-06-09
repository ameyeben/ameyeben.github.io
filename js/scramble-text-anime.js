const SCRAMBLE_CHAR_SETS = {
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

SCRAMBLE_CHAR_SETS.ibm = SCRAMBLE_CHAR_SETS.cp850 + SCRAMBLE_CHAR_SETS.cp852 + SCRAMBLE_CHAR_SETS.cp866;
SCRAMBLE_CHAR_SETS.latin = SCRAMBLE_CHAR_SETS.cp850 + SCRAMBLE_CHAR_SETS.cp852;

function scrambleTextAnime(els, text, opts = {}) {
  const {
    duration = 2.0,    // seconds
    charSet = 'latin',
    holdDuration = 0,  // ms
    ease = 'linear',
    onComplete = null,
  } = opts;

  const targetEls = Array.isArray(els) ? els : [els];
  const chars = SCRAMBLE_CHAR_SETS[charSet] ?? SCRAMBLE_CHAR_SETS.latin;

  const scramble = Array.from({ length: text.length }, (_, i) => {
    if (text[i] === ' ' || text[i] === '\n') return null;
    return chars[Math.floor(Math.random() * chars.length)];
  });

  const spanToText = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\n') spanToText.push(i);
  }

  targetEls.forEach(el => {
    el.style.opacity = '0';
    el.innerHTML = [...text].map(c => c === '\n' ? '<br>' : '<span></span>').join('');
  });

  const allSpans = targetEls.map(el => el.querySelectorAll('span'));

  const lockedFlags = allSpans.map(spans => new Uint8Array(spans.length));
  const out = Array(text.length).fill('');
  let revealedUpTo = -1;

  function render() {
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
  }

  targetEls.forEach(el => { el.style.opacity = '1'; });
  render();

  const state = { progress: 0 };

  anime.animate(state, {
    progress: text.length,
    duration: duration * 1000,
    ease,
    onUpdate() {
      const targetIndex = Math.min(Math.floor(state.progress), text.length - 1);
      for (let i = revealedUpTo + 1; i <= targetIndex; i++) {
        if (text[i] !== ' ' && text[i] !== '\n') {
          out[i] = scramble[i];
        } else if (text[i] === ' ') {
          out[i] = ' ';
        }
      }
      if (targetIndex > revealedUpTo) {
        render();
        revealedUpTo = targetIndex;
      }
    },
    onComplete() {
      for (let i = revealedUpTo + 1; i < text.length; i++) {
        if (text[i] !== ' ' && text[i] !== '\n') out[i] = scramble[i];
        else if (text[i] === ' ') out[i] = ' ';
      }
      render();

      setTimeout(() => {
        for (let i = 0; i < text.length; i++) out[i] = text[i];
        render();

        if (onComplete) {
          onComplete();
        } else {
          targetEls[0].style.opacity = '0';
          if (targetEls[1]) targetEls[1].style.color = '#ffffff';
        }
      }, holdDuration);
    },
  });
}
