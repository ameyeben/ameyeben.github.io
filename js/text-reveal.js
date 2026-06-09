function createTextReveal(el, opts) {
  var duration = (opts && opts.duration) || 1400;
  var hideDuration = (opts && opts.hideDuration) || Math.round(duration * 0.5);

  el.style.position = 'relative';

  var text = el.textContent;
  el.innerHTML = '';
  var charSpans = [];

  Array.from(text).forEach(function (c) {
    var span = document.createElement('span');
    span.className = 'tr-char';
    span.textContent = c;
    if (c !== ' ') {
      span.style.opacity = '0';
      charSpans.push(span);
    }
    el.appendChild(span);
  });

  var cursor = document.createElement('span');
  cursor.className = 'tr-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  el.appendChild(cursor);
  cursor.style.opacity = '0';

  var currentAnim = null;

  function cancel() {
    if (currentAnim) {
      try { currentAnim.cancel(); } catch (e) {}
      currentAnim = null;
    }
  }

  // Returns [char0.x, char1.x, ..., charN-1.x, endX]
  function getPositions() {
    var positions = charSpans.map(function (s) { return s.offsetLeft; });
    var last = charSpans[charSpans.length - 1];
    positions.push(last ? last.offsetLeft + last.offsetWidth : 0);
    return positions;
  }

  function show(onComplete) {
    cancel();
    charSpans.forEach(function (s) { s.style.opacity = '0'; });
    cursor.style.opacity = '0';

    var n = charSpans.length;
    if (!n) { if (onComplete) onComplete(); return; }

    var positions = getPositions();
    var charDelay = duration / n;

    cursor.style.left = positions[0] + 'px';

    var tl = anime.createTimeline({
      onComplete: function () {
        currentAnim = null;
        anime.animate(cursor, { opacity: [1, 0], duration: 300, ease: 'linear' });
        if (onComplete) onComplete();
      },
    });

    // Cursor appears at char 0, then snaps to each subsequent char
    tl.set(cursor, { left: positions[0], opacity: 1 }, 0);
    for (var i = 1; i < n; i++) {
      tl.set(cursor, { left: positions[i] }, i * charDelay);
    }
    // After last char, move cursor just past text
    tl.set(cursor, { left: positions[n] }, n * charDelay);

    // Characters stagger in as cursor passes each position
    tl.add(charSpans, {
      opacity: [0, 1],
      duration: 20,
      delay: anime.stagger(charDelay),
    }, 0);

    currentAnim = tl;
  }

  function hide(onComplete) {
    cancel();

    var n = charSpans.length;
    if (!n) { if (onComplete) onComplete(); return; }

    var positions = getPositions();
    var reversed = charSpans.slice().reverse();
    var charDelay = hideDuration / n;

    // Start cursor at last char position
    cursor.style.left = positions[n - 1] + 'px';
    cursor.style.opacity = '1';

    var tl = anime.createTimeline({
      onComplete: function () {
        currentAnim = null;
        cursor.style.opacity = '0';
        if (onComplete) onComplete();
      },
    });

    // Cursor snaps left after each char disappears
    for (var i = 1; i < n; i++) {
      tl.set(cursor, { left: positions[n - 1 - i] }, i * charDelay);
    }
    // After all chars gone, move cursor back to start
    tl.set(cursor, { left: positions[0] }, n * charDelay);

    // Characters hide in reverse stagger
    tl.add(reversed, {
      opacity: [1, 0],
      duration: 20,
      delay: anime.stagger(charDelay),
    }, 0);

    currentAnim = tl;
  }

  function reset() {
    cancel();
    charSpans.forEach(function (s) { s.style.opacity = '0'; });
    cursor.style.opacity = '0';
    cursor.style.left = (charSpans.length ? charSpans[0].offsetLeft : 0) + 'px';
  }

  return { show: show, hide: hide, reset: reset };
}
