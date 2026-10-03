import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { revealLines } from './textReveal.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Phase 7 — Central TimelineController.
 * ONE master scroll choreography for morph, camera, particles, text.
 */
export default class TimelineController {
  /**
   * @param {{ experience: object }} opts
   */
  constructor({ experience }) {
    this.experience = experience;
    this.particles = experience.particles;
    this.camera = experience.camera;
    this.morph = experience.particles?.morph;

    this.reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.isMobile = window.innerWidth < 768;
    this.isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Shared state driven by scroll (read each frame by Camera / Particles)
    this.state = {
      // Camera
      camX: 0,
      camY: 0.15,
      camZ: 4.2,
      lookX: 0,
      lookY: 0.08,
      lookZ: 0,
      fov: 42,
      // Particles
      rotY: 0,
      rotX: 0,
      scale: 1,
      opacity: 1,
      // Morph params (synced into morph.params)
      morphProgress: 0,
      scatter: 0,
      turbulence: 0.15,
      springStrength: 4.5,
      noiseStrength: 0.12,
      // Gathering for CTA (0–1)
      gather: 0,
    };

    this.triggers = [];
    this._currentPair = 'brain-bulb';

    if (this.reduced) {
      this._setupReduced();
      return;
    }

    this._setup();
  }

  _scrub() {
    // Smoother scrub on desktop, snappier on mobile
    if (this.isMobile) return 0.6;
    if (this.isTablet) return 0.9;
    return 1.2;
  }

  _camScale() {
    // Reduce camera travel on smaller screens
    if (this.isMobile) return 0.45;
    if (this.isTablet) return 0.7;
    return 1;
  }

  _setPair(from, to) {
    const key = `${from}-${to}`;
    if (this._currentPair === key) return;
    this._currentPair = key;
    this.morph?.setPair(from, to);
  }

  _syncMorphParams() {
    if (!this.morph) return;
    const p = this.morph.params;
    p.morphProgress = this.state.morphProgress;
    p.scatter = this.state.scatter;
    p.turbulence = this.state.turbulence;
    p.springStrength = this.state.springStrength;
    p.noiseStrength = this.state.noiseStrength;
  }

  _setupReduced() {
    // Minimal: just reveal first section text, hold brain
    this._setPair('brain', 'bulb');
    this.morph?.setProgress(0);
    revealLines('#hero');
  }

  _setup() {
    const s = this.state;
    const cs = this._camScale();
    const scrub = this._scrub();

    // Ensure starting pair
    this._setPair('brain', 'bulb');
    this.morph?.setProgress(0);

    // ---------- HERO ----------
    // Initial text reveal on load
    gsap.delayedCall(0.3, () => revealLines('#hero', { duration: 1.2 }));

    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub,
        onUpdate: () => this._syncMorphParams(),
      },
    });

    heroTl
      .fromTo(
        s,
        { camZ: 4.2, rotY: 0, noiseStrength: 0.12 },
        {
          camZ: 4.2 + 0.8 * cs,
          rotY: 0.35,
          noiseStrength: 0.18,
          ease: 'none',
          duration: 1,
        },
        0
      )
      .to(s, { camY: 0.25, duration: 1, ease: 'none' }, 0);

    this.triggers.push(heroTl.scrollTrigger);

    // ---------- MANIFESTO ----------
    const manifestoTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#manifesto',
        start: 'top 80%',
        end: 'bottom 20%',
        scrub,
        onEnter: () => revealLines('#manifesto'),
        onUpdate: () => this._syncMorphParams(),
      },
    });

    manifestoTl.fromTo(
      s,
      { camZ: 5.0, camX: 0, camY: 0.25, scale: 1, fov: 42 },
      {
        camZ: 5.0 + 0.6 * cs,
        camX: -0.3 * cs,
        camY: 0.35,
        scale: 1.05,
        fov: 40,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(manifestoTl.scrollTrigger);

    // ---------- FEATURE 01 — Brain → Bulb ----------
    const f1Tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#feature-01',
        start: 'top 75%',
        end: 'bottom top',
        scrub,
        onEnter: () => {
          this._setPair('brain', 'bulb');
          revealLines('#feature-01');
        },
        onUpdate: () => this._syncMorphParams(),
      },
    });

    // Scatter rises first, then morph, then settle
    f1Tl
      .fromTo(
        s,
        {
          morphProgress: 0,
          scatter: 0,
          turbulence: 0.15,
          rotY: 0.35,
          camZ: 5.6,
        },
        {
          scatter: this.isMobile ? 0.25 : 0.45,
          turbulence: 0.35,
          rotY: 0.8,
          duration: 0.25,
          ease: 'none',
        },
        0
      )
      .to(
        s,
        {
          morphProgress: 1,
          duration: 0.5,
          ease: 'none',
        },
        0.2
      )
      .to(
        s,
        {
          scatter: 0.05,
          turbulence: 0.12,
          camZ: 5.6 + 0.4 * cs,
          camY: 0.1,
          duration: 0.3,
          ease: 'none',
        },
        0.7
      );

    this.triggers.push(f1Tl.scrollTrigger);

    // ---------- FEATURE 02 — Bulb → Globe ----------
    const f2Tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#feature-02',
        start: 'top 75%',
        end: 'bottom top',
        scrub,
        onEnter: () => {
          this._setPair('bulb', 'globe');
          // Reset progress so pair starts at bulb
          s.morphProgress = 0;
          this.morph?.setProgress(0);
          revealLines('#feature-02');
        },
        onUpdate: () => this._syncMorphParams(),
      },
    });

    f2Tl
      .fromTo(
        s,
        {
          morphProgress: 0,
          scatter: 0.05,
          scale: 1.05,
          camX: -0.2,
          fov: 40,
        },
        {
          scatter: this.isMobile ? 0.2 : 0.35,
          scale: 1.15,
          camX: 0.25 * cs,
          fov: 44,
          duration: 0.3,
          ease: 'none',
        },
        0
      )
      .to(
        s,
        {
          morphProgress: 1,
          duration: 0.45,
          ease: 'none',
        },
        0.25
      )
      .to(
        s,
        {
          scatter: 0,
          scale: 1.0,
          turbulence: 0.1,
          camZ: 5.2,
          duration: 0.3,
          ease: 'none',
        },
        0.7
      );

    this.triggers.push(f2Tl.scrollTrigger);

    // ---------- FEATURE 03 — Globe → Network ----------
    const f3Tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#feature-03',
        start: 'top 75%',
        end: 'bottom top',
        scrub,
        onEnter: () => {
          this._setPair('globe', 'network');
          s.morphProgress = 0;
          this.morph?.setProgress(0);
          revealLines('#feature-03');
        },
        onUpdate: () => this._syncMorphParams(),
      },
    });

    f3Tl
      .fromTo(
        s,
        {
          morphProgress: 0,
          scatter: 0,
          rotY: 0.8,
          camZ: 5.2,
        },
        {
          scatter: this.isMobile ? 0.3 : 0.5,
          rotY: 1.4,
          camZ: 5.2 + 0.9 * cs,
          duration: 0.3,
          ease: 'none',
        },
        0
      )
      .to(
        s,
        {
          morphProgress: 1,
          duration: 0.45,
          ease: 'none',
        },
        0.25
      )
      .to(
        s,
        {
          scatter: 0.08,
          turbulence: 0.18,
          springStrength: 3.8,
          duration: 0.3,
          ease: 'none',
        },
        0.7
      );

    this.triggers.push(f3Tl.scrollTrigger);

    // ---------- TEAM — orbit, calmer ----------
    const teamTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#team',
        start: 'top 70%',
        end: 'bottom 20%',
        scrub,
        onEnter: () => {
          // Hold network
          this._setPair('globe', 'network');
          s.morphProgress = 1;
          this.morph?.setProgress(1);
          revealLines('#team');
        },
        onUpdate: () => this._syncMorphParams(),
      },
    });

    teamTl.fromTo(
      s,
      {
        camX: 0.2,
        camY: 0.15,
        rotY: 1.4,
        noiseStrength: 0.12,
        scatter: 0.08,
      },
      {
        camX: 0.55 * cs,
        camY: 0.35,
        rotY: 2.2,
        noiseStrength: 0.06,
        scatter: 0.02,
        springStrength: 5.0,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(teamTl.scrollTrigger);

    // ---------- CTA — gather ----------
    const ctaTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#cta',
        start: 'top 75%',
        end: 'bottom 30%',
        scrub,
        onEnter: () => revealLines('#cta'),
        onUpdate: () => this._syncMorphParams(),
      },
    });

    ctaTl.fromTo(
      s,
      {
        gather: 0,
        camZ: 5.5,
        scale: 1,
        springStrength: 5.0,
        scatter: 0.02,
      },
      {
        gather: 1,
        camZ: 4.0,
        camX: 0,
        camY: 0.1,
        scale: 0.85,
        springStrength: 7.0,
        scatter: 0,
        turbulence: 0.05,
        noiseStrength: 0.04,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(ctaTl.scrollTrigger);

    // ---------- FOOTER — fade activity ----------
    const footerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.er-footer',
        start: 'top 90%',
        end: 'bottom bottom',
        scrub,
        onUpdate: () => this._syncMorphParams(),
      },
    });

    footerTl.fromTo(
      s,
      { opacity: 1, noiseStrength: 0.04, camZ: 4.0 },
      {
        opacity: 0.35,
        noiseStrength: 0.02,
        springStrength: 3.0,
        camZ: 4.5,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(footerTl.scrollTrigger);

    // Refresh after layout settles
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  /**
   * Apply state to camera + particles each frame.
   * Called from Experience.tick.
   */
  update() {
    const s = this.state;
    const cam = this.camera?.instance;
    if (cam) {
      cam.position.set(s.camX, s.camY, s.camZ);
      cam.lookAt(s.lookX, s.lookY, s.lookZ);
      if (Math.abs(cam.fov - s.fov) > 0.01) {
        cam.fov = s.fov;
        cam.updateProjectionMatrix();
      }
    }

    const mesh = this.particles?.mesh;
    if (mesh) {
      // Timeline rot adds on top of base spin handled in Particles
      mesh.scale.setScalar(s.scale);
      if (mesh.material && mesh.material.opacity !== undefined) {
        // ShaderMaterial uses fragment alpha; modulate via uniform if present
      }
      // Store timeline rotation for Particles to combine
      this.particles._timelineRotY = s.rotY;
      this.particles._timelineRotX = s.rotX;
      this.particles._timelineOpacity = s.opacity;
      this.particles._timelineGather = s.gather;
    }

    this._syncMorphParams();
  }

  destroy() {
    this.triggers.forEach((t) => t?.kill());
    this.triggers = [];
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
}
