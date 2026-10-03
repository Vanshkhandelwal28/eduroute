import * as THREE from 'three';

/**
 * Phase 5 — Smooth mouse / pointer tracking.
 * Converts screen coords → world position on a plane through the brain center.
 * Disabled / reduced on touch devices.
 */
export default class MouseInteraction {
  /**
   * @param {{ camera: THREE.Camera, sizes: { width: number, height: number } }}
   */
  constructor({ camera, sizes }) {
    this.camera = camera;
    this.sizes = sizes;

    // Raw NDC
    this._raw = new THREE.Vector2(0, 0);
    // Smoothed NDC
    this.smooth = new THREE.Vector2(0, 0);
    // World position on interaction plane
    this.world = new THREE.Vector3(0, 0, 0);
    this._targetWorld = new THREE.Vector3(0, 0, 0);

    this.active = false;
    this.enabled = true;

    // Soft falloff radius in world units
    this.radius = 1.1;
    // Repulsion strength (GPU uniform)
    this.strength = 1.6;

    // Detect touch-primary devices — disable cursor force
    this.isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    if (this.isTouch) {
      this.enabled = false;
      this.strength = 0;
    }

    this.raycaster = new THREE.Raycaster();
    // Plane through origin, facing camera roughly (z-up for brain at origin)
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this._hit = new THREE.Vector3();

    this._onMove = this._onMove.bind(this);
    this._onLeave = this._onLeave.bind(this);

    if (typeof window !== 'undefined' && this.enabled) {
      window.addEventListener('pointermove', this._onMove, { passive: true });
      window.addEventListener('pointerleave', this._onLeave, { passive: true });
      document.addEventListener('mouseleave', this._onLeave, { passive: true });
    }
  }

  _onMove(e) {
    if (!this.enabled) return;
    // Ignore pure touch events if somehow enabled
    if (e.pointerType === 'touch') return;

    const x = (e.clientX / this.sizes.width) * 2 - 1;
    const y = -(e.clientY / this.sizes.height) * 2 + 1;
    this._raw.set(x, y);
    this.active = true;
  }

  _onLeave() {
    this.active = false;
  }

  /**
   * Call every frame. Smooths coords and projects to world space.
   * @param {number} delta
   */
  update(delta) {
    const lerp = 1 - Math.exp(-8 * Math.min(delta, 0.05)); // smooth ~stable

    // Ease toward raw (or toward center when inactive)
    const targetX = this.active ? this._raw.x : 0;
    const targetY = this.active ? this._raw.y : 0;
    this.smooth.x += (targetX - this.smooth.x) * lerp;
    this.smooth.y += (targetY - this.smooth.y) * lerp;

    // Project smoothed NDC onto plane z ≈ 0 through scene center
    this.raycaster.setFromCamera(this.smooth, this.camera);

    // Update plane to face camera so projection stays meaningful as camera moves
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.plane.normal.copy(camDir).negate();
    this.plane.constant = 0; // through origin

    if (this.raycaster.ray.intersectPlane(this.plane, this._hit)) {
      this._targetWorld.copy(this._hit);
    } else {
      // Fallback: approximate with scaled NDC
      this._targetWorld.set(
        this.smooth.x * 2.2,
        this.smooth.y * 1.6,
        0
      );
    }

    // Smooth world position as well
    this.world.lerp(this._targetWorld, lerp);

    // Strength fades when inactive
    const strengthTarget = this.active && this.enabled ? this.strength : 0;
    this._currentStrength =
      (this._currentStrength ?? 0) +
      (strengthTarget - (this._currentStrength ?? 0)) * lerp;
  }

  get strengthValue() {
    return this._currentStrength ?? 0;
  }

  /** Normalized mouse offset for gentle mesh rotation (−1..1). */
  get rotationOffset() {
    return {
      x: this.smooth.y * 0.12, // pitch
      y: this.smooth.x * 0.18, // yaw
    };
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('pointerleave', this._onLeave);
      document.removeEventListener('mouseleave', this._onLeave);
    }
  }
}
