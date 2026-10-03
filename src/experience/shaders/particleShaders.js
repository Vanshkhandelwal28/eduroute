/**
 * Particle render shaders — balanced visibility (readable structure, no white-out).
 */

export const particleVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBreathAmount;
uniform float uBreathSpeed;
uniform sampler2D uPositionTexture;
uniform float uTexSize;

attribute float aScale;
attribute float aSeed;
attribute float aBrightness;
attribute float aIndex;

varying float vBrightness;
varying float vSeed;

void main() {
  vBrightness = aBrightness;
  vSeed = aSeed;

  float id = aIndex;
  float ts = uTexSize;
  float x = mod(id, ts);
  float y = floor(id / ts);
  vec2 uv = (vec2(x, y) + 0.5) / ts;

  vec4 posData = texture2D(uPositionTexture, uv);
  vec3 simPos = posData.xyz;

  vec3 local = position * aScale;

  float angle = aSeed * 6.2831853 + uTime * 0.04;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  vec3 worldPos = simPos + local;

  float phase = aSeed * 6.2831853;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount * 0.4;
  vec3 dir = normalize(simPos + vec3(0.0001));
  worldPos += dir * breath;

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const particleFragmentShader = /* glsl */ `
uniform float uOpacity;

varying float vBrightness;
varying float vSeed;

void main() {
  // Cool white base + soft violet tint
  vec3 base = vec3(0.88, 0.86, 0.94);
  vec3 accent = vec3(0.55, 0.38, 0.95);
  float tint = fract(vSeed * 7.13);
  vec3 col = mix(base, accent, tint * 0.25);

  // Visible but not blown-out — mid luminance for selective bloom
  col *= (0.45 + vBrightness * 0.50);

  float alpha = 0.55 * uOpacity;

  gl_FragColor = vec4(col, alpha);
}
`;
