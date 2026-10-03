import * as THREE from 'three';

/**
 * Camera — cinematic perspective camera with basic resize support.
 * Choreography (dolly / FOV / rotation) will be added in later phases.
 */
export default class Camera {
  constructor({ sizes }) {
    this.sizes = sizes;

    this.instance = new THREE.PerspectiveCamera(
      45,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );

    // Starting position — will be driven by scroll later
    this.instance.position.set(0, 0, 6);
    this.instance.lookAt(0, 0, 0);
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    // Placeholder for future camera choreography
  }
}
