import * as THREE from 'three';
import { getCappedDPR } from './utils/device.js';

/**
 * Renderer — pure black clear color matching live Dala.
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

    // Pure black — matches live Dala, maximum particle contrast
    this.instance.setClearColor(0x000000, 1);
    this.instance.setPixelRatio(getCappedDPR());
    this.instance.setSize(this.sizes.width, this.sizes.height);

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    // OutputPass in the composer handles tone mapping — do NOT enable here
    this.instance.toneMapping = THREE.NoToneMapping;
    this.instance.toneMappingExposure = 1.0;
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
