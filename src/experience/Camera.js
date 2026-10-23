import * as THREE from 'three';

/**
 * Cinematic camera states with subtle dolly breathing per section.
 * LookAt bias toward particle offset (x ≈ 1.15) so structure sits right of hero type.
 * Dala-style: slow push-in on hero, pull-back on manifesto, gentle orbit on CTA.
 */

export const CAMERA_STATES = {
  HERO: {
    position: [0.35, 0.15, 4.1],
    lookAt: [1.0, 0.08, 0],
    fov: 40,
    damping: 0.055,
    // Dolly: slow push toward structure during hero hold
    dolly: { zAmp: -0.15, phase: 0 },
  },
  MANIFESTO: {
    position: [-0.2, 0.35, 5.5],
    lookAt: [0.9, 0.1, 0],
    fov: 38,
    damping: 0.045,
    dolly: { zAmp: 0.2, phase: 0.5 },
  },
  FEATURE_01: {
    position: [1.4, 0.5, 5.2],
    lookAt: [0.8, 0.05, 0],
    fov: 42,
    damping: 0.04,
    dolly: { zAmp: 0.1, phase: 1.0 },
  },
  FEATURE_02: {
    position: [-0.6, 0.3, 5.4],
    lookAt: [1.0, 0.08, 0],
    fov: 43,
    damping: 0.038,
    dolly: { zAmp: 0.12, phase: 1.5 },
  },
  FEATURE_02_END: {
    position: [1.5, 0.4, 5.7],
    lookAt: [1.0, 0.05, 0],
    fov: 42,
    damping: 0.038,
    dolly: { zAmp: 0.08, phase: 2.0 },
  },
  FEATURE_03: {
    position: [0.6, 0.65, 6.9],
    lookAt: [1.0, 0, 0],
    fov: 45,
    damping: 0.035,
    dolly: { zAmp: 0.15, phase: 2.5 },
  },
  TEAM: {
    position: [1.5, 0.45, 6.3],
    lookAt: [1.0, 0.05, 0],
    fov: 42,
    damping: 0.03,
    dolly: { zAmp: 0.1, phase: 3.0 },
  },
  TEAM_END: {
    position: [1.1, 0.55, 6.5],
    lookAt: [1.0, 0.08, 0],
    fov: 41,
    damping: 0.03,
    dolly: { zAmp: 0.08, phase: 3.5 },
  },
  CTA: {
    position: [0.9, 0.1, 3.8],
    lookAt: [1.0, 0.05, 0],
    fov: 38,
    damping: 0.045,
    dolly: { zAmp: -0.2, phase: 4.0 },
  },
  FOOTER: {
    position: [0.5, 0.25, 5.4],
    lookAt: [1.0, 0, 0],
    fov: 44,
    damping: 0.035,
    dolly: { zAmp: 0.1, phase: 4.5 },
  },
};

export default class Camera {
  constructor({ sizes }) {
    this.sizes = sizes;

    this.instance = new THREE.PerspectiveCamera(
      CAMERA_STATES.HERO.fov,
      this.sizes.width / this.sizes.height,
      0.1,
      60
    );

    const h = CAMERA_STATES.HERO;
    this.instance.position.set(...h.position);
    this.instance.lookAt(...h.lookAt);

    this._pos = new THREE.Vector3(...h.position);
    this._look = new THREE.Vector3(...h.lookAt);
    this._fov = h.fov;

    this._targetPos = new THREE.Vector3(...h.position);
    this._targetLook = new THREE.Vector3(...h.lookAt);
    this._targetFov = h.fov;
    this._damping = h.damping;

    this.travelScale = this._computeTravelScale();
    this._elapsed = 0;
  }

  _computeTravelScale() {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w < 768) return 0.4;
    if (w < 1024) return 0.65;
    return 1;
  }

  setState(stateName, overrides = {}) {
    const base = CAMERA_STATES[stateName];
    if (!base) return;

    const ts = this.travelScale;
    const pos = overrides.position || base.position;
    const look = overrides.lookAt || base.lookAt;

    this._targetPos.set(
      pos[0] * ts,
      pos[1] * (0.6 + 0.4 * ts),
      THREE.MathUtils.lerp(3.8, pos[2], ts)
    );
    this._targetLook.set(look[0] * ts, look[1], look[2] * ts);
    this._targetFov = overrides.fov ?? base.fov;
    this._damping = overrides.damping ?? base.damping;
  }

  setTarget({ x, y, z, lookX, lookY, lookZ, fov, damping }) {
    const ts = this.travelScale;
    if (x !== undefined) this._targetPos.x = x * ts;
    if (y !== undefined) this._targetPos.y = y * (0.6 + 0.4 * ts);
    if (z !== undefined) {
      this._targetPos.z = THREE.MathUtils.lerp(3.8, z, ts);
    }
    if (lookX !== undefined) this._targetLook.x = lookX * ts;
    if (lookY !== undefined) this._targetLook.y = lookY;
    if (lookZ !== undefined) this._targetLook.z = lookZ * ts;
    if (fov !== undefined) this._targetFov = fov;
    if (damping !== undefined) this._damping = damping;
  }

  lerpStates(stateA, stateB, t) {
    const a = CAMERA_STATES[stateA];
    const b = CAMERA_STATES[stateB];
    if (!a || !b) return;

    const tt = THREE.MathUtils.clamp(t, 0, 1);
    const e = tt * tt * (3 - 2 * tt);

    this.setTarget({
      x: THREE.MathUtils.lerp(a.position[0], b.position[0], e),
      y: THREE.MathUtils.lerp(a.position[1], b.position[1], e),
      z: THREE.MathUtils.lerp(a.position[2], b.position[2], e),
      lookX: THREE.MathUtils.lerp(a.lookAt[0], b.lookAt[0], e),
      lookY: THREE.MathUtils.lerp(a.lookAt[1], b.lookAt[1], e),
      lookZ: THREE.MathUtils.lerp(a.lookAt[2], b.lookAt[2], e),
      fov: THREE.MathUtils.lerp(a.fov, b.fov, e),
      damping: THREE.MathUtils.lerp(a.damping, b.damping, e),
    });
  }

  resize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;
    this.travelScale = this._computeTravelScale();
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update(delta = 0.016) {
    this._elapsed += delta;

    const k = 1 - Math.exp(-this._damping * 60 * Math.min(delta, 0.05));

    this._pos.lerp(this._targetPos, k);
    this._look.lerp(this._targetLook, k);
    this._fov += (this._targetFov - this._fov) * k;

    // Subtle dolly breathing — slow sine push/pull per section
    const dolly = this._currentDolly;
    if (dolly) {
      const breath = Math.sin(this._elapsed * 0.15 + dolly.phase) * dolly.zAmp;
      this._pos.z += breath * 0.3; // gentle, not jarring
    }

    this.instance.position.copy(this._pos);
    this.instance.lookAt(this._look);

    if (Math.abs(this.instance.fov - this._fov) > 0.01) {
      this.instance.fov = this._fov;
      this.instance.updateProjectionMatrix();
    }
  }

  // Called by Timeline to set current dolly params
  setDolly(dolly) {
    this._currentDolly = dolly || null;
  }
}
