import * as THREE from 'three';

/**
 * Scene — black background, soft far fog (does not eat the particle structure).
 */
export default class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x000000);
    // Far fog only — near particles stay sharp
    this.instance.fog = new THREE.Fog(0x000000, 12, 28);
  }

  add(object) {
    this.instance.add(object);
  }

  update() {}
}
