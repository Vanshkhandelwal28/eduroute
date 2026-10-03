import * as THREE from 'three';
import Scene from './Scene.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import Particles from './particles/Particles.js';
import MouseInteraction from './interaction/MouseInteraction.js';
import TimelineController from './animation/Timeline.js';

/**
 * Experience — orchestrator.
 * Phase 2–6: scene, particles, GPU, mouse, morph.
 * Phase 7: TimelineController (GSAP ScrollTrigger).
 */
export default class Experience {
  constructor({ canvas }) {
    if (!canvas) {
      console.error('[Experience] canvas element is required');
      return;
    }

    this.canvas = canvas;
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.clock = new THREE.Clock();
    this.isVisible = true;
    this._prevTime = 0;

    this.scene = new Scene();
    this.camera = new Camera({ sizes: this.sizes });
    this.renderer = new Renderer({ canvas: this.canvas, sizes: this.sizes });

    this.particles = new Particles({
      scene: this.scene,
      renderer: this.renderer.instance,
    });

    this.mouse = new MouseInteraction({
      camera: this.camera.instance,
      sizes: this.sizes,
    });

    // Phase 7 — central scroll timeline (after DOM sections exist)
    // Delay one frame so React has committed section elements
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

  onResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    this.camera.resize();
    this.renderer.resize();

    // Refresh ScrollTrigger after resize
    if (this.timeline) {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        ScrollTrigger.refresh();
      });
    }
  }

  onVisibilityChange() {
    this.isVisible = document.visibilityState === 'visible';
    if (this.isVisible) {
      this.clock.start();
      this._prevTime = this.clock.getElapsedTime();
      this.tick();
    }
  }

  tick() {
    if (!this.isVisible) return;

    const elapsed = this.clock.getElapsedTime();
    const delta = Math.min(elapsed - this._prevTime, 0.05);
    this._prevTime = elapsed;

    // Timeline drives camera + morph params
    if (this.timeline) {
      this.timeline.update();
    }

    this.camera.update();
    this.scene.update();

    if (this.mouse) {
      this.mouse.update(delta);
    }

    if (this.particles) {
      this.particles.update(elapsed, delta, this.mouse);
    }

    this.renderer.update(this.scene.instance, this.camera.instance);

    this.animationId = requestAnimationFrame(this.tick);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.timeline) {
      this.timeline.destroy();
      this.timeline = null;
    }

    if (this.mouse) {
      this.mouse.dispose();
      this.mouse = null;
    }

    if (this.particles) {
      this.particles.dispose();
      this.particles = null;
    }

    this.renderer.dispose();

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
