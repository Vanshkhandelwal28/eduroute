import * as THREE from 'three';
import { isTouchDevice } from '../utils/device.js';

/**
 * Mouse / pointer tracking — allocation-free update loop.
 * Disabled on touch-primary devices.
 */
export default class MouseInteraction {
  constructor({ camera, sizes }) {
    this.camera = camera;
    this.sizes = sizes;

    this._raw = new THREE.Vector2(0, 0);
    this.smooth = new THREE.Vector2(0, 0);
    this.world = new THREE.Vector3(0, 0, 0);
    this._targetWorld = new THREE.Vector3(0, 0, 0);
    this._camDir = new THREE.Vector3();
    this._rotOffset = { x: 0, y: 0 };
    this._currentStrength = 0;

    this.active = false;
    this.enabled = true;
    this.radius = 1.1;
    this.strength = 1.6;

    this.isTouch = isTouchDevice();
    if (this.isTouch) {
      this.enabled = false;
      this.strength = 0;
    }

    this.raycaster = new THREE.Raycaster();
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
    if (e.pointerType === 'touch') return;

    const x = (e.clientX / this.sizes.width) * 2 - 1;
    const y = -(e.clientY / this.sizes.height) * 2 + 1;
    this._raw.set(x, y);
    this.active = true;
  }

  _onLeave() {
    this.active = false;
  }

  update(delta) {
    if (!this.enabled) {
      this._currentStrength = 0;
      return;
    }

    const lerp = 1 - Math.exp(-8 * Math.min(delta, 0.05));

    const targetX = this.active ? this._raw.x : 0;
    const targetY = this.active ? this._raw.y : 0;
    this.smooth.x += (targetX - this.smooth.x) * lerp;
    this.smooth.y += (targetY - this.smooth.y) * lerp;

    this.raycaster.setFromCamera(this.smooth, this.camera);

    // Reuse _camDir — no per-frame allocation
    this.camera.getWorldDirection(this._camDir);
    this.plane.normal.copy(this._camDir).negate();
    this.plane.constant = 0;

    if (this.raycaster.ray.intersectPlane(this.plane, this._hit)) {
      this._targetWorld.copy(this._hit);
    } else {
      this._targetWorld.set(this.smooth.x * 2.2, this.smooth.y * 1.6, 0);
    }

    this.world.lerp(this._targetWorld, lerp);

    const strengthTarget = this.active ? this.strength : 0;
    this._currentStrength += (strengthTarget - this._currentStrength) * lerp;

    // Reuse rotation offset object
    this._rotOffset.x = this.smooth.y * 0.12;
    this._rotOffset.y = this.smooth.x * 0.18;
  }

  get strengthValue() {
    return this._currentStrength;
  }

  get rotationOffset() {
    return this._rotOffset;
  }

  dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this._onMove);
      window.removeEventListener('pointerleave', this._onLeave);
      document.removeEventListener('mouseleave', this._onLeave);
    }
  }
}
