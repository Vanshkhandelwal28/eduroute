import gsap from 'gsap';

/**
 * Progress-driven loader — waits for real readiness, not a fixed timer.
 */
export default class Loader {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'er-loader';
    this.el.innerHTML = `
      <div class="er-loader__inner">
        <p class="er-loader__brand">EduRoute</p>
        <div class="er-loader__bar"><span></span></div>
        <p class="er-loader__pct">0</p>
      </div>
    `;
    document.body.appendChild(this.el);

    this._bar = this.el.querySelector('.er-loader__bar span');
    this._pct = this.el.querySelector('.er-loader__pct');
    this._progress = 0;
    this._target = 0;
    this._ready = false;
    this._raf = null;

    this._tick = this._tick.bind(this);
    this._raf = requestAnimationFrame(this._tick);
  }

  /** Set progress 0–1 from external systems. */
  setProgress(t) {
    this._target = Math.max(this._target, Math.min(1, t));
  }

  _tick() {
    this._progress += (this._target - this._progress) * 0.08;
    if (this._bar) {
      this._bar.style.transform = `scaleX(${this._progress})`;
    }
    if (this._pct) {
      this._pct.textContent = String(Math.round(this._progress * 100));
    }
    this._raf = requestAnimationFrame(this._tick);
  }

  /**
   * Mark fully ready and dismiss when bar catches up.
   * @returns {Promise<void>}
   */
  async complete() {
    this._target = 1;
    this._ready = true;

    // Wait until visual progress is near 1
    await new Promise((resolve) => {
      const check = () => {
        if (this._progress > 0.97) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });

    return this.dismiss();
  }

  dismiss() {
    return new Promise((resolve) => {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      gsap.to(this.el, {
        opacity: 0,
        duration: 0.85,
        ease: 'power2.inOut',
        onComplete: () => {
          this.el.remove();
          resolve();
        },
      });
    });
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.el?.remove();
  }
}
