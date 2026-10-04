import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { revealLines } from './textReveal.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * One coherent cinematic timeline — soft morph peaks, long reform phases.
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

    this.state = {
      rotY: 0,
      rotX: 0,
      scale: 1,
      opacity: 1,
      morphProgress: 0,
      scatter: 0,
      turbulence: 0.07,
      springStrength: 3.8,
      noiseStrength: 0.09,
      gather: 0,
    };

    this._camFrom = 'HERO';
    this._camTo = 'HERO';
    this._camT = 0;

    this.triggers = [];
    this._currentPair = 'brain-brain';
    this._revealed = new Set(['#hero']);

    if (this.reduced) {
      this._setupReduced();
      return;
    }

    this._setup();
  }

  _scrub() {
    if (this.isMobile) return 1.2;
    if (this.isTablet) return 1.5;
    return 2.0;
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

  _setCam(from, to, t = 0) {
    this._camFrom = from;
    this._camTo = to;
    this._camT = t;
  }

  _revealOnce(selector) {
    if (this._revealed.has(selector)) return;
    this._revealed.add(selector);
    revealLines(selector);
  }

  _setupReduced() {
    this._setPair('brain', 'brain');
    this.morph?.setProgress(0);
    this.state.morphProgress = 0;
    this.state.scatter = 0;
    this.state.noiseStrength = 0.04;
    this.camera?.setState('HERO');
  }

  _setup() {
    const s = this.state;
    const scrub = this._scrub();
    const sc = (m, d) => (this.isMobile ? m : d);

    this._setPair('brain', 'brain');
    this.morph?.setProgress(0);
    s.morphProgress = 0;
    this.camera?.setState('HERO');

    // ─── HERO ────────────────────────────────────────────────────
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub,
        onEnterBack: () => {
          this._setPair('brain', 'brain');
          s.morphProgress = 0;
          this.morph?.setProgress(0);
        },
        onUpdate: (self) => {
          this._setCam('HERO', 'MANIFESTO', self.progress * 0.55);
          this._syncMorphParams();
        },
      },
    });

    heroTl.fromTo(
      s,
      {
        rotY: 0,
        noiseStrength: 0.09,
        springStrength: 3.8,
        scatter: 0,
        turbulence: 0.07,
        scale: 1,
      },
      {
        rotY: 0.16,
        noiseStrength: 0.1,
        springStrength: 4.0,
        scatter: 0.01,
        scale: 1.02,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(heroTl.scrollTrigger);

    // ─── MANIFESTO ───────────────────────────────────────────────
    const manifestoTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#manifesto',
        start: 'top 80%',
        end: 'bottom 20%',
        scrub,
        onEnter: () => {
          this._setPair('brain', 'brain');
          s.morphProgress = 0;
          this.morph?.setProgress(0);
          this._revealOnce('#manifesto');
        },
        onEnterBack: () => {
          this._setPair('brain', 'brain');
          this._revealOnce('#manifesto');
        },
        onUpdate: (self) => {
          this._setCam('MANIFESTO', 'FEATURE_01', self.progress * 0.35);
          this._syncMorphParams();
        },
      },
    });

    manifestoTl.fromTo(
      s,
      {
        scale: 1.02,
        scatter: 0.01,
        turbulence: 0.07,
        noiseStrength: 0.1,
        springStrength: 4.0,
        rotY: 0.16,
      },
      {
        scale: 1.05,
        scatter: sc(0.08, 0.14),
        turbulence: 0.12,
        noiseStrength: 0.13,
        springStrength: 3.2,
        rotY: 0.3,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(manifestoTl.scrollTrigger);

    // ─── FEATURE 01 — brain → bulb (long reform) ─────────────────
    const f1Tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#feature-01',
        start: 'top 75%',
        end: 'bottom top',
        scrub,
        onEnter: () => {
          this._setPair('brain', 'bulb');
          s.morphProgress = 0;
          this.morph?.setProgress(0);
          this._revealOnce('#feature-01');
        },
        onEnterBack: () => this._setPair('brain', 'bulb'),
        onLeaveBack: () => {
          this._setPair('brain', 'brain');
          s.morphProgress = 0;
          this.morph?.setProgress(0);
        },
        onUpdate: (self) => {
          this._setCam('FEATURE_01', 'FEATURE_02', self.progress * 0.4);
          this._syncMorphParams();
        },
      },
    });

    f1Tl
      .fromTo(
        s,
        {
          morphProgress: 0,
          scatter: sc(0.08, 0.14),
          turbulence: 0.12,
          springStrength: 3.2,
          rotY: 0.3,
          scale: 1.05,
        },
        {
          scatter: sc(0.18, 0.28),
          turbulence: 0.18,
          springStrength: 2.4,
          rotY: 0.45,
          scale: 1.08,
          duration: 0.18,
          ease: 'none',
        },
        0
      )
      .to(
        s,
        {
          morphProgress: 1,
          springStrength: 2.8,
          duration: 0.55,
          ease: 'none',
        },
        0.18
      )
      .to(
        s,
        {
          scatter: 0.03,
          turbulence: 0.07,
          springStrength: 4.2,
          noiseStrength: 0.07,
          rotY: 0.6,
          scale: 1.02,
          duration: 0.27,
          ease: 'none',
        },
        0.73
      );

    this.triggers.push(f1Tl.scrollTrigger);

    // ─── FEATURE 02 — bulb → globe ───────────────────────────────
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
          this._revealOnce('#feature-02');
        },
        onEnterBack: () => this._setPair('bulb', 'globe'),
        onLeaveBack: () => {
          this._setPair('brain', 'bulb');
          s.morphProgress = 1;
          this.morph?.setProgress(1);
        },
        onUpdate: (self) => {
          this._setCam('FEATURE_02', 'FEATURE_02_END', self.progress);
          this._syncMorphParams();
        },
      },
    });

    f2Tl
      .fromTo(
        s,
        { morphProgress: 0, scatter: 0.03, scale: 1.02, springStrength: 4.2, rotY: 0.6 },
        {
          scatter: sc(0.1, 0.16),
          scale: 1.1,
          springStrength: 2.6,
          rotY: 0.85,
          duration: 0.2,
          ease: 'none',
        },
        0
      )
      .to(s, { morphProgress: 1, duration: 0.55, ease: 'none' }, 0.2)
      .to(
        s,
        {
          scatter: 0.02,
          scale: 1.0,
          turbulence: 0.07,
          springStrength: 4.0,
          rotY: 1.0,
          duration: 0.25,
          ease: 'none',
        },
        0.75
      );

    this.triggers.push(f2Tl.scrollTrigger);

    // ─── FEATURE 03 — globe → network ────────────────────────────
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
          this._revealOnce('#feature-03');
        },
        onEnterBack: () => this._setPair('globe', 'network'),
        onLeaveBack: () => {
          this._setPair('bulb', 'globe');
          s.morphProgress = 1;
          this.morph?.setProgress(1);
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
        { morphProgress: 0, scatter: 0.02, rotY: 1.0, springStrength: 4.0 },
        {
          scatter: sc(0.12, 0.22),
          rotY: 1.25,
          springStrength: 2.4,
          duration: 0.2,
          ease: 'none',
        },
        0
      )
      .to(s, { morphProgress: 1, duration: 0.55, ease: 'none' }, 0.2)
      .to(
        s,
        {
          scatter: 0.03,
          turbulence: 0.08,
          springStrength: 3.8,
          rotY: 1.4,
          duration: 0.25,
          ease: 'none',
        },
        0.75
      );

    this.triggers.push(f3Tl.scrollTrigger);

    // ─── TEAM ────────────────────────────────────────────────────
    const teamTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#team',
        start: 'top 70%',
        end: 'bottom 25%',
        scrub,
        onEnter: () => {
          this._setPair('globe', 'network');
          s.morphProgress = 1;
          this.morph?.setProgress(1);
          this._revealOnce('#team');
        },
        onEnterBack: () => {
          this._setPair('globe', 'network');
          s.morphProgress = 1;
        },
        onUpdate: (self) => {
          this._setCam('TEAM', 'TEAM_END', self.progress);
          this._syncMorphParams();
        },
      },
    });

    teamTl.fromTo(
      s,
      { rotY: 1.4, noiseStrength: 0.07, scatter: 0.03, springStrength: 3.8, turbulence: 0.08 },
      {
        rotY: 1.75,
        noiseStrength: 0.03,
        scatter: 0.01,
        springStrength: 4.8,
        turbulence: 0.04,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(teamTl.scrollTrigger);

    // ─── PARTNERS ────────────────────────────────────────────────
    const partnersTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#partners',
        start: 'top 85%',
        end: 'bottom 40%',
        scrub,
        onUpdate: () => this._syncMorphParams(),
      },
    });

    partnersTl.fromTo(
      s,
      { noiseStrength: 0.03, scatter: 0.01 },
      { noiseStrength: 0.022, scatter: 0.006, ease: 'none', duration: 1 },
      0
    );

    this.triggers.push(partnersTl.scrollTrigger);

    // ─── CTA ─────────────────────────────────────────────────────
    const ctaTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#cta',
        start: 'top 75%',
        end: 'bottom 30%',
        scrub,
        onEnter: () => this._revealOnce('#cta'),
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
        springStrength: 4.8,
        scatter: 0.006,
      },
      {
        gather: 1,
        scale: 0.88,
        springStrength: 6.5,
        scatter: 0,
        turbulence: 0.025,
        noiseStrength: 0.018,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(ctaTl.scrollTrigger);

    // ─── FOOTER ──────────────────────────────────────────────────
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
      { opacity: 1, noiseStrength: 0.018 },
      {
        opacity: 0.28,
        noiseStrength: 0.01,
        springStrength: 2.6,
        ease: 'none',
        duration: 1,
      },
      0
    );

    this.triggers.push(footerTl.scrollTrigger);

    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  update() {
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
        this.particles.mesh.scale.setScalar(1.08 * s.scale);
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
