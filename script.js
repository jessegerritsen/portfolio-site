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

if (introEl && dropEl) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dropEl.remove();
    introEl.remove();
    if (heroBlobEl) heroBlobEl.classList.add('is-visible');
    if (heroOrbitEl) heroOrbitEl.classList.add('is-visible');
  } else {
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

// Interactive logo process (Tiny Rocket): hover a reference circle to swap its caption
document.querySelectorAll('.logo-process').forEach(root => {
  const circles = root.querySelectorAll('.logo-process__circle');
  const caption = root.querySelector('.logo-process__caption');
  circles.forEach(circle => {
    circle.addEventListener('mouseenter', () => {
      circles.forEach(c => c.classList.remove('is-active'));
      circle.classList.add('is-active');
      if (caption) caption.textContent = circle.dataset.caption;
    });
    circle.addEventListener('focus', () => circle.dispatchEvent(new Event('mouseenter')));
  });
});
