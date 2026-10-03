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
  particleCount: 2048,
  smoothingRadius: 0.22,
  restDensity: 12,
  gasConstant: 40,
  viscosity: 0.18,
  gravity: new THREE.Vector3(0, -3.5, 0),
  damping: 0.985,
  particleSize: 8,
  mouseForce: -18,
  mouseRadius: 0.55,
  simSpeed: 1,
  mass: 1,
  morphStrength: 4,
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
  particleMat!: THREE.RawShaderMaterial;

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
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setClearColor(0x080808, 1);

    this.caps = detectGPUCaps(this.renderer);
    this.supported =
      this.caps.webgl2 && this.caps.floatColorBuffer;

    if (!this.supported) {
      this.fallbackReason = !this.caps.webgl2
        ? 'WebGL2 required for GPU SPH.'
        : 'Floating-point color buffers required (EXT_color_buffer_float).';
      this.compute = new GPUCompute(this.renderer);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
      return;
    }

    this.compute = new GPUCompute(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 40);
    this.camera.position.set(0, 0.2, 3.2);

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

  private mat(frag: string, extras: Record<string, THREE.IUniform> = {}) {
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
        uBoundsMin: { value: new THREE.Vector3(-1.2, -0.9, -0.8) },
        uBoundsMax: { value: new THREE.Vector3(1.2, 1.1, 0.8) },
        uRestitution: { value: 0.35 },
        uWriteMode: { value: 0 },
        ...extras,
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
    // Vertex ID driven — dummy position attribute required by some drivers
    const dummy = new Float32Array(this.params.particleCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(dummy, 3));
    geo.setDrawRange(0, this.params.particleCount);

    this.particleMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uPos: { value: null },
        uTexSize: { value: this.texSize },
        uParticleCount: { value: this.params.particleCount },
        uPointSize: { value: this.params.particleSize },
        uColor: { value: new THREE.Color('#d8d6d0') },
        uAccent: { value: new THREE.Color('#c8f542') },
        modelViewMatrix: { value: new THREE.Matrix4() },
        projectionMatrix: { value: new THREE.Matrix4() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.particleMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private writeDataTexture(
    rt: THREE.WebGLRenderTarget,
    data: Float32Array,
  ) {
    const s = this.texSize;
    const tex = new THREE.DataTexture(data, s, s, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    // Blit via scene
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const sc = new THREE.Scene();
    sc.add(mesh);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(rt);
    this.renderer.render(sc, cam);
    this.renderer.setRenderTarget(prev);
    tex.dispose();
    mat.dispose();
    mesh.geometry.dispose();
  }

  private seedFluid() {
    const s = this.texSize;
    const data = new Float32Array(s * s * 4);
    const n = this.params.particleCount;
    let i = 0;
    const cols = Math.ceil(Math.sqrt(n));
    for (let p = 0; p < n; p++) {
      const cx = (p % cols) / cols;
      const cy = Math.floor(p / cols) / cols;
      data[i++] = (cx - 0.5) * 1.6 + (Math.random() - 0.5) * 0.05;
      data[i++] = cy * 1.2 - 0.3 + (Math.random() - 0.5) * 0.05;
      data[i++] = (Math.random() - 0.5) * 0.5;
      data[i++] = 1;
    }
    this.writeDataTexture(this.posA, data);
    this.writeDataTexture(this.posB, data);
    const vel = new Float32Array(s * s * 4);
    this.writeDataTexture(this.velA, vel);
    this.writeDataTexture(this.velB, vel);
  }

  /** GPU morph target: sphere (ready for brain/logo swaps later) */
  private seedMorphSphere() {
    const s = this.texSize;
    const data = new Float32Array(s * s * 4);
    const n = this.params.particleCount;
    for (let p = 0; p < n; p++) {
      const y = 1 - (p / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * p;
      const radius = 0.65;
      data[p * 4] = Math.cos(theta) * r * radius;
      data[p * 4 + 1] = y * radius;
      data[p * 4 + 2] = Math.sin(theta) * r * radius;
      data[p * 4 + 3] = 1;
    }
    this.writeDataTexture(this.morphTarget, data);
  }

  /** Public API — EduRoute */
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
    }
    this.particleMat.uniforms.uPointSize.value = this.params.particleSize;
  }

  update(deltaTime: number) {
    if (!this.supported || this.disposed) return;

    const dt = Math.min(deltaTime, 0.033) * this.params.simSpeed;
    this.syncUniforms();

    const posRead = this.ping ? this.posB : this.posA;
    const posWrite = this.ping ? this.posA : this.posB;
    const velRead = this.ping ? this.velB : this.velA;
    const velWrite = this.ping ? this.velA : this.velB;

    // 1) Density + pressure
    this.densMat.uniforms.uPos.value = posRead.texture;
    this.compute.run(this.densMat, this.dens);

    // 2) Forces
    this.forceMat.uniforms.uPos.value = posRead.texture;
    this.forceMat.uniforms.uVel.value = velRead.texture;
    this.forceMat.uniforms.uDens.value = this.dens.texture;
    this.forceMat.uniforms.uMorphTarget.value = this.morphTarget.texture;
    this.compute.run(this.forceMat, this.force);

    // 3) Integrate velocity
    this.integVelMat.uniforms.uPos.value = posRead.texture;
    this.integVelMat.uniforms.uVel.value = velRead.texture;
    this.integVelMat.uniforms.uForce.value = this.force.texture;
    this.integVelMat.uniforms.uDt.value = dt;
    this.integVelMat.uniforms.uWriteMode.value = 0;
    this.compute.run(this.integVelMat, velWrite);

    // 4) Integrate position (uses new velocity)
    this.integPosMat.uniforms.uPos.value = posRead.texture;
    this.integPosMat.uniforms.uVel.value = velWrite.texture;
    this.integPosMat.uniforms.uForce.value = this.force.texture;
    this.integPosMat.uniforms.uDt.value = dt;
    this.integPosMat.uniforms.uWriteMode.value = 1;
    this.compute.run(this.integPosMat, posWrite);

    this.ping = !this.ping;

    // Render
    this.particleMat.uniforms.uPos.value = posWrite.texture;
    this.particleMat.uniforms.modelViewMatrix.value = this.points.modelViewMatrix;
    this.particleMat.uniforms.projectionMatrix.value = this.camera.projectionMatrix;
    this.points.modelViewMatrix.multiplyMatrices(
      this.camera.matrixWorldInverse,
      this.points.matrixWorld,
    );

    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    [
      this.posA, this.posB, this.velA, this.velB,
      this.dens, this.force, this.morphTarget,
    ].forEach((rt) => rt?.dispose());
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
