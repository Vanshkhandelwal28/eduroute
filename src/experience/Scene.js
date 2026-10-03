import * as THREE from 'three';

/**
 * Scene — holds the Three.js scene graph.
 * Particles, morph targets and post-processing will be added in later phases.
 */
export default class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x000000);
    this.instance.fog = new THREE.Fog(0x000000, 8, 22);
  }

  add(object) {
    this.instance.add(object);
  }

  update() {
    // Placeholder for future scene updates
  }
}
