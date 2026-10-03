import gsap from 'gsap';

/**
 * Line reveals — consistent timing for major headings.
 * Structure: .er-reveal > span
 */

export function revealText(targets, opts = {}) {
  const els =
    typeof targets === 'string'
      ? document.querySelectorAll(targets)
      : targets;

  return gsap.fromTo(
    els,
    { yPercent: 110, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      duration: 1.15,
      ease: 'power3.out',
      stagger: 0.1,
      ...opts,
    }
  );
}

export function revealLines(sectionSelector, opts = {}) {
  const section = document.querySelector(sectionSelector);
  if (!section) return gsap.timeline();

  const spans = section.querySelectorAll('.er-reveal > span');
  const body = section.querySelector('.er-body');
  const label = section.querySelector('.er-label');

  const tl = gsap.timeline();

  if (label) {
    tl.fromTo(
      label,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      0
    );
  }

  tl.add(revealText(spans, opts), label ? 0.12 : 0);

  if (body) {
    tl.fromTo(
      body,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' },
      '-=0.55'
    );
  }

  return tl;
}

export function revealWords(selector, opts = {}) {
  const el = document.querySelector(selector);
  if (!el) return gsap.timeline();

  const existing = el.querySelectorAll('.er-reveal > span');
  if (existing.length) return revealText(existing, opts);

  const text = el.textContent || '';
  const words = text.trim().split(/\s+/);
  el.innerHTML = words
    .map(
      (w) =>
        `<span class="er-reveal" style="display:inline-block;overflow:hidden;vertical-align:top"><span style="display:inline-block">${w}&nbsp;</span></span>`
    )
    .join('');

  const spans = el.querySelectorAll('.er-reveal > span');
  return revealText(spans, { stagger: 0.045, ...opts });
}
