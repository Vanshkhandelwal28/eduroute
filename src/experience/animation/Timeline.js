import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { revealLines } from './textReveal.js';
import { CAMERA_STATES } from '../Camera.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * TimelineController — master scroll choreography.
 * Phase 7: morph / particles / text
 * Phase 8: drives Camera states (dolly, diagonal, orbit, push-in)
 */
export default class TimelineController {
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

    // Particle / morph state (camera is owned by Camera.js states)
    this.state = {
      rotY: 0,
      rotX: 0,
      scale: 1,
      opacity: 1,
      morphProgress: 0,
      scatter: 0,
      turbulence: 0.15,
      springStrength: 4.5,
      noiseStrength: 0.12,
      gather: 0,
      // Camera blend progress within orbital sections (0–1)
      camBlend: 0,
    };

    // Which camera state(s) are active for this frame
    this._camFrom = 'HERO';
    this._camTo = 'HERO';
    this._camT = 0;

    this.triggers = [];
    this._currentPair = 'brain-bulb';

    if (this.reduced) {
      this._setupReduced();
      return;
    }

    this._setup();
  }

  _scrub() {
    if (this.isMobile) return 0.6;
    if (this.isTablet) return 0.9;
    return 1.2;
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

  /** Set camera interpolation between two named states. */
  _setCam(from, to, t = 0) {
    this._camFrom = from;
    this._camTo = to;
    this._camT = t;
  }

  _setupReduced() {
    this._setPair('brain', 'bulb');
    this.morph?.setProgress(0);
    this.camera?.setState('HERO');
    revealLines('#hero');
  }

  _setup() {
    const s = this.state;
    const scrub = this._scrub();

    this._setPair('brain', 'bulb');
    this.morph?.setProgress(0);
    this.camera?.setState('HERO');

    gsap.delayedCall(0.3, () => revealLines('#hero', { duration: 1.2 }));

    // ---------- HERO → approach MANIFESTO framing ----------
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub,
        onUpdate: (self) => {
          this._setCam('HERO', 'MANIFESTO', self.progress);
          this._syncMorphParams();
        },
      },
    });

    heroTl.fromTo(
      s,
      { rotY: 0, noiseStrength: 0.12 },
      { rotY: 0.35, noiseStrength: 0.18, ease: 'none', duration: 1 },
      0
    );

    this.triggers.push(heroTl.scrollTrigger);

    // ---------- MANIFESTO ----------
    const manifestoTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#manifesto',
        start: 'top 80%',
        end: 'bottom 20%',
        scrub,
        onEnter: () => revealLines('#manifesto'),
        onUpdate: (self) => {
          this._setCam('MANIFESTO', 'FEATURE_01', self.progress * 0.35);
          this._syncMorphParams();
        },
      },
    });

    manifestoTl.fromTo(
      s,
      { scale: 1 },
      { scale: 1.05, ease: 'none', duration: 1 },
      0
    );

    this.triggers.push(manifestoTl.scrollTrigger);

    // ---------- FEATURE 01 — diagonal + Brain → Bulb ----------
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
        onUpdate: (self) => {
          // Hold FEATURE_01 diagonal framing, ease toward FEATURE_02 start
          this._setCam('FEATURE_01', 'FEATURE_02', self.progress * 0.5);
          this._syncMorphParams();
        },
      },
    });

    f1Tl
      .fromTo(
        s,
        { morphProgress: 0, scatter: 0, turbulence: 0.15, rotY: 0.35 },
        {
          scatter: this.isMobile ? 0.25 : 0.45,
          turbulence: 0.35,
          rotY: 0.8,
          duration: 0.25,
          ease: 'none',
        },
        0
      )
      .to(s, { morphProgress: 1, duration: 0.5, ease: 'none' }, 0.2)
      .to(
        s,
        {
          scatter: 0.05,
          turbulence: 0.12,
          duration: 0.3,
          ease: 'none',
        },
        0.7
      );

    this.triggers.push(f1Tl.scrollTrigger);

    // ---------- FEATURE 02 — orbital arc Bulb → Globe ----------
    const f2Tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#feature-02',
        start: 'top 75%',
        end: 'bottom top',
        scrub,
        onEnter: () => {
          this._setPair('bulb', 'globe');
          s.morphProgress = 0;
          this.morph?.setProgress(0);
          revealLines('#feature-02');
        },
        onUpdate: (self) => {
          // Full orbital scrub FEATURE_02 → FEATURE_02_END
          this._setCam('FEATURE_02', 'FEATURE_02_END', self.progress);
          this._syncMorphParams();
        },
      },
    });

    f2Tl
      .fromTo(
        s,
        { morphProgress: 0, scatter: 0.05, scale: 1.05 },
        {
          scatter: this.isMobile ? 0.2 : 0.35,
          scale: 1.15,
          duration: 0.3,
          ease: 'none',
        },
        0
      )
      .to(s, { morphProgress: 1, duration: 0.45, ease: 'none' }, 0.25)
      .to(
        s,
        {
          scatter: 0,
          scale: 1.0,
          turbulence: 0.1,
          duration: 0.3,
          ease: 'none',
        },
        0.7
      );

    this.triggers.push(f2Tl.scrollTrigger);

    // ---------- FEATURE 03 — pull back, Globe → Network ----------
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
        onUpdate: (self) => {
          this._setCam('FEATURE_02_END', 'FEATURE_03', self.progress);
          this._syncMorphParams();
        },
      },
    });

    f3Tl
      .fromTo(
        s,
        { morphProgress: 0, scatter: 0, rotY: 0.8 },
        {
          scatter: this.isMobile ? 0.3 : 0.5,
          rotY: 1.4,
          duration: 0.3,
          ease: 'none',
        },
        0
      )
      .to(s, { morphProgress: 1, duration: 0.45, ease: 'none' }, 0.25)
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

    // ---------- TEAM — slow orbit ----------
    const teamTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#team',
        start: 'top 70%',
        end: 'bottom 20%',
        scrub,
        onEnter: () => {
          this._setPair('globe', 'network');
          s.morphProgress = 1;
          this.morph?.setProgress(1);
          revealLines('#team');
        },
        onUpdate: (self) => {
          this._setCam('TEAM', 'TEAM_END', self.progress);
          this._syncMorphParams();
        },
      },
    });

    teamTl.fromTo(
      s,
      { rotY: 1.4, noiseStrength: 0.12, scatter: 0.08 },
      {
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

    // ---------- CTA — push-in ----------
    const ctaTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#cta',
        start: 'top 75%',
        end: 'bottom 30%',
        scrub,
        onEnter: () => revealLines('#cta'),
        onUpdate: (self) => {
          this._setCam('TEAM_END', 'CTA', self.progress);
          this._syncMorphParams();
        },
      },
    });

    ctaTl.fromTo(
      s,
      {
        gather: 0,
        scale: 1,
        springStrength: 5.0,
        scatter: 0.02,
      },
      {
        gather: 1,
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

    // ---------- FOOTER — pull away ----------
    const footerTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.er-footer',
        start: 'top 90%',
        end: 'bottom bottom',
        scrub,
        onUpdate: (self) => {
          this._setCam('CTA', 'FOOTER', self.progress);
          this._syncMorphParams();
        },
      },
    });

    footerTl.fromTo(
      s,
      { opacity: 1, noiseStrength: 0.04 },
      {
        opacity: 0.35,
        noiseStrength: 0.02,
        springStrength: 3.0,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(footerTl.scrollTrigger);

    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  update() {
    // Apply camera state blend
    if (this.camera && this._camFrom) {
      if (this._camFrom === this._camTo || this._camT < 0.001) {
        this.camera.setState(this._camFrom);
      } else {
        this.camera.lerpStates(this._camFrom, this._camTo, this._camT);
      }
    }

    const s = this.state;
    if (this.particles) {
      if (this.particles.mesh) {
        this.particles.mesh.scale.setScalar(s.scale);
      }
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
