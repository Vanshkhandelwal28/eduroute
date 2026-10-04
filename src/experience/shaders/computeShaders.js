/**
 * GPU compute — spring morph with spatial stagger, arc paths, soft damping.
 * Tuned for slow cinematic transitions (brain → bulb → globe → network).
 */

export const velocityFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uDelta;
uniform float uDamping;
uniform float uSpringStrength;
uniform float uNoiseStrength;

// Dual morph targets
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;
uniform float uMorphProgress;
uniform float uScatter;
uniform float uTurbulence;

// Mouse
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;

vec3 hash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
}

vec3 noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
        mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
        mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}

// Ken Perlin smootherstep — C2 continuous, no harsh acceleration
float smootherstep(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 posData = texture2D(texturePosition, uv);
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 pos = posData.xyz;
  vec3 vel = velData.xyz;
  float seed = posData.w;

  vec3 shapeA = texture2D(uTargetA, uv).xyz;
  vec3 shapeB = texture2D(uTargetB, uv).xyz;

  // ── Spatial stagger ──────────────────────────────────────────
  // Neighbors share similar delay → wave-like fronts instead of noise
  float spatial = (shapeA.x + shapeA.y * 0.7 + shapeA.z * 1.1) * 0.35;
  spatial = fract(spatial * 0.5 + 0.5);
  float delay = mix(seed, spatial, 0.55) * 0.42;

  float rawT = (uMorphProgress - delay) / max(1.0 - delay, 0.001);
  float t = clamp(rawT, 0.0, 1.0);
  t = smootherstep(t);

  // Soft overshoot only near mid-transition (organic settle)
  float mid = sin(t * 3.14159265);
  float overshoot = mid * 0.045 * (1.0 - abs(uMorphProgress - 0.5) * 2.0);
  float tMorph = clamp(t + overshoot, 0.0, 1.0);

  // ── Arc path (not pure lerp) ─────────────────────────────────
  // Particles bulge outward mid-morph for a fluid dissolve/reform
  vec3 chord = shapeB - shapeA;
  vec3 midPoint = (shapeA + shapeB) * 0.5;
  float chordLen = length(chord);
  vec3 radial = normalize(midPoint + vec3(0.0001));
  // Prefer outward from origin; fall back to perpendicular if near center
  if (length(midPoint) < 0.08) {
    radial = normalize(cross(chord + vec3(0.001, 0.0, 0.0), vec3(0.0, 1.0, 0.0)) + vec3(0.0001));
  }
  float arcHeight = chordLen * 0.22 * mid + uScatter * mid * 0.55;
  vec3 arcOffset = radial * arcHeight * (0.65 + seed * 0.35);

  vec3 linearTarget = mix(shapeA, shapeB, tMorph);
  vec3 target = linearTarget + arcOffset;

  // Scatter — coherent outward push, seed-weighted
  float scatterWave = sin(uMorphProgress * 3.14159265);
  vec3 scatterDir = normalize(mix(shapeA, shapeB, 0.5) + vec3(0.001));
  target += scatterDir * uScatter * scatterWave * (0.4 + seed * 0.6);

  // Turbulence — low-frequency curl during transition only
  vec3 turbCoord = pos * 1.6 + vec3(uTime * 0.18, seed * 3.2, uTime * 0.14);
  vec3 turb = noise3(turbCoord);
  // Slight curl for fluid motion
  vec3 turb2 = noise3(turbCoord + vec3(17.1, 9.3, 5.7));
  turb = normalize(turb + cross(turb, turb2) * 0.35 + vec3(0.0001));
  target += turb * uTurbulence * scatterWave * 0.85;

  // ── Distance-aware spring (critical-ish) ─────────────────────
  vec3 toTarget = target - pos;
  float dist = length(toTarget);
  // Soften spring when far so particles don't snap; strengthen near settle
  float springMul = mix(0.55, 1.15, smootherstep(1.0 - clamp(dist * 0.45, 0.0, 1.0)));
  // Extra ease during active morph
  float morphEase = mix(1.0, 0.72, scatterWave);
  vec3 springForce = toTarget * uSpringStrength * springMul * morphEase;

  // ── Ambient breath noise ─────────────────────────────────────
  vec3 noiseCoord = pos * 1.5 + vec3(uTime * 0.12, uTime * 0.09, uTime * 0.07);
  vec3 noiseForce = noise3(noiseCoord) * uNoiseStrength;
  float phase = seed * 6.2831853;
  noiseForce *= (0.75 + 0.25 * sin(uTime * 0.35 + phase));

  // ── Mouse repulsion ──────────────────────────────────────────
  vec3 mouseForce = vec3(0.0);
  if (uMouseStrength > 0.001) {
    vec3 toMouse = pos - uMouse;
    float mDist = length(toMouse);
    float radius = max(uMouseRadius, 0.15);
    float influence = 1.0 - smoothstep(0.0, radius, mDist);
    influence *= influence;
    float soft = 1.0 / (mDist * mDist + 0.15);
    vec3 dir = mDist > 0.0001 ? toMouse / mDist : vec3(0.0, 1.0, 0.0);
    mouseForce = dir * soft * influence * uMouseStrength * 0.32;
    float mLen = length(mouseForce);
    if (mLen > 2.4) mouseForce *= 2.4 / mLen;
  }

  // ── Integrate with velocity damping ──────────────────────────
  vel += springForce * uDelta;
  vel += noiseForce * uDelta;
  vel += mouseForce * uDelta;

  // Adaptive damping: more friction when close to target → soft land
  float adaptiveDamp = mix(uDamping, min(uDamping + 0.04, 0.97), clamp(1.0 - dist * 0.8, 0.0, 1.0));
  vel *= adaptiveDamp;

  float speed = length(vel);
  if (speed > 1.8) {
    vel *= 1.8 / speed;
  }

  gl_FragColor = vec4(vel, seed);
}
`;

export const positionFragmentShader = /* glsl */ `
uniform float uDelta;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 posData = texture2D(texturePosition, uv);
  vec4 velData = texture2D(textureVelocity, uv);

  vec3 pos = posData.xyz;
  vec3 vel = velData.xyz;
  float seed = posData.w;

  pos += vel * uDelta;

  gl_FragColor = vec4(pos, seed);
}
`;
