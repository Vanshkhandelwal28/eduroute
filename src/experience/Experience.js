import * as THREE from 'three';
import Scene from './Scene.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import Particles from './particles/Particles.js';
import MouseInteraction from './interaction/MouseInteraction.js';
import TimelineController from './animation/Timeline.js';
import PostProcessing from './postprocessing/PostProcessing.js';
import {
  isWebGLAvailable,
  prefersReducedMotion,
} from './utils/device.js';

/**
 * Experience — orchestrator with WebGL fallback + performance guards.
 */
export default class Experience {
  constructor({ canvas }) {
    if (!canvas) {
      console.error('[Experience] canvas element is required');
      return;
    }

    this.canvas = canvas;
    this.webglOk = isWebGLAvailable();
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Static fallback when WebGL is unavailable
    if (!this.webglOk) {
      this._showFallback();
      return;
    }

    this.clock = new THREE.Clock();
    this.isVisible = true;
    this._prevTime = 0;
    this.reducedMotion = prefersReducedMotion();

    this.scene = new Scene();
    this.camera = new Camera({ sizes: this.sizes });
    this.renderer = new Renderer({ canvas: this.canvas, sizes: this.sizes });

    this.particles = new Particles({
      scene: this.scene,
      renderer: this.renderer.instance,
    });

    // Soften particle motion under reduced-motion
    if (this.reducedMotion && this.particles.morph) {
      this.particles.morph.params.noiseStrength = 0.03;
      this.particles.morph.params.scatter = 0;
      this.particles.morph.params.turbulence = 0.05;
      this.particles.morph.params.springStrength = 6;
    }

    this.mouse = new MouseInteraction({
      camera: this.camera.instance,
      sizes: this.sizes,
    });

    this.post = new PostProcessing({
      renderer: this.renderer.instance,
      scene: this.scene.instance,
      camera: this.camera.instance,
      sizes: this.sizes,
    });

    this.timeline = null;
    requestAnimationFrame(() => {
      this.timeline = new TimelineController({ experience: this });
    });

    this.onResize = this.onResize.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);

    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.tick();
  }

  _showFallback() {
    // Hide broken canvas, rely on CSS dark background + DOM content
    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
    const landing = document.querySelector('.er-landing');
    if (landing) {
      landing.classList.add('er-no-webgl');
    }
  }

  onResize() {
    if (!this.webglOk) return;

    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    this.camera.resize();
    this.renderer.resize();
    this.post?.resize();

    if (this.timeline) {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        ScrollTrigger.refresh();
      });
    }
  }

  onVisibilityChange() {
    if (!this.webglOk) return;

    this.isVisible = document.visibilityState === 'visible';
    if (this.isVisible) {
      this.clock.start();
      this._prevTime = this.clock.getElapsedTime();
      this.tick();
    } else if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  tick() {
    if (!this.webglOk || !this.isVisible) return;

    const elapsed = this.clock.getElapsedTime();
    const delta = Math.min(elapsed - this._prevTime, 0.05);
    this._prevTime = elapsed;

    if (this.timeline) {
      this.timeline.update();
    }

    this.camera.update(delta);
    this.scene.update();

    if (this.mouse) {
      this.mouse.update(delta);
    }

    if (this.particles) {
      this.particles.update(elapsed, delta, this.mouse);
    }

    if (this.post && this.camera?.instance) {
      this.post.setFocus(this.camera.instance.position.length());
    }

    const rendered = this.post?.render(elapsed);
    if (!rendered) {
      this.renderer.update(this.scene.instance, this.camera.instance);
    }

    this.animationId = requestAnimationFrame(this.tick);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.timeline) {
      this.timeline.destroy();
      this.timeline = null;
    }

    if (this.post) {
      this.post.dispose();
      this.post = null;
    }

    if (this.mouse) {
      this.mouse.dispose();
      this.mouse = null;
    }

    if (this.particles) {
      this.particles.dispose();
      this.particles = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.scene?.instance) {
      this.scene.instance.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
  }
}
