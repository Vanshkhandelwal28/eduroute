/**
 * GPU compute shaders.
 * Phase 4–5: spring, noise, damping, mouse.
 * Phase 6: dual-target morph with seed delay + scatter + turbulence.
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

// Smoothstep ease
float easeInOut(float t) {
  return t * t * (3.0 - 2.0 * t);
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

  // --- Per-particle delayed morph progress ---
  // seed 0..1 → delay offset so particles don't move in lockstep
  float delay = seed * 0.35; // up to 35% lag
  float rawT = (uMorphProgress - delay) / max(1.0 - delay, 0.001);
  float t = clamp(rawT, 0.0, 1.0);
  t = easeInOut(t);

  // Small overshoot near the middle of the transition
  float overshoot = sin(t * 3.14159) * 0.08 * (1.0 - abs(uMorphProgress - 0.5) * 2.0);
  float tMorph = clamp(t + overshoot, 0.0, 1.0);

  // Base blended target
  vec3 target = mix(shapeA, shapeB, tMorph);

  // Scatter — push outward during mid-morph
  float scatterWave = sin(uMorphProgress * 3.14159); // peaks at 0.5
  vec3 scatterDir = normalize(shapeA + vec3(0.001));
  // Alternate outward from A or B based on seed
  if (seed > 0.5) scatterDir = normalize(shapeB + vec3(0.001));
  target += scatterDir * uScatter * scatterWave * (0.5 + seed * 0.5);

  // Turbulence offset on target during transition
  vec3 turb = noise3(pos * 2.5 + vec3(uTime * 0.3, seed * 4.0, uTime * 0.2));
  target += turb * uTurbulence * scatterWave;

  // --- Spring toward morphing target ---
  vec3 toTarget = target - pos;
  vec3 springForce = toTarget * uSpringStrength;

  // --- Ambient noise ---
  vec3 noiseCoord = pos * 1.8 + vec3(uTime * 0.15, uTime * 0.11, uTime * 0.09);
  vec3 noiseForce = noise3(noiseCoord) * uNoiseStrength;
  float phase = seed * 6.2831853;
  noiseForce *= (0.7 + 0.3 * sin(uTime * 0.4 + phase));

  // --- Mouse repulsion ---
  vec3 mouseForce = vec3(0.0);
  if (uMouseStrength > 0.001) {
    vec3 toMouse = pos - uMouse;
    float dist = length(toMouse);
    float radius = max(uMouseRadius, 0.15);
    float influence = 1.0 - smoothstep(0.0, radius, dist);
    influence *= influence;
    float soft = 1.0 / (dist * dist + 0.12);
    vec3 dir = dist > 0.0001 ? toMouse / dist : vec3(0.0, 1.0, 0.0);
    mouseForce = dir * soft * influence * uMouseStrength * 0.35;
    float mLen = length(mouseForce);
    if (mLen > 3.0) mouseForce *= 3.0 / mLen;
  }

  // --- Integrate ---
  vel += springForce * uDelta;
  vel += noiseForce * uDelta;
  vel += mouseForce * uDelta;
  vel *= uDamping;

  float speed = length(vel);
  if (speed > 2.5) {
    vel *= 2.5 / speed;
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
