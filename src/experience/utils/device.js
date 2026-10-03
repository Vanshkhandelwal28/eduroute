/**
 * Phase 10 — Device capability helpers.
 * Single source of truth for particle counts, DPR caps, quality tiers.
 */

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isWebGLAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/**
 * Particle counts:
 * Desktop 10k–16k · Tablet 4k–8k · Mobile 2k–4k
 */
export function getParticleCount() {
  if (typeof window === 'undefined') return 12000;

  if (prefersReducedMotion()) {
    // Still show structure, fewer particles
    const w = window.innerWidth;
    if (w < 768) return 2048;
    if (w < 1024) return 4096;
    return 6144;
  }

  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;

  if (w < 640 || (isTouchDevice() && w < 768)) {
    // Mobile: 2k–4k
    return cores <= 4 ? 2048 : 3072;
  }

  if (w < 1024) {
    // Tablet: 4k–8k
    return cores <= 4 || dpr > 2 ? 4096 : 6144;
  }

  // Desktop: 10k–16k
  if (cores <= 4 || dpr > 2) return 10240;
  if (cores >= 8 && w >= 1440) return 15360;
  return 12288;
}

/**
 * Capped device pixel ratio.
 * Desktop max ~1.75 · Mobile max ~1.25
 */
export function getCappedDPR() {
  if (typeof window === 'undefined') return 1;
  const raw = window.devicePixelRatio || 1;
  const w = window.innerWidth;

  if (w < 768 || isTouchDevice()) {
    return Math.min(raw, 1.25);
  }
  if (w < 1200) {
    return Math.min(raw, 1.5);
  }
  return Math.min(raw, 1.75);
}

/** Post-processing quality tier. */
export function getPostQuality() {
  if (typeof window === 'undefined') return 'HIGH';
  if (prefersReducedMotion()) return 'LOW';

  const w = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 4;

  if (w < 768 || (isTouchDevice() && w < 1024)) return 'LOW';
  if (w < 1200 || dpr > 2 || cores <= 4) return 'MEDIUM';
  return 'HIGH';
}
