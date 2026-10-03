import * as THREE from 'three';
import Scene from './Scene.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import Particles from './particles/Particles.js';
import MouseInteraction from './interaction/MouseInteraction.js';

/**
 * Experience — top-level orchestrator for the WebGL layer.
 * Phase 2–4: scene, particles, GPU sim.
 * Phase 5: mouse interaction.
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

    // Core systems
    this.scene = new Scene();
    this.camera = new Camera({ sizes: this.sizes });
    this.renderer = new Renderer({ canvas: this.canvas, sizes: this.sizes });

    // Phase 3 + 4 — particles with GPU simulation
    this.particles = new Particles({
      scene: this.scene,
      renderer: this.renderer.instance,
    });

    // Phase 5 — mouse interaction
    this.mouse = new MouseInteraction({
      camera: this.camera.instance,
      sizes: this.sizes,
    });

    // Bind methods
    this.onResize = this.onResize.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.tick = this.tick.bind(this);

    // Events
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // Start loop
    this.tick();
  }

  onResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    this.camera.resize();
    this.renderer.resize();
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

    this.camera.update();
    this.scene.update();

    // Mouse → smooth → world
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
