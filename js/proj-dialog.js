/* ── Project detail sub-window ─────────────────────────────────────────────
   [ MORE ] on a project/experience item opens the shared <dialog> with that
   item's hidden .proj-detail write-up. Closes on: [x] click, Esc (native
   <dialog> behavior), backdrop click, or a scroll gesture — EXCEPT when the
   scroll happens inside an overflowing dialog body, which is the user reading
   the write-up, not leaving it. */
(function () {
  var dialog = document.getElementById('proj-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var body = document.getElementById('proj-dialog-body');

  function openDetail(li) {
    var detail = li && li.querySelector('.proj-detail');
    if (!detail) return;
    body.innerHTML = detail.innerHTML;
    body.scrollTop = 0;
    dialog.showModal();
  }

  // [ MORE ] button and the item title both open the write-up.
  document.querySelectorAll('.proj-more, #projects > .container > ul > li > h3')
    .forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.closest('li')); });
    });

  document.getElementById('proj-dialog-close').addEventListener('click', function () {
    dialog.close();
  });

  // Backdrop click: the dialog element itself is the target only outside the
  // padded content box.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  function scrollCloses(target) {
    if (!dialog.open) return false;
    // Reading scroll: body overflows and the gesture is inside it → keep open.
    if (body.contains(target) && body.scrollHeight > body.clientHeight) return false;
    return true;
  }

  window.addEventListener('wheel', function (e) {
    if (scrollCloses(e.target)) dialog.close();
  }, { passive: true });

  var touchY = null;
  window.addEventListener('touchstart', function (e) {
    touchY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    // 24px dead zone so a sloppy tap doesn't count as a scroll gesture.
    if (touchY != null && Math.abs(e.touches[0].clientY - touchY) > 24 &&
        scrollCloses(e.target)) {
      dialog.close();
    }
  }, { passive: true });
})();
