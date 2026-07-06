/* Portrait hover peek: while the cursor is over the About portrait, hide it and
   have #portrait-peek (the original ogBen photo) follow the pointer in its place.
   ponytail: hover-only; touch devices have no cursor to replace, so we bail. */
(function () {
  var peek = document.getElementById('portrait-peek');
  var portrait = document.querySelector('.about-portrait');
  if (!peek || !portrait) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  portrait.addEventListener('pointerenter', function () { peek.classList.add('on'); });
  portrait.addEventListener('pointerleave', function () { peek.classList.remove('on'); });
  portrait.addEventListener('pointermove', function (e) {
    peek.style.transform =
      'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%,-50%)';
  });
})();
