import * as THREE from 'three';
import {
  GPUCompute,
  createFloatRT,
  detectGPUCaps,
  type GPUCaps,
} from './GPUCompute';
import {
  fullscreenVert,
  densityFrag,
  forceFrag,
  integrateFrag,
  particleVert,
  particleFrag,
} from './shaders';

export type SPHParams = {
  particleCount: number;
  smoothingRadius: number;
  restDensity: number;
  gasConstant: number;
  viscosity: number;
  gravity: THREE.Vector3;
  damping: number;
  particleSize: number;
  mouseForce: number;
  mouseRadius: number;
  simSpeed: number;
  mass: number;
  morphStrength: number;
  neighborStride: number;
};

const DEFAULT: SPHParams = {
  particleCount: 1600,
  smoothingRadius: 0.28,
  restDensity: 8,
  gasConstant: 12,
  viscosity: 0.35,
  gravity: new THREE.Vector3(0, -2.2, 0),
  damping: 0.98,
  particleSize: 5,
  mouseForce: -12,
  mouseRadius: 0.6,
  simSpeed: 1,
  mass: 1,
  morphStrength: 3,
  neighborStride: 2,
};

function texSizeForCount(n: number): number {
  return Math.max(8, Math.ceil(Math.sqrt(n)));
}

export class SPHSimulation {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  caps: GPUCaps;
  supported: boolean;
  fallbackReason = '';

  params: SPHParams;
  texSize = 1;
  compute: GPUCompute;

  posA!: THREE.WebGLRenderTarget;
  posB!: THREE.WebGLRenderTarget;
  velA!: THREE.WebGLRenderTarget;
  velB!: THREE.WebGLRenderTarget;
  dens!: THREE.WebGLRenderTarget;
  force!: THREE.WebGLRenderTarget;
  morphTarget!: THREE.WebGLRenderTarget;

  densMat!: THREE.RawShaderMaterial;
  forceMat!: THREE.RawShaderMaterial;
  integVelMat!: THREE.RawShaderMaterial;
  integPosMat!: THREE.RawShaderMaterial;

  points!: THREE.Points;
  particleMat!: THREE.ShaderMaterial;

  private mouse = new THREE.Vector3(0, -10, 0);
  private morphProgress = 0;
  private ping = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, params?: Partial<SPHParams>) {
    this.params = { ...DEFAULT, ...params };

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(
      Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5),
    );
    this.renderer.setClearColor(0x080808, 1);
    this.renderer.autoClear = true;

    this.caps = detectGPUCaps(this.renderer);
    this.supported = this.caps.webgl2 && this.caps.floatColorBuffer;
    this.compute = new GPUCompute(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 50);
    this.camera.position.set(0, 0.15, 3.4);
    this.camera.lookAt(0, 0, 0);

    if (!this.supported) {
      this.fallbackReason = !this.caps.webgl2
        ? 'WebGL2 required for GPU SPH.'
        : 'Floating-point color buffers required (EXT_color_buffer_float).';
      this.onResize();
      return;
    }

    this.initTargets();
    this.initMaterials();
    this.initParticles();
    this.seedFluid();
    this.seedMorphSphere();
    this.onResize();
  }

  private initTargets() {
    const n = Math.min(this.params.particleCount, 4096);
    this.params.particleCount = n;
    this.texSize = texSizeForCount(n);
    const s = this.texSize;
    this.posA = createFloatRT(s, s);
    this.posB = createFloatRT(s, s);
    this.velA = createFloatRT(s, s);
    this.velB = createFloatRT(s, s);
    this.dens = createFloatRT(s, s);
    this.force = createFloatRT(s, s);
    this.morphTarget = createFloatRT(s, s);
  }

  private mat(frag: string) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fullscreenVert,
      fragmentShader: frag,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uDens: { value: null },
        uForce: { value: null },
        uMorphTarget: { value: null },
        uTexSize: { value: this.texSize },
        uParticleCount: { value: this.params.particleCount },
        uH: { value: this.params.smoothingRadius },
        uMass: { value: this.params.mass },
        uRestDensity: { value: this.params.restDensity },
        uGasConst: { value: this.params.gasConstant },
        uViscosity: { value: this.params.viscosity },
        uStride: { value: this.params.neighborStride },
        uGravity: { value: this.params.gravity.clone() },
        uMouse: { value: this.mouse.clone() },
        uMouseForce: { value: this.params.mouseForce },
        uMouseRadius: { value: this.params.mouseRadius },
        uMorphProgress: { value: 0 },
        uMorphStrength: { value: this.params.morphStrength },
        uDt: { value: 0.016 },
        uDamping: { value: this.params.damping },
        uBoundsMin: { value: new THREE.Vector3(-1.35, -1.0, -0.9) },
        uBoundsMax: { value: new THREE.Vector3(1.35, 1.2, 0.9) },
        uRestitution: { value: 0.4 },
        uWriteMode: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  private initMaterials() {
    this.densMat = this.mat(densityFrag);
    this.forceMat = this.mat(forceFrag);
    this.integVelMat = this.mat(integrateFrag);
    this.integPosMat = this.mat(integrateFrag);
  }

  private initParticles() {
    const geo = new THREE.BufferGeometry();
    const dummy = new Float32Array(this.params.particleCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(dummy, 3));
    geo.setDrawRange(0, this.params.particleCount);

    this.particleMat = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uPos: { value: null },
        uTexSize: { value: this.texSize },
        uParticleCount: { value: this.params.particleCount },
        uPointSize: { value: this.params.particleSize },
        // Dimmer base — additive white blowout fix
        uColor: { value: new THREE.Color('#9a9890') },
        uAccent: { value: new THREE.Color('#a8c93a') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      // Normal blending prevents white-out when particles overlap
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geo, this.particleMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private seedFluid() {
    const s = this.texSize;
    const data = new Float32Array(s * s * 4);
    const n = this.params.particleCount;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    for (let p = 0; p < n; p++) {
      const col = p % cols;
      const row = Math.floor(p / cols);
      const x = (col / Math.max(cols - 1, 1) - 0.5) * 1.5;
      const y = (row / Math.max(rows - 1, 1)) * 1.0 - 0.2;
      const z = (Math.random() - 0.5) * 0.4;
      data[p * 4] = x + (Math.random() - 0.5) * 0.03;
      data[p * 4 + 1] = y + (Math.random() - 0.5) * 0.03;
      data[p * 4 + 2] = z;
      data[p * 4 + 3] = 1;
    }
    this.compute.uploadFloatData(this.posA, data, s, s);
    this.compute.uploadFloatData(this.posB, data, s, s);
    const vel = new Float32Array(s * s * 4);
    this.compute.uploadFloatData(this.velA, vel, s, s);
    this.compute.uploadFloatData(this.velB, vel, s, s);
  }

  private seedMorphSphere() {
    const s = this.texSize;
    const data = new Float32Array(s * s * 4);
    const n = this.params.particleCount;
    for (let p = 0; p < n; p++) {
      const y = n <= 1 ? 0 : 1 - (p / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * p;
      const radius = 0.7;
      data[p * 4] = Math.cos(theta) * r * radius;
      data[p * 4 + 1] = y * radius * 0.9;
      data[p * 4 + 2] = Math.sin(theta) * r * radius;
      data[p * 4 + 3] = 1;
    }
    this.compute.uploadFloatData(this.morphTarget, data, s, s);
  }

  setMouse(x: number, y: number, z: number) {
    this.mouse.set(x, y, z);
  }

  setMouseForce(strength: number) {
    this.params.mouseForce = strength;
  }

  setGravity(x: number, y: number, z: number) {
    this.params.gravity.set(x, y, z);
  }

  setMorphProgress(progress: number) {
    this.morphProgress = Math.min(1, Math.max(0, progress));
  }

  setParams(partial: Partial<SPHParams>) {
    Object.assign(this.params, partial);
  }

  private syncUniforms() {
    const list = [this.densMat, this.forceMat, this.integVelMat, this.integPosMat];
    for (const m of list) {
      m.uniforms.uH.value = this.params.smoothingRadius;
      m.uniforms.uMass.value = this.params.mass;
      m.uniforms.uRestDensity.value = this.params.restDensity;
      m.uniforms.uGasConst.value = this.params.gasConstant;
      m.uniforms.uViscosity.value = this.params.viscosity;
      m.uniforms.uStride.value = this.params.neighborStride;
      m.uniforms.uGravity.value.copy(this.params.gravity);
      m.uniforms.uMouse.value.copy(this.mouse);
      m.uniforms.uMouseForce.value = this.params.mouseForce;
      m.uniforms.uMouseRadius.value = this.params.mouseRadius;
      m.uniforms.uMorphProgress.value = this.morphProgress;
      m.uniforms.uMorphStrength.value = this.params.morphStrength;
      m.uniforms.uDamping.value = this.params.damping;
      m.uniforms.uParticleCount.value = this.params.particleCount;
      m.uniforms.uTexSize.value = this.texSize;
    }
    this.particleMat.uniforms.uPointSize.value = this.params.particleSize;
    this.particleMat.uniforms.uParticleCount.value = this.params.particleCount;
    this.particleMat.uniforms.uTexSize.value = this.texSize;
  }

  update(deltaTime: number) {
    if (!this.supported || this.disposed) return;

    const dt = Math.min(Math.max(deltaTime, 0.001), 0.033) * this.params.simSpeed;
    this.syncUniforms();

    const posRead = this.ping ? this.posB : this.posA;
    const posWrite = this.ping ? this.posA : this.posB;
    const velRead = this.ping ? this.velB : this.velA;
    const velWrite = this.ping ? this.velA : this.velB;

    this.densMat.uniforms.uPos.value = posRead.texture;
    this.compute.run(this.densMat, this.dens);

    this.forceMat.uniforms.uPos.value = posRead.texture;
    this.forceMat.uniforms.uVel.value = velRead.texture;
    this.forceMat.uniforms.uDens.value = this.dens.texture;
    this.forceMat.uniforms.uMorphTarget.value = this.morphTarget.texture;
    this.compute.run(this.forceMat, this.force);

    this.integVelMat.uniforms.uPos.value = posRead.texture;
    this.integVelMat.uniforms.uVel.value = velRead.texture;
    this.integVelMat.uniforms.uForce.value = this.force.texture;
    this.integVelMat.uniforms.uDt.value = dt;
    this.integVelMat.uniforms.uWriteMode.value = 0;
    this.compute.run(this.integVelMat, velWrite);

    this.integPosMat.uniforms.uPos.value = posRead.texture;
    this.integPosMat.uniforms.uVel.value = velWrite.texture;
    this.integPosMat.uniforms.uForce.value = this.force.texture;
    this.integPosMat.uniforms.uDt.value = dt;
    this.integPosMat.uniforms.uWriteMode.value = 1;
    this.compute.run(this.integPosMat, posWrite);

    this.ping = !this.ping;

    this.particleMat.uniforms.uPos.value = posWrite.texture;
    this.camera.updateMatrixWorld();
    this.points.updateMatrixWorld();

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth || canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, parent?.clientHeight || canvas.clientHeight || window.innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    [this.posA, this.posB, this.velA, this.velB, this.dens, this.force, this.morphTarget].forEach(
      (rt) => rt?.dispose(),
    );
    this.densMat?.dispose();
    this.forceMat?.dispose();
    this.integVelMat?.dispose();
    this.integPosMat?.dispose();
    this.particleMat?.dispose();
    this.points?.geometry.dispose();
    this.compute.dispose();
    this.renderer.dispose();
  }
}
