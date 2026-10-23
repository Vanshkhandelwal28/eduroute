/**
 * Generate an organic brain-like point cloud.
 * Uses layered noise displacement on an elongated sphere
 * with bilateral symmetry and subtle folds.
 * Returns Float32Array of length count * 3.
 */

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function noise3(x, y, z) {
  const n =
    Math.sin(x * 1.7 + y * 2.3 + z * 1.1) * 0.5 +
    Math.sin(x * 3.1 - y * 1.9 + z * 2.7) * 0.25 +
    Math.sin(x * 5.3 + y * 4.1 - z * 3.2) * 0.125;
  return n;
}

/**
 * @param {number} count
 * @returns {Float32Array} xyz positions
 */
export function createBrainShape(count) {
  const positions = new Float32Array(count * 3);

  // Brain aspect: slightly wider than tall, elongated front-back
  const scaleX = 1.15;
  const scaleY = 0.95;
  const scaleZ = 1.35;

  for (let i = 0; i < count; i++) {
    // Fibonacci-ish sphere sampling for even distribution
    const t = i / count;
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = Math.PI * (1 + Math.sqrt(5)) * i;

    let x = Math.sin(inclination) * Math.cos(azimuth);
    let y = Math.cos(inclination);
    let z = Math.sin(inclination) * Math.sin(azimuth);

    // Organic displacement — multi-octave noise for folds
    const n1 = noise3(x * 2.2, y * 2.2, z * 2.2);
    const n2 = noise3(x * 5.5 + 1.3, y * 5.5, z * 5.5 - 0.7);
    const n3 = noise3(x * 11.0, y * 11.0 + 2.1, z * 11.0);

    // Stronger displacement near the "cortex" surface
    const fold = 0.18 * n1 + 0.09 * n2 + 0.04 * n3;

    // Slight bilateral emphasis (left/right hemispheres)
    const hemisphere = Math.sign(x) * 0.04 * Math.abs(x);

    // Push outward + folds
    const radius = 1.0 + fold + hemisphere;

    x *= radius * scaleX;
    y *= radius * scaleY;
    z *= radius * scaleZ;

    // Subtle vertical bias (brain sits a bit higher)
    y += 0.08;

    // Small random jitter so it doesn't look perfectly sampled
    const j = hash(i * 0.137 + 19.7);
    x += (j - 0.5) * 0.04;
    y += (hash(i * 0.271 + 3.1) - 0.5) * 0.03;
    z += (hash(i * 0.419 + 7.9) - 0.5) * 0.04;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

/**
 * Responsive particle count.
 */
export function getParticleCount() {
  if (typeof window === 'undefined') return 12000;
  const w = window.innerWidth;
  if (w < 640) return 3072; // mobile
  if (w < 1024) return 6144; // tablet
  return 14000; // desktop (within 10k–16k)
}
