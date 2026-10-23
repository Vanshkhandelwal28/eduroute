import * as THREE from 'three';
import { generateAllShapes, SHAPE_NAMES } from './ShapeGenerator.js';

/**
 * Dual-target morph controller.
 * Shape pairs driven by scroll; GPU reads progress each frame.
 * Defaults tuned for rock-solid settle on pure black.
 */
export default class MorphSystem {
  constructor(count, texSize) {
    this.count = count;
    this.texSize = texSize;

    this.shapes = generateAllShapes(count);
    this.shapeNames = SHAPE_NAMES;

    this.shapeAName = 'brain';
    this.shapeBName = 'brain';
    this.morphProgress = 0;

    // Stronger spring + lower noise = silhouettes lock cleanly
    this.params = {
      morphProgress: 0,
      scatter: 0,
      turbulence: 0.08,
      springStrength: 4.6,
      noiseStrength: 0.06,
      morphSpeed: 1.0,
    };

    this.textureA = this._createTargetTexture(this.shapes.brain);
    this.textureB = this._createTargetTexture(this.shapes.brain);
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
   * Set morph pair. Resets progress to 0 so the new path starts clean.
   * @param {string} from
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

  setProgress(t) {
    this.morphProgress = Math.max(0, Math.min(1, t));
    this.params.morphProgress = this.morphProgress;
  }

  update() {
    if (Math.abs(this.params.morphProgress - this.morphProgress) > 0.0001) {
      this.morphProgress = this.params.morphProgress;
    }
  }

  getShape(name) {
    return this.shapes[name] || null;
  }

  dispose() {
    this.textureA?.dispose();
    this.textureB?.dispose();
  }
}
