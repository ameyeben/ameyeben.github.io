/* ── DECODER hero ─────────────────────────────────────────────────────────
   The hero is staged as a language model completing a prompt about Ben.
   A prompt line types in, then the completion streams token-by-token while a
   live logit panel shows the candidate distribution for each step — the top
   (chosen) token lights amber and commits to the output.

   Everything degrades to the finished text if prefers-reduced-motion or JS off
   (the completion text is authored in the DOM in index-alt.html and only
   revealed/animated here). */
(function () {
  'use strict';

  var root = document.getElementById('decoder');
  if (!root) return;

  var promptEl = root.querySelector('.dec-prompt-type');
  var outEl = root.querySelector('.dec-output');
  var panel = root.querySelector('.dec-logits');
  var statEl = root.querySelector('.dec-stat-rate');
  var cta = root.querySelector('.dec-cta');

  // The completion, pre-tokenized. Newline tokens ("\n") become line breaks.
  // Kept LLM-ish: words, punctuation and the odd sub-word split feel like real
  // decoding without hurting readability.
  var TOKENS = [
    'Benjamin', ' Ameye', '\n',
    'software', ' engineer', ' optimizing', ' for', ' AI', '/', 'ML', ' systems', '.', '\n',
    'ships', ' Rust', ' CLIs', ',', ' Python', ' inference', ' tooling', ',', ' full', '-', 'stack', ' ML', ' apps', '.', '\n',
    'currently', ' open', ' to', ' internships', '.'
  ];

  // Plausible distractor tokens for the logit panel. Never shown as chosen —
  // the real token is always slotted at the top with the highest probability.
  var DISTRACTORS = [
    ' neural', ' latent', ' gradient', ' vector', ' the', ' a', ' model', ' data',
    ' async', ' Go', ' C', ' systems', ' backend', ' research', ' agents', ' compilers',
    ' pipelines', ' embeddings', ' tensors', ' scaling', ' distributed', ' kernels',
    ' Meet', ' This', ' builds', ' writes', ' loves', ' focused', ' deep', ' low',
    ' fast', ' clean', ' open', ' available', ' hire', ' intern', '.', ',', ' and'
  ];

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(t) { return t === '\n' ? '<br>' : t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function finalText() {
    return TOKENS.map(esc).join('');
  }

  // Reduced motion / no anim: just show the finished completion + CTAs.
  if (reduce) {
    if (promptEl) promptEl.textContent = 'introduce the candidate';
    outEl.innerHTML = finalText();
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

  // Build a descending probability distribution for a step. Top = chosen token.
  function distribution(chosen) {
    var top = 0.55 + Math.random() * 0.34;            // 0.55–0.89 confidence
    var rows = [{ tok: chosen, p: top, hit: true }];
    var remaining = 1 - top;
    var used = { };
    used[chosen] = 1;
    for (var i = 0; i < 4; i++) {
      var d = pick(DISTRACTORS, chosen);
      if (used[d]) { d = pick(DISTRACTORS, chosen); }
      used[d] = 1;
      var share = remaining * (0.55 - i * 0.11) * (0.7 + Math.random() * 0.6);
      rows.push({ tok: d, p: Math.max(0.01, share), hit: false });
      remaining -= share;
    }
    return rows;
  }

  function renderPanel(rows) {
    var max = rows[0].p;
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var w = Math.round((r.p / max) * 100);
      var label = r.tok === '\n' ? '\\n' : r.tok.replace(/ /g, '·').replace(/</g, '&lt;');
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
  var start;
  var committed = 0;

  function typePrompt(i) {
    promptEl.textContent = PROMPT.slice(0, i);
    if (i <= PROMPT.length) {
      setTimeout(function () { typePrompt(i + 1); }, 34);
    } else {
      root.classList.add('dec-thinking');
      setTimeout(decodeStep, 420);
    }
  }

  function decodeStep() {
    if (committed >= TOKENS.length) return finish();
    var tok = TOKENS[committed];
    renderPanel(distribution(tok));
    // brief hold on the distribution, then commit the chosen token
    setTimeout(function () {
      outEl.insertAdjacentHTML('beforeend', esc(tok));
      committed++;
      // newlines and long spans decode a touch slower, like a real stream
      var delay = tok === '\n' ? 150 : (60 + rand(70));
      setTimeout(decodeStep, delay);
    }, 78);
  }

  function finish() {
    var secs = (performance.now() - start) / 1000;
    var rate = (TOKENS.length / secs).toFixed(1);
    if (statEl) statEl.textContent = rate + ' tok/s';
    root.classList.remove('dec-thinking');
    root.classList.add('dec-done');
    if (panel) panel.setAttribute('data-idle', '');
    if (cta) cta.classList.add('revealed');
  }

  // Kick off after first paint so fonts are likely ready. Clear the authored
  // fallback text (present for no-JS) before streaming it back in.
  requestAnimationFrame(function () {
    outEl.innerHTML = '';
    if (promptEl) promptEl.textContent = '';
    start = performance.now();
    typePrompt(0);
  });
})();
