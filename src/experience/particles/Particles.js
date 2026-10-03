import * as THREE from 'three';
import { getParticleCount } from './ShapeGenerator.js';
import {
  particleVertexShader,
  particleFragmentShader,
} from '../shaders/particleShaders.js';
import GPUCompute from './GPUCompute.js';
import MorphSystem from './MorphSystem.js';

/**
 * Particles — InstancedMesh + GPU sim + morph system.
 * Phase 3–6.
 */
export default class Particles {
  constructor({ scene, renderer }) {
    this.scene = scene;
    this.renderer = renderer;
    this.count = getParticleCount();
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.simulation = null;
    this.morph = null;

    this._rotTarget = { x: 0, y: 0 };
    this._rotCurrent = { x: 0, y: 0 };

    this._create();
  }

  _create() {
    // Morph system first (generates all shapes)
    // texSize computed same way as GPUCompute
    let texSize = Math.ceil(Math.sqrt(this.count));
    texSize = Math.pow(2, Math.ceil(Math.log2(texSize)));

    this.morph = new MorphSystem(this.count, texSize);

    // GPU sim initialized with brain shape
    this.simulation = new GPUCompute(
      this.renderer,
      this.morph.shapes.brain,
      this.count
    );

    // Bind dual morph textures
    this.simulation.bindMorph(this.morph);

    // Default pair: brain → bulb at progress 0 (shows brain)
    this.morph.setPair('brain', 'bulb');
    this.morph.setProgress(0);

    // --- Geometry ---
    const tri = new THREE.BufferGeometry();
    const s = 0.011;
    const vertices = new Float32Array([
      0.0, s * 1.25, 0.0,
      -s, -s * 0.7, 0.0,
      s, -s * 0.7, 0.0,
    ]);
    tri.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const aScale = new Float32Array(this.count);
    const aSeed = new Float32Array(this.count);
    const aBrightness = new Float32Array(this.count);
    const aIndex = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      aSeed[i] = Math.random();
      aScale[i] = 0.35 + Math.random() * 2.05;
      aBrightness[i] = 0.3 + Math.random() * 0.7;
      aIndex[i] = i;
    }

    tri.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));
    tri.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    tri.setAttribute(
      'aBrightness',
      new THREE.InstancedBufferAttribute(aBrightness, 1)
    );
    tri.setAttribute('aIndex', new THREE.InstancedBufferAttribute(aIndex, 1));

    this.geometry = tri;

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBreathAmount: { value: 0.028 },
        uBreathSpeed: { value: 0.5 },
        uPositionTexture: { value: null },
        uTexSize: { value: this.simulation.textureSize },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.count
    );
    this.mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.mesh);

    if (this.simulation.ready) {
      this.material.uniforms.uPositionTexture.value =
        this.simulation.getPositionTexture();
    }
  }

  /**
   * Public API for GSAP / later phases.
   */
  get controls() {
    return {
      morph: this.morph,
      simulation: this.simulation,
      params: this.morph?.params,
      setPair: (a, b) => this.morph?.setPair(a, b),
      setProgress: (t) => this.morph?.setProgress(t),
      shapes: this.morph?.shapes,
    };
  }

  /**
   * Test helper — cycle morph progress for manual verification.
   * Not used in production; available on window for debugging.
   */
  testMorph(from, to, duration = 3) {
    this.morph.setPair(from, to);
    this.morph.setProgress(0);
    this.morph.params.scatter = 0.35;
    this._testMorph = {
      start: performance.now(),
      duration: duration * 1000,
      from,
      to,
    };
  }

  update(elapsed, delta = 0.016, mouse = null) {
    if (!this.material) return;

    // Dev test morph auto-progress
    if (this._testMorph) {
      const t =
        (performance.now() - this._testMorph.start) / this._testMorph.duration;
      if (t >= 1) {
        this.morph.setProgress(1);
        this.morph.params.scatter = 0;
        this._testMorph = null;
      } else {
        // Ease in-out
        const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        this.morph.setProgress(e);
        // Scatter peaks mid-transition
        this.morph.params.scatter = Math.sin(e * Math.PI) * 0.4;
      }
    }

    if (this.morph) {
      this.morph.update(delta);
    }

    if (this.simulation && mouse) {
      this.simulation.setMouse(
        mouse.world,
        mouse.strengthValue,
        mouse.radius
      );
    } else if (this.simulation) {
      this.simulation.setMouse(new THREE.Vector3(0, 0, 0), 0);
    }

    if (this.simulation && this.simulation.ready) {
      this.simulation.compute(elapsed, delta);
      this.material.uniforms.uPositionTexture.value =
        this.simulation.getPositionTexture();
    }

    this.material.uniforms.uTime.value = elapsed;

    if (this.mesh) {
      if (mouse && mouse.rotationOffset) {
        this._rotTarget.x = mouse.rotationOffset.x;
        this._rotTarget.y = mouse.rotationOffset.y;
      } else {
        this._rotTarget.x = 0;
        this._rotTarget.y = 0;
      }

      const rotLerp = 1 - Math.exp(-3 * Math.min(delta, 0.05));
      this._rotCurrent.x +=
        (this._rotTarget.x - this._rotCurrent.x) * rotLerp;
      this._rotCurrent.y +=
        (this._rotTarget.y - this._rotCurrent.y) * rotLerp;

      this.mesh.rotation.x = this._rotCurrent.x;
      this.mesh.rotation.y = elapsed * 0.035 + this._rotCurrent.y;
    }
  }

  dispose() {
    this.morph?.dispose();
    this.morph = null;
    if (this.simulation) {
      this.simulation.dispose();
      this.simulation = null;
    }
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh.dispose?.();
      this.mesh = null;
    }
  }
}
