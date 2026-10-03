import * as THREE from 'three';

export type GPUCaps = {
  webgl2: boolean;
  floatColorBuffer: boolean;
  floatBlend: boolean;
  maxTexSize: number;
};

export function detectGPUCaps(renderer: THREE.WebGLRenderer): GPUCaps {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  let floatColorBuffer = false;
  let floatBlend = false;
  if (webgl2) {
    floatColorBuffer = true;
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

export function createFloatRT(
  width: number,
  height: number,
): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(width, height, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  return rt;
}

export class GPUCompute {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  mesh: THREE.Mesh;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.scene.add(this.mesh);
  }

  run(material: THREE.RawShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.mesh.material = material;
    const prev = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prev);
  }

  dispose() {
    this.mesh.geometry.dispose();
  }
}
