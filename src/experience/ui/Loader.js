import gsap from 'gsap';

/**
 * Minimal loader that fades into the first WebGL frame.
 */
export default class Loader {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'er-loader';
    this.el.innerHTML = `
      <div class="er-loader__inner">
        <p class="er-loader__brand">EduRoute</p>
        <div class="er-loader__bar"><span></span></div>
      </div>
    `;
    document.body.appendChild(this.el);

    // Animate bar while waiting
    gsap.to(this.el.querySelector('.er-loader__bar span'), {
      scaleX: 1,
      duration: 1.4,
      ease: 'power2.inOut',
    });
  }

  /**
   * Fade out into the scene.
   * @returns {Promise<void>}
   */
  dismiss() {
    return new Promise((resolve) => {
      gsap.to(this.el, {
        opacity: 0,
        duration: 0.9,
        ease: 'power2.inOut',
        delay: 0.15,
        onComplete: () => {
          this.el.remove();
          resolve();
        },
      });
    });
  }

  dispose() {
    this.el?.remove();
  }
}
