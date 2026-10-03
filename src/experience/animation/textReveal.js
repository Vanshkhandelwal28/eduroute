import gsap from 'gsap';

/**
 * Reusable text reveal helpers for TimelineController.
 * Expects structure: .er-reveal > span  (overflow hidden wrapper)
 */

/**
 * Reveal lines inside overflow-hidden wrappers.
 * @param {Element|NodeList|string} targets
 * @param {object} opts  gsap tween overrides
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
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.08,
      ...opts,
    }
  );
}

/**
 * Reveal each direct child span of .er-reveal wrappers in a section.
 */
export function revealLines(sectionSelector, opts = {}) {
  const section = document.querySelector(sectionSelector);
  if (!section) return gsap.timeline();

  const spans = section.querySelectorAll('.er-reveal > span');
  return revealText(spans, opts);
}

/**
 * Split text into words (if not already) and reveal.
 * Safe no-op if already structured with .er-reveal.
 */
export function revealWords(selector, opts = {}) {
  const el = document.querySelector(selector);
  if (!el) return gsap.timeline();

  // If already using er-reveal structure, delegate
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
  return revealText(spans, { stagger: 0.04, ...opts });
}
