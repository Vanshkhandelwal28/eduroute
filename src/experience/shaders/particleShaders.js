/**
 * Particle shaders — high readability on black background.
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

  float angle = aSeed * 6.2831853 + uTime * 0.03;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  local.xy = rot * local.xy;

  vec3 worldPos = simPos + local;

  float phase = aSeed * 6.2831853;
  float breath = sin(uTime * uBreathSpeed + phase) * uBreathAmount * 0.35;
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
  // Bright cool-white with soft violet variation
  vec3 base = vec3(0.95, 0.94, 1.0);
  vec3 accent = vec3(0.65, 0.48, 1.0);
  float tint = fract(vSeed * 7.13);
  vec3 col = mix(base, accent, tint * 0.22);

  // Strong mid-to-high luminance so structure reads on pure black
  col *= (0.7 + vBrightness * 0.35);

  float alpha = 0.78 * uOpacity;

  gl_FragColor = vec4(col, alpha);
}
`;
