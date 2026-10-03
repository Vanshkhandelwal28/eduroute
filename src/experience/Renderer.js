import * as THREE from 'three';

/**
 * Renderer — WebGL renderer configured for post-processing (tone mapping required by UnrealBloomPass).
 */
export default class Renderer {
  constructor({ canvas, sizes }) {
    this.canvas = canvas;
    this.sizes = sizes;

    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false, // opaque black — better for bloom pipeline
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });

    this.instance.setClearColor(0x000000, 1);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.instance.setSize(this.sizes.width, this.sizes.height);

    // Required for UnrealBloomPass
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 0.95;
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  }

  /** Direct render fallback when post-processing is unavailable. */
  update(scene, camera) {
    this.instance.render(scene, camera);
  }

  dispose() {
    this.instance.dispose();
  }
}
