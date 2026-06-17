// Auto-update copyright year
document.getElementById('year').textContent = new Date().getFullYear();

// Grid overlay toggle — press G or click the button
const overlay = document.getElementById('grid-overlay');
const gridBtn = document.getElementById('grid-toggle');
const ratioBtn = document.getElementById('ratio-toggle');
const sectionsBtn = document.getElementById('sections-toggle');

function toggleGrid() {
  const on = overlay.classList.toggle('visible');
  gridBtn.textContent = on ? 'grid on' : 'grid off';
  gridBtn.setAttribute('aria-pressed', on);
}

function toggleRatio() {
  const on = document.body.classList.toggle('show-4-3-guide');
  ratioBtn.textContent = on ? '4:3 on' : '4:3 off';
  ratioBtn.setAttribute('aria-pressed', on);
}

function toggleSections() {
  const on = document.body.classList.toggle('show-section-outlines');
  sectionsBtn.textContent = on ? 'sections on' : 'sections off';
  sectionsBtn.setAttribute('aria-pressed', on);
}

gridBtn.addEventListener('click', toggleGrid);
ratioBtn.addEventListener('click', toggleRatio);
sectionsBtn.addEventListener('click', toggleSections);
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'g' || e.key === 'G') toggleGrid();
  if (e.key === 'r' || e.key === 'R') toggleRatio();
  if (e.key === 's' || e.key === 'S') toggleSections();
});
