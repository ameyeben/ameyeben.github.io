(function () {
  const STORAGE_KEY = 'portfolio-margin-tool';

  const controls = [
    {
      id: 'bounds-line-width',
      var: '--bounds-line-width',
      label: 'Line thickness',
      unit: 'px',
      min: 1,
      max: 8,
      step: 1,
      default: 1,
    },
    {
      id: 'bounds-width',
      var: '--bounds-width',
      label: 'Bounds box width',
      unit: 'px',
      min: 400,
      max: 1400,
      step: 10,
      default: 1000,
    },
    {
      id: 'max-width',
      var: '--content-max-width',
      label: 'Content width',
      unit: 'px',
      min: 600,
      max: 1400,
      step: 10,
      default: 1000,
    },
    {
      id: 'padding-x',
      var: '--content-padding-x',
      label: 'Horizontal padding',
      unit: 'rem',
      min: 0,
      max: 6,
      step: 0.25,
      default: 1.5,
    },
    {
      id: 'section-y',
      var: '--section-padding-y',
      label: 'Section spacing',
      unit: 'rem',
      min: 1,
      max: 10,
      step: 0.25,
      default: 8,
    },
    {
      id: 'section-inner-x',
      var: '--section-inner-padding-x',
      label: 'Section inner X',
      unit: 'rem',
      min: 0,
      max: 6,
      step: 0.25,
      default: 1.5,
    },
    {
      id: 'section-inner-y',
      var: '--section-inner-padding-y',
      label: 'Section inner Y',
      unit: 'rem',
      min: 0,
      max: 6,
      step: 0.25,
      default: 0,
    },
  ];

  const panel = document.getElementById('margin-panel');
  const marginBtn = document.getElementById('margin-toggle');
  const copyBtn = document.getElementById('margin-copy');
  const root = document.documentElement;

  function formatValue(control, value) {
    return control.unit === 'px' ? `${value}px` : `${value}rem`;
  }

  function parseStoredValue(control, raw) {
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return control.default;
    return Math.min(control.max, Math.max(control.min, num));
  }

  function applyVariable(control, value) {
    root.style.setProperty(control.var, formatValue(control, value));
  }

  function getValues() {
    const values = {};
    controls.forEach(control => {
      const slider = document.getElementById(`margin-${control.id}`);
      values[control.id] = parseFloat(slider.value);
    });
    return values;
  }

  function saveValues() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getValues()));
  }

  function loadValues() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored) return;
      controls.forEach(control => {
        if (stored[control.id] != null) {
          const value = parseStoredValue(control, stored[control.id]);
          const slider = document.getElementById(`margin-${control.id}`);
          const display = document.getElementById(`margin-${control.id}-value`);
          slider.value = value;
          display.textContent = formatValue(control, value);
          applyVariable(control, value);
        }
      });
    } catch {
      /* ignore corrupt storage */
    }
  }

  function buildCssBlock() {
    const lines = controls.map(control => {
      const slider = document.getElementById(`margin-${control.id}`);
      const value = parseFloat(slider.value);
      return `  ${control.var}: ${formatValue(control, value)};`;
    });
    return `:root {\n${lines.join('\n')}\n}`;
  }

  function togglePanel() {
    const open = panel.hasAttribute('hidden');
    if (open) {
      panel.removeAttribute('hidden');
      marginBtn.textContent = 'margins on';
      marginBtn.setAttribute('aria-pressed', 'true');
    } else {
      panel.setAttribute('hidden', '');
      marginBtn.textContent = 'margins';
      marginBtn.setAttribute('aria-pressed', 'false');
    }
  }

  controls.forEach(control => {
    const slider = document.getElementById(`margin-${control.id}`);
    const display = document.getElementById(`margin-${control.id}-value`);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      display.textContent = formatValue(control, value);
      applyVariable(control, value);
      saveValues();
    });
  });

  marginBtn.addEventListener('click', togglePanel);

  copyBtn.addEventListener('click', async () => {
    const css = buildCssBlock();
    try {
      await navigator.clipboard.writeText(css);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy CSS';
        copyBtn.classList.remove('copied');
      }, 1500);
    } catch {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy CSS'; }, 1500);
    }
  });

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'm' || e.key === 'M') togglePanel();
  });

  loadValues();
})();
