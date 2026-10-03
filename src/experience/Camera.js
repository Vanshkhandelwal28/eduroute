import * as THREE from 'three';

/**
 * Camera — cinematic perspective camera.
 * Positioned to frame the brain particle structure.
 */
export default class Camera {
  constructor({ sizes }) {
    this.sizes = sizes;

    this.instance = new THREE.PerspectiveCamera(
      42,
      this.sizes.width / this.sizes.height,
      0.1,
      50
    );

    // Frame the brain shape (roughly unit-sized, slightly elongated)
    this.instance.position.set(0, 0.15, 4.2);
    this.instance.lookAt(0, 0.08, 0);
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    // Placeholder for future camera choreography
  }
}
