/**
 * Minimal custom cursor — desktop only.
 * States: default | link | cta
 */
export default class Cursor {
  constructor() {
    this.enabled =
      typeof window !== 'undefined' &&
      !('ontouchstart' in window) &&
      navigator.maxTouchPoints === 0 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!this.enabled) return;

    this.el = document.createElement('div');
    this.el.className = 'er-cursor';
    this.el.innerHTML = '<div class="er-cursor__dot"></div>';
    document.body.appendChild(this.el);
    document.documentElement.classList.add('er-has-cursor');

    this.x = 0;
    this.y = 0;
    this.tx = 0;
    this.ty = 0;

    this._onMove = this._onMove.bind(this);
    this._onOver = this._onOver.bind(this);
    this._onOut = this._onOut.bind(this);
    this._tick = this._tick.bind(this);

    window.addEventListener('pointermove', this._onMove, { passive: true });
    document.addEventListener('pointerover', this._onOver, { passive: true });
    document.addEventListener('pointerout', this._onOut, { passive: true });

    this._raf = requestAnimationFrame(this._tick);
  }

  _onMove(e) {
    this.tx = e.clientX;
    this.ty = e.clientY;
  }

  _onOver(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.closest('.er-btn--primary, .er-nav__cta')) {
      this.el.classList.add('is-cta');
      this.el.classList.remove('is-link');
    } else if (
      t.closest('a, button, .er-btn, .er-nav__links a, .er-footer__links a')
    ) {
      this.el.classList.add('is-link');
      this.el.classList.remove('is-cta');
    }
  }

  _onOut(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (
      t.closest(
        'a, button, .er-btn, .er-nav__cta, .er-nav__links a, .er-footer__links a'
      )
    ) {
      this.el.classList.remove('is-link', 'is-cta');
    }
  }

  _tick() {
    this.x += (this.tx - this.x) * 0.22;
    this.y += (this.ty - this.y) * 0.22;
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    this._raf = requestAnimationFrame(this._tick);
  }

  dispose() {
    if (!this.enabled) return;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('pointermove', this._onMove);
    document.removeEventListener('pointerover', this._onOver);
    document.removeEventListener('pointerout', this._onOut);
    this.el?.remove();
    document.documentElement.classList.remove('er-has-cursor');
  }
}
