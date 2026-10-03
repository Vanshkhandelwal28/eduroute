/**
 * GPU compute shaders for particle simulation.
 * Phase 4: spring, noise, damping.
 * Phase 5: subtle mouse repulsion field.
 */

export const velocityFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uDelta;
uniform float uDamping;
uniform float uSpringStrength;
uniform float uNoiseStrength;
uniform sampler2D uTarget;

// Phase 5 — mouse
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

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 posData = texture2D(texturePosition, uv);
  vec4 velData = texture2D(textureVelocity, uv);
  vec3 pos = posData.xyz;
  vec3 vel = velData.xyz;
  float seed = posData.w;

  vec3 target = texture2D(uTarget, uv).xyz;

  // --- Spring force toward target (return home) ---
  vec3 toTarget = target - pos;
  vec3 springForce = toTarget * uSpringStrength;

  // --- Subtle noise force ---
  vec3 noiseCoord = pos * 1.8 + vec3(uTime * 0.15, uTime * 0.11, uTime * 0.09);
  vec3 noiseForce = noise3(noiseCoord) * uNoiseStrength;
  float phase = seed * 6.2831853;
  noiseForce *= (0.7 + 0.3 * sin(uTime * 0.4 + phase));

  // --- Mouse repulsion (cinematic, soft falloff) ---
  vec3 mouseForce = vec3(0.0);
  if (uMouseStrength > 0.001) {
    vec3 toMouse = pos - uMouse;
    float dist = length(toMouse);
    float radius = max(uMouseRadius, 0.15);

    // Smooth soft-knee falloff — strong near cursor, zero past radius
    float influence = 1.0 - smoothstep(0.0, radius, dist);
    influence = influence * influence; // ease

    // Softened inverse-distance so it never explodes at center
    float soft = 1.0 / (dist * dist + 0.12);
    vec3 dir = dist > 0.0001 ? toMouse / dist : vec3(0.0, 1.0, 0.0);

    // Cap magnitude
    mouseForce = dir * soft * influence * uMouseStrength * 0.35;
    float mLen = length(mouseForce);
    if (mLen > 3.0) mouseForce *= 3.0 / mLen;
  }

  // --- Integrate ---
  vel += springForce * uDelta;
  vel += noiseForce * uDelta;
  vel += mouseForce * uDelta;
  vel *= uDamping;

  // Soft velocity clamp
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
