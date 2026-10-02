/* Komtai: loads three.js lazily and wires the interactive model viewer. */
(function () {
  var root = document.getElementById('kv');
  if (!root) return;
  var stage = root.querySelector('.kv__stage');
  var canvas = root.querySelector('.kv__canvas');
  var labels = root.querySelector('.kv__labels');
  var range = root.querySelector('.kv__range');
  var caption = root.querySelector('.kv__caption');
  var modeBtns = [].slice.call(root.querySelectorAll('[data-mode]'));
  var viewBtns = [].slice.call(root.querySelectorAll('[data-view]'));
  var CAPTIONS = {
    assembled: 'Closed up: a rounded blue body, a door with a window and handle, a touch display and two dials.',
    exploded: 'Five parts: the door with its controls, the tray, the wire rack, the oven body, and the fan unit with its power cable.',
    open: 'The door drops down and the tray slides out on the rack.',
    convection: 'The fan on the back wall circulates hot air around the food, so it cooks evenly.',
    cooling: 'A blower pulls heat out to control the chamber temperature. Air valves on the underside let air in and out around the chamber, which keeps the oven body cooler.'
  };
  var model = null, loading = false, visible = false, dragging = false;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function webgl() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }

  function boot() {
    if (loading || model || !webgl()) return;
    loading = true;
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
      .then(function () { return loadScript('komtai-model.js?v=' + (root.dataset.v || '1')); })
      .then(function () {
        model = window.KomtaiModel.create(canvas, { labels: labels });
        root.classList.add('is-live');
        sizeToStage();
        setMode('assembled');
        if (visible) model.start();
      })
      .catch(function () { loading = false; });
  }

  function sizeToStage() {
    if (!model) return;
    model.resize(stage.clientWidth, stage.clientHeight);
    canvas.style.width = '100%'; canvas.style.height = '100%';
  }

  function setActive(list, key, val) {
    list.forEach(function (b) { b.classList.toggle('is-active', b.dataset[key] === val); });
  }
  function setMode(name) {
    if (!model) return;
    model.mode(name);
    setActive(modeBtns, 'mode', name);
    setActive(viewBtns, 'view', null);
    var m = model.modes[name];
    range.value = Math.round(m.explode * 100);
    caption.textContent = CAPTIONS[name] || '';
  }

  modeBtns.forEach(function (b) { b.addEventListener('click', function () { touched(); setMode(b.dataset.mode); }); });
  viewBtns.forEach(function (b) {
    b.addEventListener('click', function () { if (!model) return; touched(); model.view(b.dataset.view); setActive(viewBtns, 'view', b.dataset.view); });
  });
  range.addEventListener('input', function () {
    if (!model) return;
    touched();
    model.setExplode(range.value / 100);
    setActive(modeBtns, 'mode', null);
    caption.textContent = range.value > 60 ? CAPTIONS.exploded : CAPTIONS.assembled;
  });

  function touched() { root.classList.add('is-touched'); }

  // drag to rotate
  var lx = 0, ly = 0;
  stage.addEventListener('pointerdown', function (e) {
    if (!model) return;
    dragging = true; lx = e.clientX; ly = e.clientY;
    stage.classList.add('is-drag'); touched();
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging || !model) return;
    model.rotateBy(-(e.clientX - lx) * 0.009, (e.clientY - ly) * 0.007);
    lx = e.clientX; ly = e.clientY;
    setActive(viewBtns, 'view', null);
  });
  function endDrag() { dragging = false; stage.classList.remove('is-drag'); }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('keydown', function (e) {
    if (!model) return;
    var k = e.key;
    if (k === 'ArrowLeft') model.rotateBy(-0.15, 0); else if (k === 'ArrowRight') model.rotateBy(0.15, 0);
    else if (k === 'ArrowUp') model.rotateBy(0, 0.1); else if (k === 'ArrowDown') model.rotateBy(0, -0.1); else return;
    e.preventDefault();
  });

  window.addEventListener('resize', sizeToStage);
  if ('ResizeObserver' in window) new ResizeObserver(sizeToStage).observe(stage);

  var io = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) { boot(); if (model) model.start(); } else if (model) model.stop();
  }, { rootMargin: '200px 0px' });
  io.observe(root);
})();
