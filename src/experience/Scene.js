import * as THREE from 'three';

/**
 * Scene — Dala purple background + soft far fog.
 * Matches craftedbygc Dala hero atmosphere.
 */
export default class Scene {
  constructor() {
    this.instance = new THREE.Scene();
    // Dala purple: #3c184c deep, #692a84 mid
    this.instance.background = new THREE.Color(0x3c184c);
    this.instance.fog = new THREE.Fog(0x3c184c, 10, 26);
  }

  add(object) {
    this.instance.add(object);
  }

  update() {}
}
