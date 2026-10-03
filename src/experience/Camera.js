import * as THREE from 'three';

/**
 * Camera — cinematic perspective camera.
 * Position / FOV driven by TimelineController state each frame.
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

    this.instance.position.set(0, 0.15, 4.2);
    this.instance.lookAt(0, 0.08, 0);

    // Defaults used until Timeline takes over
    this.target = {
      x: 0,
      y: 0.15,
      z: 4.2,
      lookX: 0,
      lookY: 0.08,
      lookZ: 0,
      fov: 42,
    };
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    // TimelineController writes position directly;
    // this method kept for Experience.tick compatibility.
  }
}
