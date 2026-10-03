import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GrainShader, VignetteShader } from './shaders.js';

/**
 * Phase 9 — Cinematic post-processing pipeline.
 *
 * RenderPass → UnrealBloomPass → BokehPass → Grain → Vignette → OutputPass
 */
export default class PostProcessing {
  /**
   * @param {{
   *   renderer: THREE.WebGLRenderer,
   *   scene: THREE.Scene,
   *   camera: THREE.Camera,
   *   sizes: { width: number, height: number }
   * }} opts
   */
  constructor({ renderer, scene, camera, sizes }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.sizes = sizes;

    this.quality = this._detectQuality();
    this.enabled = true;

    this._build();
  }

  _detectQuality() {
    if (typeof window === 'undefined') return 'HIGH';
    const w = window.innerWidth;
    const dpr = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;

    // Touch / small screens → LOW
    if (w < 768 || ('ontouchstart' in window && w < 1024)) return 'LOW';
    // Tablet or modest hardware → MEDIUM
    if (w < 1200 || dpr > 2 || cores <= 4) return 'MEDIUM';
    return 'HIGH';
  }

  _build() {
    const w = this.sizes.width;
    const h = this.sizes.height;

    // Composer resolution based on quality
    let dprCap = 1.5;
    if (this.quality === 'MEDIUM') dprCap = 1.25;
    if (this.quality === 'LOW') dprCap = 1.0;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, dprCap);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);

    // 1. RenderPass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 2. UnrealBloomPass — subtle, high threshold so only bright particles glow
    const bloomStrength =
      this.quality === 'HIGH' ? 0.7 : this.quality === 'MEDIUM' ? 0.55 : 0.4;
    const bloomRadius =
      this.quality === 'HIGH' ? 0.45 : this.quality === 'MEDIUM' ? 0.35 : 0.3;
    const bloomThreshold = 0.82; // only brighter particles contribute

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    this.composer.addPass(this.bloomPass);

    // 3. Bokeh / DOF — subtle; disabled on LOW
    this.bokehPass = null;
    if (this.quality !== 'LOW') {
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: 4.2,
        aperture: this.quality === 'HIGH' ? 0.012 : 0.008,
        maxblur: this.quality === 'HIGH' ? 0.005 : 0.003,
      });
      this.composer.addPass(this.bokehPass);
    }

    // 4. Film grain
    this.grainPass = new ShaderPass(GrainShader);
    this.grainPass.uniforms.uIntensity.value =
      this.quality === 'HIGH' ? 0.032 : 0.022;
    this.composer.addPass(this.grainPass);

    // 5. Vignette
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.uDarkness.value =
      this.quality === 'HIGH' ? 0.4 : 0.3;
    this.vignettePass.uniforms.uOffset.value = 1.2;
    this.composer.addPass(this.vignettePass);

    // 6. OutputPass (tone mapping / color space)
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * Keep DOF focus roughly at particle structure distance.
   * @param {number} distance  camera distance to subject
   */
  setFocus(distance) {
    if (!this.bokehPass) return;
    if (this.bokehPass.uniforms && this.bokehPass.uniforms.focus) {
      this.bokehPass.uniforms.focus.value = distance;
    } else if (this.bokehPass.material?.uniforms?.focus) {
      this.bokehPass.material.uniforms.focus.value = distance;
    }
  }

  resize() {
    const w = this.sizes.width;
    const h = this.sizes.height;

    let dprCap = 1.5;
    if (this.quality === 'MEDIUM') dprCap = 1.25;
    if (this.quality === 'LOW') dprCap = 1.0;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, dprCap);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);

    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
  }

  /**
   * Render the post-processing pipeline.
   * @param {number} elapsed
   */
  render(elapsed = 0) {
    if (!this.enabled || !this.composer) {
      return false;
    }

    if (this.grainPass) {
      this.grainPass.uniforms.uTime.value = elapsed;
    }

    // Sync camera reference on passes that need it
    if (this.renderPass) {
      this.renderPass.camera = this.camera;
    }

    this.composer.render();
    return true;
  }

  /** Force quality tier (HIGH | MEDIUM | LOW). Rebuilds pipeline. */
  setQuality(level) {
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(level)) return;
    this.quality = level;
    this.dispose();
    this._build();
  }

  dispose() {
    if (this.composer) {
      this.composer.passes.forEach((pass) => {
        if (pass.dispose) pass.dispose();
      });
      // EffectComposer internal targets
      if (this.composer.renderTarget1) this.composer.renderTarget1.dispose();
      if (this.composer.renderTarget2) this.composer.renderTarget2.dispose();
      this.composer = null;
    }
  }
}
