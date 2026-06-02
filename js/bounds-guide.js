(function () {
  const overlay = document.getElementById('bounds-overlay');
  const boundsInner = overlay.querySelector('.bounds-inner');
  const boundsTrack = overlay.querySelector('.bounds-track');
  const headerLine = overlay.querySelector('.bounds-header-line');
  const bottomLine = overlay.querySelector('.bounds-line-bottom');
  const header = document.querySelector('header');
  const boundsBtn = document.getElementById('bounds-toggle');

  let active = false;

  function updateBounds() {
    if (!active) return;

    const headerBottom = header.offsetTop + header.offsetHeight;
    const contentHeight = document.documentElement.scrollHeight - headerBottom;

    boundsInner.style.top = `${headerBottom}px`;
    boundsInner.style.height = `${contentHeight}px`;

    const overlayRect = overlay.getBoundingClientRect();
    const trackRect = boundsTrack.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();

    headerLine.style.left = `${trackRect.left - overlayRect.left}px`;
    headerLine.style.width = `${trackRect.width}px`;
    headerLine.style.top = `${headerRect.bottom - overlayRect.top}px`;
  }

  function playDrawAnimation() {
    overlay.classList.remove('bounds-animate');
    void overlay.offsetWidth;
    overlay.classList.add('bounds-animate');

    function onEnd(e) {
      if (e.target !== bottomLine || e.animationName !== 'boundsDrawH') return;
      bottomLine.removeEventListener('animationend', onEnd);
      overlay.classList.remove('bounds-animate');
    }

    bottomLine.addEventListener('animationend', onEnd);
  }

  function setActive(on) {
    active = on;
    if (on) {
      overlay.removeAttribute('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      boundsBtn.textContent = 'bounds on';
      boundsBtn.setAttribute('aria-pressed', 'true');
      updateBounds();
      playDrawAnimation();
    } else {
      overlay.classList.remove('bounds-animate');
      overlay.setAttribute('hidden', '');
      overlay.setAttribute('aria-hidden', 'true');
      boundsBtn.textContent = 'bounds off';
      boundsBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function toggleBounds() {
    setActive(!active);
  }

  boundsBtn.addEventListener('click', toggleBounds);

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'b' || e.key === 'B') toggleBounds();
  });

  window.addEventListener('resize', updateBounds);
  window.addEventListener('scroll', updateBounds);

  const resizeObserver = new ResizeObserver(updateBounds);
  resizeObserver.observe(header);
  resizeObserver.observe(boundsInner);

  document.querySelectorAll('#margin-panel input[type="range"]').forEach(slider => {
    slider.addEventListener('input', updateBounds);
  });
})();
