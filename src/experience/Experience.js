import * as THREE from 'three';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Scene from './Scene.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import Particles from './particles/Particles.js';
import MouseInteraction from './interaction/MouseInteraction.js';
import TimelineController from './animation/Timeline.js';
import PostProcessing from './postprocessing/PostProcessing.js';
import SmoothScroll from './utils/SmoothScroll.js';
import {
  isWebGLAvailable,
  prefersReducedMotion,
} from './utils/device.js';

/**
 * Experience — single cinematic system.
 * Lenis + GPU particles + morph timeline + post.
 * Hero opens on brain; scroll drives the full story.
 */
export default class Experience {
  constructor({ canvas, onProgress } = {}) {
    if (!canvas) return;

    this.canvas = canvas;
    this.onProgress = typeof onProgress === 'function' ? onProgress : () => {};
    this.webglOk = isWebGLAvailable();
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this._readyResolve = null;
    this.ready = new Promise((r) => {
      this._readyResolve = r;
    });

    if (!this.webglOk) {
      this._showFallback();
      this.onProgress(1);
      this._readyResolve?.();
      return;
    }

    this.onProgress(0.1);

    this.clock = new THREE.Clock();
    this.isVisible = true;
    this._prevTime = 0;
    this._running = false;
    this._resizeTimer = null;
    this.reducedMotion = prefersReducedMotion();
    this._frames = 0;

    this.smoothScroll = new SmoothScroll();
    this.onProgress(0.2);

    this.scene = new Scene();
    this.camera = new Camera({ sizes: this.sizes });
    this.renderer = new Renderer({ canvas: this.canvas, sizes: this.sizes });
    this.onProgress(0.35);

    this.particles = new Particles({
      scene: this.scene,
      renderer: this.renderer.instance,
    });

    // Center structure for hero readability
    if (this.particles.mesh) {
      this.particles.mesh.position.set(0.55, 0.08, 0);
    }
    this.onProgress(0.55);

    if (this.reducedMotion && this.particles.morph) {
      this.particles.morph.params.noiseStrength = 0.03;
      this.particles.morph.params.scatter = 0;
      this.particles.morph.params.turbulence = 0.04;
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
    this.onProgress(0.75);

    this.timeline = null;
    requestAnimationFrame(() => {
      this.timeline = new TimelineController({ experience: this });
      this.onProgress(0.9);
      ScrollTrigger.refresh();
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

    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      this.camera.resize();
      this.renderer.resize();
      this.post?.resize();
      this.smoothScroll?.resize();

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

    this._frames += 1;
    if (this._frames === 8) {
      this.onProgress(1);
      this._readyResolve?.();
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

    this.smoothScroll?.destroy();
    this.smoothScroll = null;

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
