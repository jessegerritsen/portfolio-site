document.getElementById('year').textContent = new Date().getFullYear();

// Intro: text holds, a drop grows to cover the page, the page fades in underneath it,
// then that same drop shrinks in place into the decorative blob on the hero
const introEl = document.getElementById('introSplash');
const dropEl = document.getElementById('introDrop');
const heroBlobEl = document.querySelector('.hero__blob');
const heroOrbitEl = document.querySelector('.hero__orbit');
const heroSectionEl = document.querySelector('.hero');

// Target rect uses the blob's untransformed size (offsetWidth/Height ignore the
// pre-visible scale(.85)) so the settle animation ends at the exact box the real
// element will render at — otherwise the handoff pops/resizes.
function heroBlobTargetRect() {
  const sectionRect = heroSectionEl.getBoundingClientRect();
  const w = heroBlobEl.offsetWidth;
  const h = heroBlobEl.offsetHeight;
  return {
    left: sectionRect.left + sectionRect.width / 2 - w / 2,
    top: sectionRect.top + sectionRect.height / 2 - h / 2,
    width: w,
    height: h
  };
}

function settleDropIntoHero() {
  if (!dropEl || !heroBlobEl) return;
  const target = heroBlobTargetRect();
  const current = dropEl.getBoundingClientRect();
  dropEl.style.left = current.left + 'px';
  dropEl.style.top = current.top + 'px';
  dropEl.style.width = current.width + 'px';
  dropEl.style.height = current.height + 'px';
  dropEl.style.bottom = 'auto';
  dropEl.style.transform = 'none';
  void dropEl.offsetHeight; // force reflow so the starting box takes effect before transitioning
  dropEl.classList.add('is-settling');
  dropEl.style.left = target.left + 'px';
  dropEl.style.top = target.top + 'px';
  dropEl.style.width = target.width + 'px';
  dropEl.style.height = target.height + 'px';
  dropEl.style.opacity = '.3';
}

// Swap the drop for the real hero blob with no transition, so it snaps into
// the exact state the drop just settled at instead of animating in again.
function revealHeroBlob() {
  if (dropEl) dropEl.remove();
  if (introEl) introEl.remove();
  if (heroBlobEl) {
    heroBlobEl.style.transition = 'none';
    heroBlobEl.classList.add('is-visible');
    void heroBlobEl.offsetHeight;
    heroBlobEl.style.transition = '';
  }
  if (heroOrbitEl) heroOrbitEl.classList.add('is-visible');
}

// The full splash → drop → hero-blob sequence only ever plays once per visitor;
// every later visit (including navigating back to the home page) skips straight
// to the settled hero blob.
let introAlreadySeen = false;
try { introAlreadySeen = localStorage.getItem('introSeen') === '1'; } catch (e) {}

if (introEl && dropEl) {
  if (introAlreadySeen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dropEl.remove();
    introEl.remove();
    if (heroBlobEl) heroBlobEl.classList.add('is-visible');
    if (heroOrbitEl) heroOrbitEl.classList.add('is-visible');
  } else {
    try { localStorage.setItem('introSeen', '1'); } catch (e) {}
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => introEl.classList.add('is-text-visible'));
    setTimeout(() => introEl.classList.remove('is-text-visible'), 2560); // long enough to read
    setTimeout(() => dropEl.classList.add('is-covering'), 2700); // fast, .4s grow
    // Restore scrolling before measuring/settling into the target, so the
    // scrollbar's width is already accounted for and the handoff can't jump.
    setTimeout(() => { document.documentElement.style.overflow = ''; }, 3100);
    setTimeout(() => {
      introEl.classList.add('is-hidden'); // page fades in
      dropEl.classList.add('is-behind'); // drop tucks behind hero content right as it appears
    }, 3120);
    setTimeout(settleDropIntoHero, 3120); // same drop shrinks into the hero blob's spot
    setTimeout(revealHeroBlob, 3350);
  }
} else if (heroBlobEl) {
  heroBlobEl.classList.add('is-visible');
  if (heroOrbitEl) heroOrbitEl.classList.add('is-visible');
}

// Reveal-on-scroll
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

// Animate tool progress bars once visible
const fills = document.querySelectorAll('.tool__fill');
const fillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.style.width = el.dataset.pct + '%';
      fillObserver.unobserve(el);
    }
  });
}, { threshold: 0.4 });
fills.forEach(el => fillObserver.observe(el));

// Scrollspy for top nav (skip links that aren't in-page anchors, e.g. the CV PDF)
const navLinks = Array.from(document.querySelectorAll('.topnav__link')).filter(link => link.getAttribute('href').startsWith('#'));
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));

function setActiveLink() {
  if (!sections.length) return;
  // At the bottom of the page there's no scroll room left to reach the last
  // section's normal threshold (nothing below it to scroll past), so treat
  // "scrolled to the end" as a special case rather than leaving it unreachable.
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  let current;
  if (atBottom) {
    current = sections[sections.length - 1];
  } else {
    const pos = window.scrollY + window.innerHeight / 3;
    current = sections[0];
    sections.forEach(sec => {
      if (sec && sec.offsetTop <= pos) current = sec;
    });
  }
  navLinks.forEach(link => {
    link.classList.toggle('is-active', link.getAttribute('href') === '#' + current.id);
  });
}
window.addEventListener('scroll', setActiveLink, { passive: true });
setActiveLink();

// Expandable experience cards
document.querySelectorAll('.exp-card__toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const list = btn.nextElementSibling;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    list.style.maxHeight = expanded ? '0' : list.scrollHeight + 'px';
  });
});

// Generic carousel controller: shows one slide at a time via is-active toggling
function initCarousel(root) {
  const track = root.querySelector('.carousel__track');
  const slides = Array.from(track.children);
  const label = root.querySelector('.carousel__label');
  let index = 0;

  function render() {
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    if (label && slides[index].dataset.label) label.textContent = slides[index].dataset.label;
  }
  render();

  const buttons = root.querySelectorAll('.carousel__btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (slides.length <= 1) return;
      index = (index + Number(btn.dataset.dir) + slides.length) % slides.length;
      render();
    });
  });
}
document.querySelectorAll('.carousel').forEach(initCarousel);

// Interactive logo process (Tiny Rocket): auto-cycles through the reference circles,
// pausing on hover/focus so visitors can still pick one manually
document.querySelectorAll('.logo-process').forEach(root => {
  const circles = Array.from(root.querySelectorAll('.logo-process__circle'));
  const caption = root.querySelector('.logo-process__caption');
  if (!circles.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = Math.max(0, circles.findIndex(c => c.classList.contains('is-active')));
  let timer = null;

  const setActive = i => {
    index = i;
    circles.forEach(c => c.classList.remove('is-active'));
    circles[index].classList.add('is-active');
    if (caption) caption.textContent = circles[index].dataset.caption;
  };
  const start = () => {
    if (reduceMotion || timer) return;
    timer = setInterval(() => setActive((index + 1) % circles.length), 1500);
  };
  const stop = () => { clearInterval(timer); timer = null; };

  circles.forEach((circle, i) => {
    circle.addEventListener('mouseenter', () => { stop(); setActive(i); });
    circle.addEventListener('focus', () => { stop(); setActive(i); });
  });
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusout', e => {
    if (!root.contains(e.relatedTarget)) start();
  });

  setActive(index);
  start();
});

// Phone screen carousels: swipeable (touch/trackpad/mouse-drag) horizontal scroller
// that also auto-scrolls continuously (like the old CSS marquee), pausing while the
// visitor interacts. Scrolls by a tiny amount every frame instead of jumping a whole
// tile on a timer, and wraps seamlessly using the duplicated tile set — this avoids
// calling scrollTo(smooth) on an interval, which Safari can fight and stall on.
function initPhoneMarquee(root) {
  const track = root.querySelector('.phone-marquee__track');
  const sets = track ? Array.from(track.querySelectorAll(':scope > .phone-tiles')) : [];
  if (sets.length < 2) return;
  const setWidth = sets[0].getBoundingClientRect().width;
  if (!setWidth) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = setWidth / 38; // px/sec — matches the original 38s-per-cycle pace

  let rafId = null;
  let lastTime = null;
  let paused = false;
  let resumeTimer = null;

  function frame(time) {
    if (lastTime === null) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if (!paused) {
      root.scrollLeft += speed * dt;
      if (root.scrollLeft >= setWidth) root.scrollLeft -= setWidth;
    }
    rafId = requestAnimationFrame(frame);
  }
  function start() {
    if (reduceMotion || rafId) return;
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function deferResume() {
    paused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, 3000);
  }

  root.addEventListener('touchstart', deferResume, { passive: true });
  // Only a genuinely horizontal wheel/trackpad gesture counts as interaction —
  // vertical page-scroll also fires 'wheel' whenever the cursor happens to be
  // over the carousel, which isn't the visitor trying to control it
  root.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) deferResume();
  }, { passive: true });

  // Click-and-drag scrolling for mouse/trackpad users (native scroll already
  // handles touch swipe and two-finger trackpad gestures on its own)
  let isDragging = false;
  let dragStartX = 0;
  let scrollStartLeft = 0;
  root.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    isDragging = true;
    dragStartX = e.clientX;
    scrollStartLeft = root.scrollLeft;
    deferResume();
  });
  window.addEventListener('pointermove', e => {
    if (!isDragging) return;
    root.scrollLeft = scrollStartLeft - (e.clientX - dragStartX);
  });
  window.addEventListener('pointerup', () => { isDragging = false; });

  start();
}
document.querySelectorAll('.phone-marquee').forEach(initPhoneMarquee);

// Interactive site map (Snapp): draws connector lines from each linked row to its
// target screen, highlights the path on click, and supports drag-to-pan on the canvas
const sitemapCanvas = document.getElementById('sitemapCanvas');
if (sitemapCanvas) {
  const scrollEl = sitemapCanvas.querySelector('.sitemap__scroll');
  const canvasOuter = sitemapCanvas.querySelector('.sitemap__canvas-outer');
  const canvasEl = sitemapCanvas.querySelector('.sitemap__canvas');
  const svg = document.getElementById('sitemapEdges');
  const rows = Array.from(canvasEl.querySelectorAll('.sm-row[data-target]'));
  const nodes = {};
  canvasEl.querySelectorAll('.sm-node').forEach(n => { nodes[n.dataset.id] = n; });

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const edges = [];
  const CANVAS_W = 1700, CANVAS_H = 990;
  const MIN_SCALE = 0.35, MAX_SCALE = 1.6;
  let scale = 1;

  // getBoundingClientRect() returns post-transform (already-scaled) screen pixels,
  // but the SVG's own path coordinates live in the canvas's untransformed logical
  // space (the transform scales the whole SVG along with everything else) — so
  // divide back out by the current scale to keep the two in sync.
  function rectIn(el) {
    const r = el.getBoundingClientRect();
    const c = canvasEl.getBoundingClientRect();
    return {
      left: (r.left - c.left) / scale,
      top: (r.top - c.top) / scale,
      right: (r.right - c.left) / scale,
      bottom: (r.bottom - c.top) / scale,
      width: r.width / scale,
      height: r.height / scale
    };
  }

  function applyScale(next) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    canvasEl.style.transform = `scale(${scale})`;
    canvasOuter.style.width = (CANVAS_W * scale) + 'px';
    canvasOuter.style.height = (CANVAS_H * scale) + 'px';
    updatePaths();
  }

  function fitScale() {
    return Math.min(scrollEl.clientWidth / CANVAS_W, scrollEl.clientHeight / CANVAS_H, 1);
  }

  // Right-angle-ish connector: exits the row's nearer side, enters the target's
  // nearer side, curving through a midpoint so lines never cut straight through cards.
  function routePath(rowRect, targetRect) {
    const sourceCenterX = rowRect.left + rowRect.width / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const goRight = targetCenterX >= sourceCenterX;
    const sx = goRight ? rowRect.right : rowRect.left;
    const sy = rowRect.top + rowRect.height / 2;
    const targetBelow = targetRect.top > rowRect.bottom;
    const targetAbove = targetRect.bottom < rowRect.top;
    let tx, ty, d;
    if (targetBelow || targetAbove) {
      tx = targetRect.left + targetRect.width / 2;
      ty = targetBelow ? targetRect.top : targetRect.bottom;
      const midY = sy + (ty - sy) / 2;
      d = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
    } else {
      tx = goRight ? targetRect.left : targetRect.right;
      ty = targetRect.top + targetRect.height / 2;
      const midX = sx + (tx - sx) / 2;
      d = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
    }
    return { d, sx, sy };
  }

  function buildEdges() {
    svg.innerHTML = '';
    edges.length = 0;
    rows.forEach(row => {
      const targetNode = nodes[row.dataset.target];
      if (!targetNode) return;
      const path = document.createElementNS(SVG_NS, 'path');
      svg.appendChild(path);
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '3');
      svg.appendChild(dot);
      edges.push({ row, targetNode, path, dot });
    });
  }

  function updatePaths() {
    edges.forEach(({ row, targetNode, path, dot }) => {
      const { d, sx, sy } = routePath(rectIn(row), rectIn(targetNode));
      path.setAttribute('d', d);
      dot.setAttribute('cx', sx);
      dot.setAttribute('cy', sy);
    });
  }

  buildEdges();
  applyScale(fitScale());
  window.addEventListener('resize', () => applyScale(scale));

  sitemapCanvas.querySelectorAll('.sitemap__zoom-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.zoom;
      if (action === 'in') applyScale(scale + 0.2);
      else if (action === 'out') applyScale(scale - 0.2);
      else if (action === 'fit') applyScale(fitScale());
    });
  });

  function clearActive() {
    edges.forEach(({ row, targetNode, path, dot }) => {
      path.classList.remove('is-active');
      dot.classList.remove('is-active');
      row.classList.remove('is-active');
      targetNode.classList.remove('is-active');
    });
    Object.values(nodes).forEach(n => n.classList.remove('is-active'));
  }

  rows.forEach(row => {
    row.setAttribute('tabindex', '0');
    row.setAttribute('role', 'button');
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasActive = row.classList.contains('is-active');
      clearActive();
      if (wasActive) return;
      const edge = edges.find(edg => edg.row === row);
      if (!edge) return;
      row.classList.add('is-active');
      edge.path.classList.add('is-active');
      edge.dot.classList.add('is-active');
      const sourceNode = row.closest('.sm-node');
      if (sourceNode) sourceNode.classList.add('is-active');
      edge.targetNode.classList.add('is-active');
      edge.targetNode.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
  });

  scrollEl.addEventListener('click', clearActive);

  let isDown = false, startX = 0, startY = 0, startScrollLeft = 0, startScrollTop = 0;
  scrollEl.addEventListener('mousedown', (e) => {
    isDown = true;
    scrollEl.classList.add('is-dragging');
    startX = e.pageX;
    startY = e.pageY;
    startScrollLeft = scrollEl.scrollLeft;
    startScrollTop = scrollEl.scrollTop;
  });
  window.addEventListener('mouseup', () => { isDown = false; scrollEl.classList.remove('is-dragging'); });
  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    scrollEl.scrollLeft = startScrollLeft - (e.pageX - startX);
    scrollEl.scrollTop = startScrollTop - (e.pageY - startY);
  });
}

// Tap-to-zoom lightbox for flat process images (sketches, wireframes, etc.) — these
// are often wide composites that shrink to illegible thumbnails on mobile
const zoomableImages = document.querySelectorAll('.full-image--flat');
if (zoomableImages.length) {
  const lightbox = document.createElement('div');
  lightbox.className = 'img-lightbox';
  lightbox.innerHTML = '<button class="img-lightbox__close" aria-label="Close">&times;</button><img alt="">';
  document.body.appendChild(lightbox);
  const lightboxImg = lightbox.querySelector('img');

  function openLightbox(img) {
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.documentElement.style.overflow = '';
  }
  zoomableImages.forEach(img => {
    const wrap = document.createElement('span');
    wrap.className = 'img-zoom-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    const badge = document.createElement('span');
    badge.className = 'img-zoom-badge';
    badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
    wrap.appendChild(badge);
    img.addEventListener('click', () => openLightbox(img));
  });
  lightbox.addEventListener('click', (e) => { if (e.target !== lightboxImg) closeLightbox(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

// Custom cursor: a small red dot that tracks the mouse, growing into a "View" label
// over project cards. Skipped on touch devices, which have no real cursor to replace.
if (window.matchMedia('(pointer: fine)').matches) {
  const cursorDot = document.createElement('div');
  cursorDot.className = 'cursor-dot';
  const cursorLabel = document.createElement('span');
  cursorLabel.className = 'cursor-dot__label';
  cursorLabel.textContent = 'View →';
  cursorDot.appendChild(cursorLabel);
  document.body.appendChild(cursorDot);
  window.addEventListener('mousemove', e => {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
    cursorDot.classList.add('is-active');
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursorDot.classList.remove('is-active'));

  document.querySelectorAll('.project-panel:not(.project-panel--live), .project-panel--live .project-panel__info').forEach(card => {
    card.addEventListener('mouseenter', () => cursorDot.classList.add('is-hover'));
    card.addEventListener('mouseleave', () => cursorDot.classList.remove('is-hover'));
  });
}

// Smooth scrolling (Lenis, only loaded on pages that include it) and scroll-linked
// parallax on featured project images. Both skipped under prefers-reduced-motion.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
  function updateParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach(el => {
      const rect = el.parentElement.getBoundingClientRect();
      const progress = (vh - rect.top) / (vh + rect.height);
      el.style.transform = `translateY(${(progress - 0.5) * rect.height * 0.18}px)`;
    });
  }
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    function raf(time) {
      lenis.raf(time);
      if (parallaxEls.length) updateParallax();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  } else if (parallaxEls.length) {
    window.addEventListener('scroll', updateParallax, { passive: true });
    updateParallax();
  }
}

// Word-by-word headline reveal, triggered 10-15% into view — same threshold as
// the general .reveal fade, so there's never an empty screen while scrolling.
document.querySelectorAll('[data-reveal-words]').forEach(el => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w, i) =>
    `<span class="reveal-word"><span style="transition-delay:${i * 35}ms">${w}</span></span>`
  ).join(' ');
});
const wordObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      wordObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('[data-reveal-words]').forEach(el => wordObserver.observe(el));


// Snapp panel: scroll-driven "research to screen" process shown inside the thumbnail
(() => {
  const sec = document.getElementById('s2s');
  if (!sec) return;
  const steps = sec.querySelectorAll('.s2s-step');
  const btns = sec.querySelectorAll('.s2s-nav button');
  const R = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- hand-drawn sketch, generated as wobbly pencil strokes ---- */
  const svg = document.getElementById('s2s-sk'), NS = 'http://www.w3.org/2000/svg';
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const j = (a = 1.6) => (rnd() - .5) * 2 * a;
  const items = []; let idx = 0;
  function add(d, i, cls = 'sk') { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', 1); p.setAttribute('class', cls); svg.appendChild(p); items.push({ el: p, i, kind: 'line' }); }
  function line(x1, y1, x2, y2, i, cls = 'sk') {          // slightly bowed line with overshoot, drawn twice like a pencil
    for (let k = 0; k < 2; k++) {
      const o = k ? 1.2 : 0, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ox = -dy / L, oy = dx / L, bow = j(L * .006 + .6);
      add(`M${x1 - dx / L * 3 + j(o)} ${y1 - dy / L * 3 + j(o)} Q${(x1 + x2) / 2 + ox * bow + j(o)} ${(y1 + y2) / 2 + oy * bow + j(o)} ${x2 + dx / L * 2 + j(o)} ${y2 + dy / L * 2 + j(o)}`, i, k ? cls + ' lt' : cls);
    }
  }
  function rect(x, y, w, h, i, cls = 'sk') { line(x, y, x + w, y, i, cls); line(x + w, y, x + w, y + h, i, cls); line(x + w, y + h, x, y + h, i, cls); line(x, y + h, x, y, i, cls); }
  function ellipse(cx, cy, rx, ry, i, cls = 'sk', turns = 1.12) {
    let d = ''; const n = 28, a0 = rnd() * 6.28;
    for (let k = 0; k <= n * turns; k++) { const a = a0 + k / n * 6.28, r = 1 + j(.05); d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rx * r).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * r).toFixed(1); }
    add(d, i, cls);
  }
  function pill(x, y, w, h, i) {                    // rounded search field
    const r = h / 2; let d = ''; const n = 60;
    for (let k = 0; k <= n + 3; k++) { const t = (k % n) / n * 2 * (w - 2 * r + Math.PI * r); let px, py, s = t;
      const straight = w - 2 * r, arc = Math.PI * r;
      if (s < straight) { px = x + r + s; py = y; }
      else if ((s -= straight) < arc) { const a = -Math.PI / 2 + s / r; px = x + w - r + Math.cos(a) * r; py = y + r + Math.sin(a) * r; }
      else if ((s -= arc) < straight) { px = x + w - r - s; py = y + h; }
      else { s -= straight; const a = Math.PI / 2 + s / r; px = x + r + Math.cos(a) * r; py = y + r + Math.sin(a) * r; }
      d += (k ? 'L' : 'M') + (px + j(.8)).toFixed(1) + ' ' + (py + j(.8)).toFixed(1); }
    add(d, i);
  }
  function text(x, y, str, size, i) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('font-size', size); t.setAttribute('class', 'sk-t'); t.textContent = str; svg.appendChild(t); items.push({ el: t, i, kind: 'text' }); }
  function mag(cx, cy, r, i) { ellipse(cx, cy, r, r, i); line(cx + r * .7, cy + r * .7, cx + r * 1.7, cy + r * 1.7, i); }
  function img(x, y, w, h, i) { rect(x, y, w, h, i); line(x, y, x + w, y + h, i + .5, 'sk lt'); line(x + w, y, x, y + h, i + .5, 'sk lt'); line(x + 6, y + h + 26, x + w * .78, y + h + 25, i + 1); line(x + 7, y + h + 52, x + w * .38, y + h + 51, i + 1, 'sk lt'); }

  rect(5, 5, 459, 1010, idx++);
  text(24, 98, 'Home', 40, idx++);
  mag(342, 58, 11, idx); line(386, 46, 394, 46, idx); line(394, 46, 402, 72, idx); line(402, 72, 428, 72, idx); line(398, 56, 434, 54, idx); line(434, 54, 428, 72, idx); ellipse(406, 82, 3.5, 3.5, idx); ellipse(424, 82, 3.5, 3.5, idx++);
  pill(25, 118, 391, 80, idx++); mag(57, 156, 9, idx); text(96, 168, 'Search...', 28, idx++);
  text(31, 288, 'Trending', 36, idx++);
  img(36, 316, 113, 143, idx); img(179, 309, 114, 142, idx + .7); img(330, 302, 102, 141, idx + 1.4); idx += 3;
  text(45, 628, 'For you', 36, idx++);
  img(49, 655, 109, 143, idx); img(193, 649, 109, 142, idx + .7); img(340, 641, 104, 139, idx + 1.4); idx += 3;
  line(28, 893, 466, 889, idx++);
  { const x = 88, y = 958, i = idx++; line(x - 16, y - 2, x, y - 17, i); line(x, y - 17, x + 16, y - 2, i); rect(x - 12, y - 4, 24, 20, i); for (let k = 0; k < 6; k++) line(x - 11 + k * 4, y + 15, x - 6 + k * 4, y - 3, i + .4, 'sk lt'); }
  mag(193, 953, 11, idx++);
  { const i = idx++; rect(289, 946, 26, 24, i); ellipse(302, 942, 7, 6, i, 'sk', .55); }
  { const i = idx++; ellipse(409, 940, 9, 9.5, i); line(392, 975, 398, 960, i); line(398, 960, 420, 960, i); line(420, 960, 426, 975, i); }
  const N = idx;
  items.forEach(o => { if (o.kind === 'text') o.el.style.clipPath = 'inset(0 100% 0 0)'; });

  function drawSketch(k) {           // k: 0..1
    const t = k * (N + 2);
    items.forEach(o => {
      const v = Math.min(1, Math.max(0, (t - o.i) / 2.2));
      if (o.kind === 'text') o.el.style.clipPath = `inset(-20% ${((1 - v) * 100).toFixed(1)}% -20% 0)`;
      else { o.el.style.strokeDashoffset = (1 - v).toFixed(3); o.el.style.visibility = v > 0 ? 'visible' : 'hidden'; }
    });
  }

  /* ---- scroll timeline ---- */
  const pin = sec.querySelector('.s2s-pin');
  function prog() {
    const r = sec.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    return { pre: R(innerHeight - r.top, innerHeight * .1, innerHeight * .95), p: R(top - r.top, 0, sec.offsetHeight - pin.offsetHeight) };
  }
  let cur = 0, curPre = 0, lastK = -1;
  function paint(pre, p) {
    const v = (n, x) => sec.style.setProperty(n, x.toFixed(4));
    v('--pre', pre);
    v('--g', ease(R(p, .03, .13)));
    v('--q', ease(R(p, .17, .25)));
    v('--pp', ease(R(p, .19, .25)));
    const k = R(p, .22, .38); if (Math.abs(k - lastK) > .0005) { drawSketch(k); lastK = k; }
    v('--s', ease(R(p, .45, .54)));
    v('--d', R(p, .46, .6));
    v('--c', ease(R(p, .64, .75)));
    v('--f', ease(R(p, .8, .93)));
    v('--t', ease(R(p, .88, .93)));
    v('--h', ease(R(p, .91, .95)));
    v('--m1', ease(R(p, .93, .96)));
    v('--m2', ease(R(p, .95, .975)));
    v('--m3', ease(R(p, .965, .99)));
    v('--m4', ease(R(p, .98, 1)));
    sec.classList.toggle('is-end', p > .99);
    const st = p < .2 ? 0 : p < .43 ? 1 : p < .62 ? 2 : p < .78 ? 3 : 4;
    steps.forEach((s, i) => s.classList.toggle('on', i === st));
    btns.forEach((b, i) => b.classList.toggle('on', i === st));
  }
  (function loop() {
    const t = prog();
    cur = smooth ? cur + (t.p - cur) * .12 : t.p;  if (Math.abs(t.p - cur) < .0005) cur = t.p;
    curPre = smooth ? curPre + (t.pre - curPre) * .12 : t.pre;
    paint(curPre, cur);
    requestAnimationFrame(loop);
  })();
  btns.forEach(b => b.addEventListener('click', () => {
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const y = scrollY + sec.getBoundingClientRect().top - top + (+b.dataset.p) * (sec.offsetHeight - pin.offsetHeight);
    scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }));
})();

/* Plant B thumbnail: pinned, the title comes up and the phones arrive one by one */
(function () {
  const sec = document.getElementById('pbs');
  if (!sec) return;
  const pin = sec.querySelector('.pbs-pin');
  const R = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  const ease = x => x * x * (3 - 2 * x);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;
  function paint() {
    ticking = false;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const span = sec.offsetHeight - pin.offsetHeight;
    const p = reduce ? 1 : R(top - sec.getBoundingClientRect().top, 0, span);
    const set = (k, v) => sec.style.setProperty(k, v.toFixed(4));
    set('--h', ease(R(p, 0.0, 0.12)));
    set('--m1', ease(R(p, 0.14, 0.34)));
    set('--m2', ease(R(p, 0.30, 0.50)));
    set('--m3', ease(R(p, 0.46, 0.66)));
    set('--m4', ease(R(p, 0.62, 0.82)));
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  paint();
})();

/* Copy email address */
(function () {
  const btn = document.querySelector('.copy-btn');
  if (!btn) return;
  const tip = btn.querySelector('.copy-btn__tip');
  let t;
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }
  btn.addEventListener('click', async () => {
    const ok = await copy(btn.dataset.copy);
    tip.textContent = ok ? 'Copied' : 'Couldn\u2019t copy, tap the address instead';
    btn.classList.toggle('is-copied', ok);
    btn.classList.add('is-tip');
    clearTimeout(t);
    t = setTimeout(() => { btn.classList.remove('is-copied', 'is-tip'); tip.textContent = ''; }, 1800);
  });
})();
