import * as THREE from 'three';
import { getCappedDPR } from './utils/device.js';

/**
 * Renderer for EffectComposer pipeline.
 * IMPORTANT: toneMapping must be NoToneMapping when OutputPass is used,
 * otherwise tone mapping is applied twice and the image washes out / clips.
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
