import * as THREE from 'three';
import { getParticleCount } from './ShapeGenerator.js';
import {
  particleVertexShader,
  particleFragmentShader,
} from '../shaders/particleShaders.js';
import GPUCompute from './GPUCompute.js';
import MorphSystem from './MorphSystem.js';

/**
 * Particles — hero opens on BRAIN (Dala-matched), then morphs on scroll.
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
    this._zeroMouse = new THREE.Vector3(0, 0, 0);

    this._timelineRotY = 0;
    this._timelineRotX = 0;
    this._timelineOpacity = 1;
    this._timelineGather = 0;

    this._create();
  }

  _create() {
    let texSize = Math.ceil(Math.sqrt(this.count));
    texSize = Math.pow(2, Math.ceil(Math.log2(texSize)));

    this.morph = new MorphSystem(this.count, texSize);

    // Boot on brain positions — Dala hero opens on the brain
    this.simulation = new GPUCompute(
      this.renderer,
      this.morph.shapes.brain,
      this.count
    );

    this.simulation.bindMorph(this.morph);
    this.morph.setPair('brain', 'bulb');
    this.morph.setProgress(0);

    const tri = new THREE.BufferGeometry();
    const s = 0.008;
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
      const core = Math.random() > 0.92;
      aScale[i] = core ? 1.4 + Math.random() * 0.8 : 0.45 + Math.random() * 1.2;
      aBrightness[i] = core
        ? 0.85 + Math.random() * 0.15
        : 0.35 + Math.random() * 0.45;
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
        uBreathAmount: { value: 0.02 },
        uBreathSpeed: { value: 0.4 },
        uPositionTexture: { value: null },
        uTexSize: { value: this.simulation.textureSize },
        uOpacity: { value: 1 },
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
    this.mesh.scale.setScalar(1.15);

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

  update(elapsed, delta = 0.016, mouse = null) {
    if (!this.material) return;

    if (this._timelineGather > 0.01 && this.morph) {
      this.morph.params.noiseStrength = Math.min(
        this.morph.params.noiseStrength,
        0.04
      );
    }

    if (this.simulation && mouse) {
      this.simulation.setMouse(
        mouse.world,
        mouse.strengthValue,
        mouse.radius
      );
    } else if (this.simulation) {
      this.simulation.setMouse(this._zeroMouse, 0);
    }

    if (this.simulation && this.simulation.ready) {
      this.simulation.compute(elapsed, delta);
      this.material.uniforms.uPositionTexture.value =
        this.simulation.getPositionTexture();
    }

    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uOpacity.value = this._timelineOpacity;

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

      this.mesh.rotation.x = this._rotCurrent.x + this._timelineRotX;
      this.mesh.rotation.y =
        elapsed * 0.018 + this._rotCurrent.y + this._timelineRotY;
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
