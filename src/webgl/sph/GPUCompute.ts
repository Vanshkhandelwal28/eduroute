import * as THREE from 'three';

export type GPUCaps = {
  webgl2: boolean;
  floatColorBuffer: boolean;
  floatBlend: boolean;
  maxTexSize: number;
};

export function detectGPUCaps(renderer: THREE.WebGLRenderer): GPUCaps {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const webgl2 =
    typeof WebGL2RenderingContext !== 'undefined' &&
    gl instanceof WebGL2RenderingContext;
  let floatColorBuffer = false;
  let floatBlend = false;
  if (webgl2) {
    const ext = gl.getExtension('EXT_color_buffer_float');
    floatColorBuffer = !!ext;
    floatBlend = !!gl.getExtension('EXT_float_blend');
  }
  return {
    webgl2,
    floatColorBuffer,
    floatBlend,
    maxTexSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
  };
}

export function createFloatRT(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    internalFormat: 'RGBA32F',
    depthBuffer: false,
    stencilBuffer: false,
  });
}

const copyVert = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const copyFrag = /* glsl */ `
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uMap;
void main() {
  fragColor = texture(uMap, vUv);
}
`;

export class GPUCompute {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  mesh: THREE.Mesh;
  private copyMat: THREE.RawShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.scene.add(this.mesh);

    this.copyMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: copyVert,
      fragmentShader: copyFrag,
      uniforms: { uMap: { value: null as THREE.Texture | null } },
      depthTest: false,
      depthWrite: false,
    });
  }

  run(material: THREE.RawShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.mesh.material = material;
    const prev = this.renderer.getRenderTarget();
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prev);
    this.renderer.autoClear = prevAutoClear;
  }

  /** Upload Float32 RGBA data into a float render target (preserves floats). */
  uploadFloatData(
    target: THREE.WebGLRenderTarget,
    data: Float32Array,
    width: number,
    height: number,
  ) {
    const tex = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    tex.needsUpdate = true;
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = false;
    this.renderer.initTexture(tex);

    this.copyMat.uniforms.uMap.value = tex;
    this.run(this.copyMat, target);

    tex.dispose();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.copyMat.dispose();
  }
}
