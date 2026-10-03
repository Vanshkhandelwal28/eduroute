import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import {
  velocityFragmentShader,
  positionFragmentShader,
} from '../shaders/computeShaders.js';

/**
 * Phase 4 — GPU particle simulation.
 * Phase 5 — mouse repulsion uniforms.
 */
export default class GPUCompute {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {Float32Array} targets  xyz * count
   * @param {number} count
   */
  constructor(renderer, targets, count) {
    this.renderer = renderer;
    this.count = count;

    this.texSize = Math.ceil(Math.sqrt(count));
    this.texSize = Math.pow(2, Math.ceil(Math.log2(this.texSize)));

    this.gpuCompute = new GPUComputationRenderer(
      this.texSize,
      this.texSize,
      renderer
    );

    const posTex = this.gpuCompute.createTexture();
    const posArr = posTex.image.data;

    const velTex = this.gpuCompute.createTexture();
    const velArr = velTex.image.data;

    const targetData = new Float32Array(this.texSize * this.texSize * 4);

    for (let i = 0; i < this.texSize * this.texSize; i++) {
      const i4 = i * 4;
      if (i < count) {
        const i3 = i * 3;
        const seed = Math.random();

        posArr[i4] = targets[i3];
        posArr[i4 + 1] = targets[i3 + 1];
        posArr[i4 + 2] = targets[i3 + 2];
        posArr[i4 + 3] = seed;

        velArr[i4] = 0;
        velArr[i4 + 1] = 0;
        velArr[i4 + 2] = 0;
        velArr[i4 + 3] = seed;

        targetData[i4] = targets[i3];
        targetData[i4 + 1] = targets[i3 + 1];
        targetData[i4 + 2] = targets[i3 + 2];
        targetData[i4 + 3] = 1;
      } else {
        posArr[i4] = 0;
        posArr[i4 + 1] = 0;
        posArr[i4 + 2] = 0;
        posArr[i4 + 3] = 0;
        velArr[i4] = 0;
        velArr[i4 + 1] = 0;
        velArr[i4 + 2] = 0;
        velArr[i4 + 3] = 0;
        targetData[i4] = 0;
        targetData[i4 + 1] = 0;
        targetData[i4 + 2] = 0;
        targetData[i4 + 3] = 0;
      }
    }

    this.targetTexture = new THREE.DataTexture(
      targetData,
      this.texSize,
      this.texSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.targetTexture.needsUpdate = true;
    this.targetTexture.minFilter = THREE.NearestFilter;
    this.targetTexture.magFilter = THREE.NearestFilter;

    this.positionVariable = this.gpuCompute.addVariable(
      'texturePosition',
      positionFragmentShader,
      posTex
    );
    this.velocityVariable = this.gpuCompute.addVariable(
      'textureVelocity',
      velocityFragmentShader,
      velTex
    );

    this.gpuCompute.setVariableDependencies(this.positionVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);
    this.gpuCompute.setVariableDependencies(this.velocityVariable, [
      this.positionVariable,
      this.velocityVariable,
    ]);

    const velUniforms = this.velocityVariable.material.uniforms;
    velUniforms.uTime = { value: 0 };
    velUniforms.uDelta = { value: 0.016 };
    velUniforms.uDamping = { value: 0.92 };
    velUniforms.uSpringStrength = { value: 4.5 };
    velUniforms.uNoiseStrength = { value: 0.12 };
    velUniforms.uTarget = { value: this.targetTexture };

    // Phase 5 — mouse
    velUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
    velUniforms.uMouseStrength = { value: 0 };
    velUniforms.uMouseRadius = { value: 1.1 };

    const posUniforms = this.positionVariable.material.uniforms;
    posUniforms.uDelta = { value: 0.016 };

    this.uniforms = {
      time: velUniforms.uTime,
      delta: velUniforms.uDelta,
      damping: velUniforms.uDamping,
      springStrength: velUniforms.uSpringStrength,
      noiseStrength: velUniforms.uNoiseStrength,
      target: velUniforms.uTarget,
      mouse: velUniforms.uMouse,
      mouseStrength: velUniforms.uMouseStrength,
      mouseRadius: velUniforms.uMouseRadius,
    };

    this._posDelta = posUniforms.uDelta;

    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error('[GPUCompute] init error:', error);
    }

    this.ready = error === null;
  }

  setTargets(targets) {
    const data = this.targetTexture.image.data;
    for (let i = 0; i < this.count; i++) {
      const i4 = i * 4;
      const i3 = i * 3;
      data[i4] = targets[i3];
      data[i4 + 1] = targets[i3 + 1];
      data[i4 + 2] = targets[i3 + 2];
    }
    this.targetTexture.needsUpdate = true;
  }

  /**
   * Push mouse state into GPU uniforms.
   * @param {THREE.Vector3} worldPos
   * @param {number} strength
   * @param {number} [radius]
   */
  setMouse(worldPos, strength, radius) {
    this.uniforms.mouse.value.copy(worldPos);
    this.uniforms.mouseStrength.value = strength;
    if (radius !== undefined) {
      this.uniforms.mouseRadius.value = radius;
    }
  }

  compute(elapsed, delta) {
    if (!this.ready) return;

    const dt = Math.min(Math.max(delta, 0.001), 0.033);

    this.uniforms.time.value = elapsed;
    this.uniforms.delta.value = dt;
    this._posDelta.value = dt;

    this.gpuCompute.compute();
  }

  getPositionTexture() {
    return this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
  }

  getVelocityTexture() {
    return this.gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture;
  }

  get textureSize() {
    return this.texSize;
  }

  dispose() {
    if (this.gpuCompute) {
      if (this.positionVariable?.renderTargets) {
        this.positionVariable.renderTargets.forEach((rt) => rt.dispose());
      }
      if (this.velocityVariable?.renderTargets) {
        this.velocityVariable.renderTargets.forEach((rt) => rt.dispose());
      }
      this.positionVariable?.material?.dispose();
      this.velocityVariable?.material?.dispose();
    }
    this.targetTexture?.dispose();
  }
}
