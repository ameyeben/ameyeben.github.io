/* ── DECODER hero ─────────────────────────────────────────────────────────
   The hero is staged as a language model completing a prompt about Ben.
   A prompt line types in, then the completion streams token-by-token while a
   live logit panel shows the candidate distribution for each step — the top
   (chosen) token lights amber and commits to the output.

   Isolation (principle 01): the NAME decodes first and owns the space; the
   summary streams smaller beneath it. The logit panel (right) forms a diptych
   (07) with the completion — meaning lives in the gap between them.

   Everything degrades to the finished text if prefers-reduced-motion or JS off
   (both lines are authored in the DOM in index-alt.html). */
(function () {
  'use strict';

  var root = document.getElementById('decoder');
  if (!root) return;

  var promptEl = root.querySelector('.dec-prompt-type');
  var nameEl = root.querySelector('.dec-name');
  var sumEl = root.querySelector('.dec-summary');
  var panel = root.querySelector('.dec-logits');
  var statEl = root.querySelector('.dec-stat-rate');
  var cta = root.querySelector('.dec-cta');

  // Two token streams so the name can be isolated from the summary.
  var NAME = ['Benjamin', ' Ameye'];
  var SUMMARY = [
    'software', ' engineer', ' optimizing', ' for', ' AI', '/', 'ML', ' systems', '.', ' ',
    'ships', ' Rust', ' CLIs', ',', ' Python', ' inference', ' tooling', ',', ' full', '-', 'stack', ' ML', ' apps', '.', ' ',
    'currently', ' open', ' to', ' internships', '.'
  ];

  // Plausible distractor tokens for the logit panel. Never chosen — the real
  // token is always slotted at the top with the highest probability.
  var DISTRACTORS = [
    ' neural', ' latent', ' gradient', ' vector', ' the', ' a', ' model', ' data',
    ' async', ' Go', ' C', ' systems', ' backend', ' research', ' agents', ' compilers',
    ' pipelines', ' embeddings', ' tensors', ' scaling', ' distributed', ' kernels',
    ' Meet', ' This', ' builds', ' writes', ' loves', ' focused', ' deep', ' low',
    ' fast', ' clean', ' open', ' available', ' hire', ' intern', '.', ',', ' and'
  ];

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reduced motion / no anim: show the authored final completion + CTAs.
  if (reduce) {
    if (promptEl) promptEl.textContent = 'introduce the candidate';
    if (panel) panel.setAttribute('data-idle', '');
    if (cta) cta.classList.add('revealed');
    if (statEl) statEl.textContent = '—';
    return;
  }

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr, exclude) {
    var t;
    do { t = arr[rand(arr.length)]; } while (t === exclude);
    return t;
  }

  // Descending probability distribution for a step. Top row = chosen token.
  function distribution(chosen) {
    var top = 0.55 + Math.random() * 0.34;            // 0.55–0.89 confidence
    var rows = [{ tok: chosen, p: top, hit: true }];
    var remaining = 1 - top, used = {};
    used[chosen] = 1;
    for (var i = 0; i < 4; i++) {
      var d = pick(DISTRACTORS, chosen);
      if (used[d]) d = pick(DISTRACTORS, chosen);
      used[d] = 1;
      var share = remaining * (0.55 - i * 0.11) * (0.7 + Math.random() * 0.6);
      rows.push({ tok: d, p: Math.max(0.01, share), hit: false });
      remaining -= share;
    }
    return rows;
  }

  function renderPanel(rows) {
    var max = rows[0].p, html = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var w = Math.round((r.p / max) * 100);
      var label = r.tok.replace(/ /g, '·').replace(/</g, '&lt;');
      html +=
        '<div class="logit-row' + (r.hit ? ' logit-row--hit' : '') + '">' +
          '<span class="logit-tok">' + label + '</span>' +
          '<span class="logit-bar"><i style="width:' + w + '%"></i></span>' +
          '<span class="logit-p">' + r.p.toFixed(2) + '</span>' +
        '</div>';
    }
    panel.innerHTML = html;
  }

  // ── Sequence ──
  var PROMPT = 'introduce the candidate';
  var start, committed = 0;
  // phase 0: name stream, phase 1: summary stream
  var phase = 0, target = nameEl, tokens = NAME;

  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function typePrompt(i) {
    promptEl.textContent = PROMPT.slice(0, i);
    if (i <= PROMPT.length) {
      setTimeout(function () { typePrompt(i + 1); }, 34);
    } else {
      root.classList.add('dec-thinking', 'dec-caret-name');
      setTimeout(decodeStep, 420);
    }
  }

  function decodeStep() {
    if (committed >= tokens.length) {
      if (phase === 0) {                 // name done → move caret to summary
        phase = 1; committed = 0; target = sumEl; tokens = SUMMARY;
        root.classList.remove('dec-caret-name');
        root.classList.add('dec-caret-sum');
        return setTimeout(decodeStep, 260);
      }
      return finish();
    }
    var tok = tokens[committed];
    renderPanel(distribution(tok));
    setTimeout(function () {
      target.insertAdjacentHTML('beforeend', esc(tok));
      committed++;
      var delay = 58 + rand(64);
      setTimeout(decodeStep, delay);
    }, 78);
  }

  function finish() {
    var secs = (performance.now() - start) / 1000;
    if (statEl) statEl.textContent = (30 / secs).toFixed(1) + ' tok/s';
    root.classList.remove('dec-thinking', 'dec-caret-sum', 'dec-caret-name');
    root.classList.add('dec-done');
    if (panel) panel.setAttribute('data-idle', '');
    if (cta) cta.classList.add('revealed');
  }

  // Clear the authored fallback text, then stream it back in.
  requestAnimationFrame(function () {
    nameEl.innerHTML = '';
    sumEl.innerHTML = '';
    if (promptEl) promptEl.textContent = '';
    start = performance.now();
    typePrompt(0);
  });
})();
