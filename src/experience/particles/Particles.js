import * as THREE from 'three';
import { createBrainShape, getParticleCount } from './brainShape.js';
import {
  particleVertexShader,
  particleFragmentShader,
} from '../shaders/particleShaders.js';

/**
 * Phase 3 — Basic particle object.
 * InstancedMesh of tiny triangles forming an organic brain-like structure.
 * Custom GLSL shaders, per-particle seed / scale / brightness,
 * subtle breathing & floating motion.
 */
export default class Particles {
  constructor({ scene }) {
    this.scene = scene;
    this.count = getParticleCount();
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.dummy = new THREE.Object3D();

    this._create();
  }

  _create() {
    // --- Tiny triangle geometry (geometric fragment) ---
    const tri = new THREE.BufferGeometry();
    const s = 0.011;
    const vertices = new Float32Array([
      0.0, s * 1.25, 0.0,
      -s, -s * 0.7, 0.0,
      s, -s * 0.7, 0.0,
    ]);
    tri.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // --- Instance attributes ---
    const aScale = new Float32Array(this.count);
    const aSeed = new Float32Array(this.count);
    const aBrightness = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      aSeed[i] = Math.random();
      // Size variation: 0.35x – 2.4x
      aScale[i] = 0.35 + Math.random() * 2.05;
      // Brightness variation
      aBrightness[i] = 0.3 + Math.random() * 0.7;
    }

    tri.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));
    tri.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    tri.setAttribute(
      'aBrightness',
      new THREE.InstancedBufferAttribute(aBrightness, 1)
    );

    this.geometry = tri;

    // --- Shader material ---
    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBreathAmount: { value: 0.032 },
        uBreathSpeed: { value: 0.5 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // --- Instanced mesh ---
    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.count
    );
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Position instances on the brain shape
    const targets = createBrainShape(this.count);
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.dummy.position.set(
        targets[i3],
        targets[i3 + 1],
        targets[i3 + 2]
      );
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    // Store targets for later morph phases
    this.targets = targets;

    this.scene.add(this.mesh);
  }

  update(elapsed) {
    if (!this.material) return;
    this.material.uniforms.uTime.value = elapsed;

    // Very slow overall rotation so the structure feels alive
    if (this.mesh) {
      this.mesh.rotation.y = elapsed * 0.035;
    }
  }

  dispose() {
    if (this.mesh) {
      if (this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh.dispose?.();
      this.mesh = null;
    }
  }
}
