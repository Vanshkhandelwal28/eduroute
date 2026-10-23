import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './device.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scroll wired to GSAP ScrollTrigger.
 * Disabled when prefers-reduced-motion.
 */
export default class SmoothScroll {
  constructor() {
    this.lenis = null;
    this._raf = null;
    this.enabled = !prefersReducedMotion();

    if (!this.enabled) return;

    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop: (value) => {
        if (arguments.length) {
          this.lenis.scrollTo(value, { immediate: true });
        }
        return this.lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
    });

    ScrollTrigger.defaults({ scroller: document.body });

    this._tick = this._tick.bind(this);
    this._tick(0);
  }

  _tick(time) {
    this.lenis?.raf(time);
    this._raf = requestAnimationFrame(this._tick);
  }

  scrollTo(target, opts = {}) {
    if (this.lenis) {
      this.lenis.scrollTo(target, { duration: 1.4, ...opts });
    } else {
      window.scrollTo({ top: typeof target === 'number' ? target : 0, behavior: 'smooth' });
    }
  }

  resize() {
    this.lenis?.resize();
    ScrollTrigger.refresh();
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.lenis?.destroy();
    this.lenis = null;
    ScrollTrigger.scrollerProxy(document.body, {});
  }
}
