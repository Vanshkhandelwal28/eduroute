import * as THREE from 'three';

/**
 * Scene — holds the Three.js scene graph.
 * Particles are added by the Particles module via scene.add().
 */
export default class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x000000);
    // Softer fog so the brain silhouette reads clearly
    this.instance.fog = new THREE.Fog(0x000000, 6, 18);
  }

  add(object) {
    this.instance.add(object);
  }

  update() {
    // Placeholder for future scene updates
  }
}
