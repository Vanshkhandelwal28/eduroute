/**
 * Divergence-free curl noise (Bridson-style) for river-like particle flow.
 * v = ∇ × ψ  ⇒  ∇ · v ≈ 0  (no artificial sources/sinks).
 */

/** Hash → [0, 1) */
function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Smooth quintic fade */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Value-noise at a point (cheap, continuous enough for curl FD).
 * Domain is continuous in x,y,z.
 */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const h = (i: number, j: number, k: number) => hash3(i, j, k);

  const c000 = h(xi, yi, zi);
  const c100 = h(xi + 1, yi, zi);
  const c010 = h(xi, yi + 1, zi);
  const c110 = h(xi + 1, yi + 1, zi);
  const c001 = h(xi, yi, zi + 1);
  const c101 = h(xi + 1, yi, zi + 1);
  const c011 = h(xi, yi + 1, zi + 1);
  const c111 = h(xi + 1, yi + 1, zi + 1);

  const x00 = lerp(c000, c100, u);
  const x10 = lerp(c010, c110, u);
  const x01 = lerp(c001, c101, u);
  const x11 = lerp(c011, c111, u);
  const y0 = lerp(x00, x10, v);
  const y1 = lerp(x01, x11, v);
  return lerp(y0, y1, w);
}

/** Multi-octave noise */
export function fbm3(x: number, y: number, z: number, octaves = 3): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / (norm || 1);
}

export type Vec3 = { x: number; y: number; z: number };

/**
 * 3D curl of a potential field ψ = (fbm, fbm_offset, fbm_offset2).
 * Finite differences approximate ∇ × ψ.
 */
export function curlNoise(
  x: number,
  y: number,
  z: number,
  t: number,
  scale = 0.55,
): Vec3 {
  const e = 0.01;
  const px = x * scale;
  const py = y * scale;
  const pz = z * scale;
  const pt = t * 0.12;

  // Three offset potential scalars
  const pot = (X: number, Y: number, Z: number, seed: number) =>
    fbm3(X + seed * 17.1, Y + seed * 31.3, Z + seed * 7.9 + pt, 3);

  // ψx, ψy, ψz and their partials via central differences
  const dψz_dy =
    (pot(px, py + e, pz, 2) - pot(px, py - e, pz, 2)) / (2 * e);
  const dψy_dz =
    (pot(px, py, pz + e, 1) - pot(px, py, pz - e, 1)) / (2 * e);

  const dψx_dz =
    (pot(px, py, pz + e, 0) - pot(px, py, pz - e, 0)) / (2 * e);
  const dψz_dx =
    (pot(px + e, py, pz, 2) - pot(px - e, py, pz, 2)) / (2 * e);

  const dψy_dx =
    (pot(px + e, py, pz, 1) - pot(px - e, py, pz, 1)) / (2 * e);
  const dψx_dy =
    (pot(px, py + e, pz, 0) - pot(px, py - e, pz, 0)) / (2 * e);

  // ∇ × ψ
  return {
    x: dψz_dy - dψy_dz,
    y: dψx_dz - dψz_dx,
    z: dψy_dx - dψx_dy,
  };
}
