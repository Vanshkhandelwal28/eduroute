import * as THREE from 'three';
import { getParticleCount } from './ShapeGenerator.js';

/**
 * Ambient floating triangle layer — always present, never morphs.
 * Matches live Dala: sparse multi-colored triangles drifting in the black void.
 */
export default class AmbientLayer {
  constructor({ scene }) {
    this.scene = scene;
    this.count = Math.min(1200, Math.floor(getParticleCount() * 0.12));
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this._create();
  }

  _create() {
    const tri = new THREE.BufferGeometry();
    const s = 0.009;
    tri.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([
          0.0, s * 1.25, 0.0,
          -s, -s * 0.7, 0.0,
          s, -s * 0.7, 0.0,
        ]),
        3
      )
    );

    const aScale = new Float32Array(this.count);
    const aSeed = new Float32Array(this.count);
    const aBrightness = new Float32Array(this.count);
    const aIndex = new Float32Array(this.count);
    const aDrift = new Float32Array(this.count * 3);
    const aSpin = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      aSeed[i] = Math.random();
      aScale[i] = 0.4 + Math.random() * 0.9;
      aBrightness[i] = 0.25 + Math.random() * 0.35;
      aIndex[i] = i;
      aDrift[i * 3] = (Math.random() - 0.5) * 0.15;
      aDrift[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      aDrift[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      aSpin[i] = (Math.random() - 0.5) * 0.4;
    }

    tri.setAttribute('aScale', new THREE.InstancedBufferAttribute(aScale, 1));
    tri.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    tri.setAttribute(
      'aBrightness',
      new THREE.InstancedBufferAttribute(aBrightness, 1)
    );
    tri.setAttribute('aIndex', new THREE.InstancedBufferAttribute(aIndex, 1));
    tri.setAttribute('aDrift', new THREE.InstancedBufferAttribute(aDrift, 3));
    tri.setAttribute('aSpin', new THREE.InstancedBufferAttribute(aSpin, 1));

    this.geometry = tri;

    const vertexShader = /* glsl */ `
      attribute float aScale;
      attribute float aSeed;
      attribute float aBrightness;
      attribute vec3 aDrift;
      attribute float aSpin;
      uniform float uTime;

      varying float vBrightness;
      varying float vSeed;

      void main() {
        vBrightness = aBrightness;
        vSeed = aSeed;

        float t = aSeed;
        float incl = acos(1.0 - 2.0 * t);
        float az = 6.2831853 * aSeed * 1.618;
        vec3 base = vec3(
          sin(incl) * cos(az) * 3.2,
          cos(incl) * 2.4,
          sin(incl) * sin(az) * 3.2
        );

        vec3 drifted = base + aDrift * uTime * 0.3;
        drifted = mod(drifted + 4.0, 8.0) - 4.0;
        drifted.y += sin(uTime * 0.2 + aSeed * 6.28) * 0.08;

        vec4 mvPosition = modelViewMatrix * vec4(drifted, 1.0);
        vec3 local = position * aScale;

        float angle = aSeed * 6.2831853 + uTime * aSpin;
        float c = cos(angle);
        float s = sin(angle);
        mat2 rot = mat2(c, -s, s, c);
        local.xy = rot * local.xy;

        mvPosition.xyz += local;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = /* glsl */ `
      varying float vBrightness;
      varying float vSeed;

      void main() {
        vec3 c0 = vec3(0.961, 0.843, 0.431);
        vec3 c1 = vec3(0.765, 0.608, 0.827);
        vec3 c2 = vec3(0.608, 0.349, 0.714);
        vec3 c3 = vec3(0.102, 0.737, 0.612);
        vec3 c4 = vec3(0.180, 0.800, 0.443);
        vec3 c5 = vec3(1.000, 1.000, 1.000);
        vec3 c6 = vec3(0.906, 0.298, 0.235);
        vec3 c7 = vec3(0.204, 0.596, 0.859);

        float t = fract(vSeed * 7.13);
        vec3 col;
        if      (t < 0.125) col = mix(c0, c1, t * 8.0);
        else if (t < 0.250) col = mix(c1, c2, (t - 0.125) * 8.0);
        else if (t < 0.375) col = mix(c2, c3, (t - 0.250) * 8.0);
        else if (t < 0.500) col = mix(c3, c4, (t - 0.375) * 8.0);
        else if (t < 0.625) col = mix(c4, c5, (t - 0.500) * 8.0);
        else if (t < 0.750) col = mix(c5, c6, (t - 0.625) * 8.0);
        else if (t < 0.875) col = mix(c6, c7, (t - 0.750) * 8.0);
        else                col = mix(c7, c0, (t - 0.875) * 8.0);

        col *= (0.5 + vBrightness * 0.5);
        float alpha = 0.35 * vBrightness;

        gl_FragColor = vec4(col, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
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
  }

  update(elapsed) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsed;
    }
  }

  dispose() {
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh = null;
    }
  }
}
