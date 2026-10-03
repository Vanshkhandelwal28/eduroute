import * as THREE from 'three';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
 * Experience — single animation loop, single source of truth.
 * Final integration: debounced resize, no duplicate RAF, full dispose.
 */
export default class Experience {
  constructor({ canvas }) {
    if (!canvas) return;

    this.canvas = canvas;
    this.webglOk = isWebGLAvailable();
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    if (!this.webglOk) {
      this._showFallback();
      return;
    }

    this.clock = new THREE.Clock();
    this.isVisible = true;
    this._prevTime = 0;
    this._running = false;
    this._resizeTimer = null;
    this.reducedMotion = prefersReducedMotion();

    this.scene = new Scene();
    this.camera = new Camera({ sizes: this.sizes });
    this.renderer = new Renderer({ canvas: this.canvas, sizes: this.sizes });

    this.particles = new Particles({
      scene: this.scene,
      renderer: this.renderer.instance,
    });

    // Offset structure to the right so hero typography has clear left space
    if (this.particles.mesh) {
      this.particles.mesh.position.set(1.15, 0.05, 0);
    }

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
    // Build timeline after first paint so DOM sections exist
    requestAnimationFrame(() => {
      this.timeline = new TimelineController({ experience: this });
    });

    this.onResize = this.onResize.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);

    window.addEventListener('resize', this.onResize, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this._running = true;
    this.tick();
  }

  _showFallback() {
    if (this.canvas) this.canvas.style.display = 'none';
    document.querySelector('.er-landing')?.classList.add('er-no-webgl');
  }

  onResize() {
    if (!this.webglOk) return;

    // Debounce — avoid thrashing ScrollTrigger + composer
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      this.camera.resize();
      this.renderer.resize();
      this.post?.resize();

      ScrollTrigger.refresh();
    }, 120);
  }

  onVisibilityChange() {
    if (!this.webglOk) return;

    this.isVisible = document.visibilityState === 'visible';
    if (this.isVisible) {
      this.clock.start();
      this._prevTime = this.clock.getElapsedTime();
      if (!this._running) {
        this._running = true;
        this.tick();
      }
    } else {
      this._running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }

  tick() {
    if (!this.webglOk || !this.isVisible || !this._running) return;

    const elapsed = this.clock.getElapsedTime();
    const delta = Math.min(elapsed - this._prevTime, 0.05);
    this._prevTime = elapsed;

    this.timeline?.update();
    this.camera.update(delta);
    this.scene.update();
    this.mouse?.update(delta);
    this.particles?.update(elapsed, delta, this.mouse);

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
    this._running = false;
    clearTimeout(this._resizeTimer);

    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.timeline?.destroy();
    this.timeline = null;

    this.post?.dispose();
    this.post = null;

    this.mouse?.dispose();
    this.mouse = null;

    this.particles?.dispose();
    this.particles = null;

    this.renderer?.dispose();

    this.scene?.instance?.traverse((obj) => {
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
