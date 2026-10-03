import * as THREE from 'three';
import { createBrainShape, getParticleCount } from './brainShape.js';
import {
  particleVertexShader,
  particleFragmentShader,
} from '../shaders/particleShaders.js';
import GPUCompute from './GPUCompute.js';

/**
 * Particles — InstancedMesh rendering + GPU simulation.
 * Phase 5: accepts mouse world position for GPU repulsion + gentle rotation.
 */
export default class Particles {
  /**
   * @param {{ scene: object, renderer: THREE.WebGLRenderer }} opts
   */
  constructor({ scene, renderer }) {
    this.scene = scene;
    this.renderer = renderer;
    this.count = getParticleCount();
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.simulation = null;
    this.targets = null;

    // Target rotation from mouse (smoothed in update)
    this._rotTarget = { x: 0, y: 0 };
    this._rotCurrent = { x: 0, y: 0 };

    this._create();
  }

  _create() {
    this.targets = createBrainShape(this.count);

    this.simulation = new GPUCompute(
      this.renderer,
      this.targets,
      this.count
    );

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
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
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

  get controls() {
    if (!this.simulation) return null;
    return {
      simulation: this.simulation,
      targets: this.targets,
      springStrength: this.simulation.uniforms.springStrength,
      damping: this.simulation.uniforms.damping,
      noiseStrength: this.simulation.uniforms.noiseStrength,
      time: this.simulation.uniforms.time,
      mouse: this.simulation.uniforms.mouse,
      mouseStrength: this.simulation.uniforms.mouseStrength,
      setTargets: (t) => this.simulation.setTargets(t),
    };
  }

  /**
   * @param {number} elapsed
   * @param {number} delta
   * @param {{ world: THREE.Vector3, strengthValue: number, radius: number, rotationOffset: {x:number,y:number} } | null} mouse
   */
  update(elapsed, delta = 0.016, mouse = null) {
    if (!this.material) return;

    // Feed mouse into GPU before compute
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

    // Gentle rotation: base spin + mouse influence
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
    if (this.simulation) {
      this.simulation.dispose();
      this.simulation = null;
    }
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
