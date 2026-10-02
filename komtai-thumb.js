/* Komtai thumbnail: the oven explodes as the panel scrolls through the viewport. */
(function () {
  var canvas = document.querySelector('.komtai-live');
  if (!canvas) return;
  var media = canvas.parentElement;
  var panel = media.closest('.project-panel');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var model = null, loading = false, visible = false;
  var DIR = 'projects/komtai/';

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function webgl() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { return x * x * (3 - 2 * x); }

  function update() {
    if (!model) return;
    var r = panel.getBoundingClientRect(), vh = window.innerHeight;
    var p = clamp((vh - r.top) / (vh + r.height));          // 0 as it enters, 1 as it leaves
    var e = ease(clamp((p - 0.18) / 0.32));                  // explodes while it crosses the middle of the screen
    model.drive(e, 0.45 + p * 0.5, 0.3 - e * 0.07);
  }
  function size() {
    if (model) model.resize(canvas.clientWidth, canvas.clientHeight);
    canvas.style.width = '100%'; canvas.style.height = '';
  }

  function boot() {
    if (loading || model || !webgl()) return;
    loading = true;
    (window.THREE ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'))
      .then(function () { return loadScript(DIR + 'komtai-model.js?v=5'); })
      .then(function () {
        model = window.KomtaiModel.create(canvas, {});
        media.classList.add('is-live');
        size(); update();
        if (visible) model.start();
      })
      .catch(function () { loading = false; });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', function () { size(); update(); });
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) { boot(); if (model) { model.start(); update(); } } else if (model) model.stop();
  }, { rootMargin: '300px 0px' }).observe(panel);
})();
