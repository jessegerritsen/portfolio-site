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
  dropEl.style.opacity = '.16';
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
    setTimeout(() => introEl.classList.remove('is-text-visible'), 2400);
    setTimeout(() => dropEl.classList.add('is-covering'), 2800); // slow, 1.6s grow
    // Restore scrolling before measuring/settling into the target, so the
    // scrollbar's width is already accounted for and the handoff can't jump.
    setTimeout(() => { document.documentElement.style.overflow = ''; }, 4350);
    setTimeout(() => {
      introEl.classList.add('is-hidden'); // page fades in
      dropEl.classList.add('is-behind'); // drop tucks behind hero content right as it appears
    }, 4400);
    setTimeout(settleDropIntoHero, 4400); // same drop shrinks into the hero blob's spot
    setTimeout(revealHeroBlob, 5500);
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
  const pos = window.scrollY + window.innerHeight / 3;
  let current = sections[0];
  sections.forEach(sec => {
    if (sec && sec.offsetTop <= pos) current = sec;
  });
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
// that also auto-advances one tile at a time, pausing while the visitor interacts
function initPhoneMarquee(root) {
  const tiles = Array.from(root.querySelectorAll('.phone-tile'));
  if (tiles.length < 2) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;
  let resumeTimer = null;

  function tileAdvance() {
    const gap = parseFloat(getComputedStyle(tiles[0].parentElement).gap) || 0;
    return tiles[0].getBoundingClientRect().width + gap;
  }
  function step() {
    const atEnd = root.scrollLeft + root.clientWidth >= root.scrollWidth - 4;
    root.scrollTo({ left: atEnd ? 0 : root.scrollLeft + tileAdvance(), behavior: 'smooth' });
  }
  function start() {
    if (reduceMotion || timer) return;
    timer = setInterval(step, 2800);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  function deferResume() {
    stop();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(start, 3500);
  }

  root.addEventListener('touchstart', deferResume, { passive: true });
  root.addEventListener('wheel', deferResume, { passive: true });
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

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
