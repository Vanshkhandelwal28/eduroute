import * as THREE from 'three';
import { generateAllShapes, SHAPE_NAMES } from './ShapeGenerator.js';

/**
 * Phase 6 — Reusable GPU morph controller.
 * Stores shape datasets, morph progress, and uploads dual target textures.
 * Designed to be driven by GSAP later (morphProgress 0→1).
 */
export default class MorphSystem {
  /**
   * @param {number} count
   * @param {number} texSize  GPU texture size
   */
  constructor(count, texSize) {
    this.count = count;
    this.texSize = texSize;

    this.shapes = generateAllShapes(count);
    this.shapeNames = SHAPE_NAMES;

    // Current pair
    this.shapeAName = 'brain';
    this.shapeBName = 'bulb';
    this.morphProgress = 0;

    // Exposed parameters (mutable for GSAP / external control)
    this.params = {
      morphProgress: 0,
      scatter: 0,
      turbulence: 0.15,
      springStrength: 4.5,
      noiseStrength: 0.12,
      morphSpeed: 1.0,
    };

    // Dual target textures for GPU
    this.textureA = this._createTargetTexture(this.shapes.brain);
    this.textureB = this._createTargetTexture(this.shapes.bulb);
  }

  _createTargetTexture(positions) {
    const data = new Float32Array(this.texSize * this.texSize * 4);
    for (let i = 0; i < this.texSize * this.texSize; i++) {
      const i4 = i * 4;
      if (i < this.count) {
        const i3 = i * 3;
        data[i4] = positions[i3];
        data[i4 + 1] = positions[i3 + 1];
        data[i4 + 2] = positions[i3 + 2];
        data[i4 + 3] = 1;
      }
    }
    const tex = new THREE.DataTexture(
      data,
      this.texSize,
      this.texSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }

  _upload(tex, positions) {
    const data = tex.image.data;
    for (let i = 0; i < this.count; i++) {
      const i4 = i * 4;
      const i3 = i * 3;
      data[i4] = positions[i3];
      data[i4 + 1] = positions[i3 + 1];
      data[i4 + 2] = positions[i3 + 2];
    }
    tex.needsUpdate = true;
  }

  /**
   * Set the morph pair by name.
   * @param {string} from  'brain' | 'bulb' | 'globe' | 'network'
   * @param {string} to
   */
  setPair(from, to) {
    if (!this.shapes[from] || !this.shapes[to]) {
      console.warn('[MorphSystem] unknown shape', from, to);
      return;
    }
    this.shapeAName = from;
    this.shapeBName = to;
    this._upload(this.textureA, this.shapes[from]);
    this._upload(this.textureB, this.shapes[to]);
    this.params.morphProgress = 0;
    this.morphProgress = 0;
  }

  /**
   * Set morph progress 0–1 (will be read by GPU each frame).
   * @param {number} t
   */
  setProgress(t) {
    this.morphProgress = Math.max(0, Math.min(1, t));
    this.params.morphProgress = this.morphProgress;
  }

  /**
   * Animate progress toward a value (simple internal lerp).
   * GSAP can drive setProgress directly instead.
   */
  update(delta) {
    // If external systems set params.morphProgress, sync
    if (Math.abs(this.params.morphProgress - this.morphProgress) > 0.0001) {
      this.morphProgress = this.params.morphProgress;
    }
  }

  /** Get shape positions by name. */
  getShape(name) {
    return this.shapes[name] || null;
  }

  dispose() {
    this.textureA?.dispose();
    this.textureB?.dispose();
  }
}
