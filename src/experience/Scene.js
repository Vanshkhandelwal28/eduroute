import * as THREE from 'three';

/**
 * Scene — pure black background matching live Dala.
 * No purple wash; particles read with maximum contrast.
 */
export default class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    this.instance.background = new THREE.Color(0x000000);
    // Soft far fog still black so edges dissolve cleanly
    this.instance.fog = new THREE.Fog(0x000000, 12, 28);
  }

  add(object) {
    this.instance.add(object);
  }

  update() {}
}
