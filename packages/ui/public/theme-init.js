// Applies a saved theme choice before first paint, so a visitor who picked
// Light or Dark never sees the other theme flash.  Kept as a file (not inline)
// so the Content Security Policy can allow only scripts served from this site.
(function () {
  try {
    var choice = localStorage.getItem('theme');
    if (choice === 'light' || choice === 'dark') document.documentElement.setAttribute('data-theme', choice);
  } catch (error) {
    // Storage is unavailable: the page follows the system setting.
  }
})();
