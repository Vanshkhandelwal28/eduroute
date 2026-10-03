import * as THREE from 'three';
import { getCappedDPR } from './utils/device.js';

/**
 * Renderer — DPR-capped WebGL renderer for post-processing compatibility.
 */
export default class Renderer {
  constructor({ canvas, sizes }) {
    this.canvas = canvas;
    this.sizes = sizes;

    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });

    this.instance.setClearColor(0x000000, 1);
    this.instance.setPixelRatio(getCappedDPR());
    this.instance.setSize(this.sizes.width, this.sizes.height);

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 0.95;
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(getCappedDPR());
  }

  update(scene, camera) {
    this.instance.render(scene, camera);
  }

  dispose() {
    this.instance.dispose();
  }
}
