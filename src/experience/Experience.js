import * as THREE from 'three';
import Scene from './Scene.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';

/**
 * Experience — top-level orchestrator for the WebGL layer.
 * Phase 2: canvas, scene, camera, renderer + animation loop.
 * Later phases will add particles, GPU compute, mouse, scroll, post-processing.
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

    // Core systems
    this.scene = new Scene();
    this.camera = new Camera({ sizes: this.sizes });
    this.renderer = new Renderer({ canvas: this.canvas, sizes: this.sizes });

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
      this.tick();
    }
  }

  tick() {
    if (!this.isVisible) return;

    const elapsed = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    this.camera.update();
    this.scene.update();
    this.renderer.update(this.scene.instance, this.camera.instance);

    this.animationId = requestAnimationFrame(this.tick);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.renderer.dispose();

    // Dispose scene resources in later phases
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
