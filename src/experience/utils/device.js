/**
 * Device capability helpers.
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
 * Particle counts — denser on capable desktop for volumetric feel.
 * Desktop 12k–20k · Tablet 5k–8k · Mobile 2k–4k
 */
export function getParticleCount() {
  if (typeof window === 'undefined') return 14000;

  if (prefersReducedMotion()) {
    const w = window.innerWidth;
    if (w < 768) return 2048;
    if (w < 1024) return 4096;
    return 6144;
  }

  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;

  if (w < 640 || (isTouchDevice() && w < 768)) {
    return cores <= 4 ? 2048 : 4096;
  }

  if (w < 1024) {
    return cores <= 4 || dpr > 2 ? 5120 : 8192;
  }

  // Desktop denser for volumetric structure
  if (cores <= 4 || dpr > 2) return 12288;
  if (cores >= 8 && w >= 1440) return 20480;
  return 16384;
}

export function getCappedDPR() {
  if (typeof window === 'undefined') return 1;
  const raw = window.devicePixelRatio || 1;
  const w = window.innerWidth;

  if (w < 768 || isTouchDevice()) return Math.min(raw, 1.25);
  if (w < 1200) return Math.min(raw, 1.5);
  return Math.min(raw, 1.75);
}

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
