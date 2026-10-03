import * as THREE from 'three';

/**
 * Phase 8 — Cinematic camera with named states, damping, dolly & orbit support.
 * TimelineController writes target state; Camera smoothly interpolates each frame.
 */

/** Reusable camera states (desktop baseline). */
export const CAMERA_STATES = {
  HERO: {
    position: [0.15, 0.2, 3.9],
    lookAt: [0, 0.1, 0],
    fov: 40,
    damping: 0.06,
  },
  MANIFESTO: {
    position: [-0.35, 0.4, 5.4],
    lookAt: [0.05, 0.12, 0],
    fov: 38,
    damping: 0.05,
  },
  FEATURE_01: {
    // Diagonal around the object — not pure Z
    position: [1.1, 0.55, 5.0],
    lookAt: [-0.1, 0.05, 0],
    fov: 42,
    damping: 0.045,
  },
  FEATURE_02: {
    // Start of orbital arc (bulb → globe)
    position: [-0.9, 0.35, 5.3],
    lookAt: [0, 0.08, 0],
    fov: 44,
    damping: 0.04,
  },
  FEATURE_02_END: {
    // End of orbit — other side
    position: [0.85, 0.45, 5.6],
    lookAt: [0, 0.05, 0],
    fov: 43,
    damping: 0.04,
  },
  FEATURE_03: {
    // Pull back to reveal full network
    position: [0.4, 0.7, 6.8],
    lookAt: [0, 0, 0],
    fov: 46,
    damping: 0.04,
  },
  TEAM: {
    position: [1.2, 0.5, 6.2],
    lookAt: [0, 0.05, 0],
    fov: 42,
    damping: 0.035,
  },
  TEAM_END: {
    // Subtle orbit end
    position: [0.9, 0.65, 6.4],
    lookAt: [0, 0.08, 0],
    fov: 41,
    damping: 0.035,
  },
  CTA: {
    // Cinematic push-in toward gather point
    position: [0.05, 0.12, 3.6],
    lookAt: [0, 0.05, 0],
    fov: 38,
    damping: 0.05,
  },
  FOOTER: {
    position: [0, 0.3, 5.2],
    lookAt: [0, 0, 0],
    fov: 44,
    damping: 0.04,
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

    // Current smoothed values
    this._pos = new THREE.Vector3(...h.position);
    this._look = new THREE.Vector3(...h.lookAt);
    this._fov = h.fov;

    // Targets (written by Timeline / setState)
    this._targetPos = new THREE.Vector3(...h.position);
    this._targetLook = new THREE.Vector3(...h.lookAt);
    this._targetFov = h.fov;
    this._damping = h.damping;

    // Responsive scale for travel distance
    this.travelScale = this._computeTravelScale();
  }

  _computeTravelScale() {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w < 768) return 0.4;
    if (w < 1024) return 0.65;
    return 1;
  }

  /**
   * Set target from a named state, optionally lerped with another state.
   * @param {string} stateName
   * @param {object} [overrides]  partial { position, lookAt, fov, damping }
   */
  setState(stateName, overrides = {}) {
    const base = CAMERA_STATES[stateName];
    if (!base) {
      console.warn('[Camera] unknown state', stateName);
      return;
    }

    const ts = this.travelScale;
    const pos = overrides.position || base.position;
    const look = overrides.lookAt || base.lookAt;

    // Scale lateral/depth travel on smaller screens (keep Y subtler)
    this._targetPos.set(
      pos[0] * ts,
      pos[1] * (0.6 + 0.4 * ts),
      // Keep minimum distance so object never fills screen on mobile
      THREE.MathUtils.lerp(3.8, pos[2], ts)
    );
    this._targetLook.set(look[0] * ts, look[1], look[2] * ts);
    this._targetFov = overrides.fov ?? base.fov;
    this._damping = overrides.damping ?? base.damping;
  }

  /**
   * Directly set target from raw numbers (used by Timeline scrub interpolation).
   */
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

  /**
   * Interpolate between two named states by t ∈ [0,1].
   * Useful for orbital scrub within a section.
   */
  lerpStates(stateA, stateB, t) {
    const a = CAMERA_STATES[stateA];
    const b = CAMERA_STATES[stateB];
    if (!a || !b) return;

    const tt = THREE.MathUtils.clamp(t, 0, 1);
    // Smoothstep for cinematic ease within the scrub
    const e = tt * tt * (3 - 2 * tt);

    const pos = [
      THREE.MathUtils.lerp(a.position[0], b.position[0], e),
      THREE.MathUtils.lerp(a.position[1], b.position[1], e),
      THREE.MathUtils.lerp(a.position[2], b.position[2], e),
    ];
    const look = [
      THREE.MathUtils.lerp(a.lookAt[0], b.lookAt[0], e),
      THREE.MathUtils.lerp(a.lookAt[1], b.lookAt[1], e),
      THREE.MathUtils.lerp(a.lookAt[2], b.lookAt[2], e),
    ];
    const fov = THREE.MathUtils.lerp(a.fov, b.fov, e);
    const damping = THREE.MathUtils.lerp(a.damping, b.damping, e);

    this.setTarget({
      x: pos[0],
      y: pos[1],
      z: pos[2],
      lookX: look[0],
      lookY: look[1],
      lookZ: look[2],
      fov,
      damping,
    });
  }

  resize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;
    this.travelScale = this._computeTravelScale();
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  /**
   * Damped approach toward targets. Call every frame.
   * @param {number} delta
   */
  update(delta = 0.016) {
    // Frame-rate independent damping
    const k = 1 - Math.exp(-this._damping * 60 * Math.min(delta, 0.05));

    this._pos.lerp(this._targetPos, k);
    this._look.lerp(this._targetLook, k);
    this._fov += (this._targetFov - this._fov) * k;

    this.instance.position.copy(this._pos);
    this.instance.lookAt(this._look);

    if (Math.abs(this.instance.fov - this._fov) > 0.01) {
      this.instance.fov = this._fov;
      this.instance.updateProjectionMatrix();
    }
  }
}
