import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import {
  velocityFragmentShader,
  positionFragmentShader,
} from '../shaders/computeShaders.js';

/**
 * GPU particle simulation with smoothed morph-progress lerp
 * so scrubbed scroll never snaps targets frame-to-frame.
 */
export default class GPUCompute {
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
        posArr[i4] = posArr[i4 + 1] = posArr[i4 + 2] = posArr[i4 + 3] = 0;
        velArr[i4] = velArr[i4 + 1] = velArr[i4 + 2] = velArr[i4 + 3] = 0;
        targetData[i4] = targetData[i4 + 1] = targetData[i4 + 2] = targetData[i4 + 3] = 0;
      }
    }

    this._placeholderTarget = new THREE.DataTexture(
      targetData,
      this.texSize,
      this.texSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this._placeholderTarget.needsUpdate = true;
    this._placeholderTarget.minFilter = THREE.NearestFilter;
    this._placeholderTarget.magFilter = THREE.NearestFilter;

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
    // Higher damping → softer, less jittery motion
    velUniforms.uDamping = { value: 0.94 };
    velUniforms.uSpringStrength = { value: 3.8 };
    velUniforms.uNoiseStrength = { value: 0.1 };

    velUniforms.uTargetA = { value: this._placeholderTarget };
    velUniforms.uTargetB = { value: this._placeholderTarget };
    velUniforms.uMorphProgress = { value: 0 };
    velUniforms.uScatter = { value: 0 };
    velUniforms.uTurbulence = { value: 0.12 };

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
      targetA: velUniforms.uTargetA,
      targetB: velUniforms.uTargetB,
      morphProgress: velUniforms.uMorphProgress,
      scatter: velUniforms.uScatter,
      turbulence: velUniforms.uTurbulence,
      mouse: velUniforms.uMouse,
      mouseStrength: velUniforms.uMouseStrength,
      mouseRadius: velUniforms.uMouseRadius,
    };

    this._posDelta = posUniforms.uDelta;

    // Smoothed values — absorb scroll scrub spikes
    this._smooth = {
      morphProgress: 0,
      scatter: 0,
      turbulence: 0.12,
      springStrength: 3.8,
      noiseStrength: 0.1,
    };

    const error = this.gpuCompute.init();
    if (error !== null) {
      console.error('[GPUCompute] init error:', error);
    }
    this.ready = error === null;
  }

  bindMorph(morphSystem) {
    this.uniforms.targetA.value = morphSystem.textureA;
    this.uniforms.targetB.value = morphSystem.textureB;
    this._morphSystem = morphSystem;
  }

  setMouse(worldPos, strength, radius) {
    this.uniforms.mouse.value.copy(worldPos);
    this.uniforms.mouseStrength.value = strength;
    if (radius !== undefined) {
      this.uniforms.mouseRadius.value = radius;
    }
  }

  compute(elapsed, delta) {
    if (!this.ready) return;

    // Fixed-ish step for stable spring response
    const dt = Math.min(Math.max(delta, 0.001), 0.028);

    this.uniforms.time.value = elapsed;
    this.uniforms.delta.value = dt;
    this._posDelta.value = dt;

    if (this._morphSystem) {
      const p = this._morphSystem.params;
      // Exponential approach — morph feels continuous under scroll scrub
      const k = 1 - Math.exp(-6.5 * dt);
      const kSlow = 1 - Math.exp(-4.0 * dt);

      this._smooth.morphProgress += (p.morphProgress - this._smooth.morphProgress) * k;
      this._smooth.scatter += (p.scatter - this._smooth.scatter) * kSlow;
      this._smooth.turbulence += (p.turbulence - this._smooth.turbulence) * kSlow;
      this._smooth.springStrength += (p.springStrength - this._smooth.springStrength) * k;
      this._smooth.noiseStrength += (p.noiseStrength - this._smooth.noiseStrength) * kSlow;

      this.uniforms.morphProgress.value = this._smooth.morphProgress;
      this.uniforms.scatter.value = this._smooth.scatter;
      this.uniforms.turbulence.value = this._smooth.turbulence;
      this.uniforms.springStrength.value = this._smooth.springStrength;
      this.uniforms.noiseStrength.value = this._smooth.noiseStrength;
    }

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
    this._placeholderTarget?.dispose();
  }
}
