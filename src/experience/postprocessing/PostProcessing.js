import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GrainShader, VignetteShader } from './shaders.js';
import { getPostQuality, getCappedDPR } from '../utils/device.js';

/**
 * Post-processing — aggressive anti-washout bloom settings.
 */
export default class PostProcessing {
  constructor({ renderer, scene, camera, sizes }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sizes = sizes;

    this.quality = getPostQuality();
    this.enabled = true;

    this._build();
  }

  _build() {
    const w = this.sizes.width;
    const h = this.sizes.height;
    const pixelRatio = getCappedDPR();

    let composerDpr = pixelRatio;
    if (this.quality === 'MEDIUM') composerDpr = Math.min(pixelRatio, 1.15);
    if (this.quality === 'LOW') composerDpr = Math.min(pixelRatio, 1.0);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(composerDpr);
    this.composer.setSize(w, h);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Very selective bloom — high threshold, low strength
    const bloomStrength =
      this.quality === 'HIGH' ? 0.28 : this.quality === 'MEDIUM' ? 0.2 : 0.15;
    const bloomRadius =
      this.quality === 'HIGH' ? 0.32 : this.quality === 'MEDIUM' ? 0.25 : 0.2;

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      bloomStrength,
      bloomRadius,
      0.92 // only the brightest tips contribute
    );
    this.composer.addPass(this.bloomPass);

    this.bokehPass = null;
    if (this.quality !== 'LOW') {
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: 4.2,
        aperture: this.quality === 'HIGH' ? 0.008 : 0.005,
        maxblur: this.quality === 'HIGH' ? 0.003 : 0.002,
      });
      this.composer.addPass(this.bokehPass);
    }

    this.grainPass = new ShaderPass(GrainShader);
    this.grainPass.uniforms.uIntensity.value =
      this.quality === 'HIGH' ? 0.03 : 0.02;
    this.composer.addPass(this.grainPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.uDarkness.value =
      this.quality === 'HIGH' ? 0.42 : 0.32;
    this.vignettePass.uniforms.uOffset.value = 1.15;
    this.composer.addPass(this.vignettePass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  setFocus(distance) {
    if (!this.bokehPass) return;
    const u =
      this.bokehPass.uniforms?.focus ||
      this.bokehPass.material?.uniforms?.focus;
    if (u) u.value = distance;
  }

  resize() {
    const w = this.sizes.width;
    const h = this.sizes.height;
    let composerDpr = getCappedDPR();
    if (this.quality === 'MEDIUM') composerDpr = Math.min(composerDpr, 1.15);
    if (this.quality === 'LOW') composerDpr = Math.min(composerDpr, 1.0);

    this.composer.setPixelRatio(composerDpr);
    this.composer.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  }

  render(elapsed = 0) {
    if (!this.enabled || !this.composer) return false;

    if (this.grainPass) {
      this.grainPass.uniforms.uTime.value = elapsed;
    }
    if (this.renderPass) {
      this.renderPass.camera = this.camera;
    }

    this.composer.render();
    return true;
  }

  setQuality(level) {
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(level)) return;
    this.quality = level;
    this.dispose();
    this._build();
  }

  dispose() {
    if (!this.composer) return;
    this.composer.passes.forEach((pass) => {
      if (pass.dispose) pass.dispose();
    });
    if (this.composer.renderTarget1) this.composer.renderTarget1.dispose();
    if (this.composer.renderTarget2) this.composer.renderTarget2.dispose();
    this.composer = null;
  }
}
