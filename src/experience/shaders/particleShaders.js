/**
 * Particle shaders — Dala-matched multi-color palette.
 * Purple / magenta / coral / amber — brighter and more saturated.
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
  // Dala palette (exact-ish): purple, coral, magenta, amber
  vec3 c0 = vec3(0.588, 0.235, 0.741); // #963cbd
  vec3 c1 = vec3(1.000, 0.435, 0.380); // #ff6f61
  vec3 c2 = vec3(0.773, 0.161, 0.608); // #c5299b
  vec3 c3 = vec3(0.996, 0.682, 0.318); // #feae51

  float t = fract(vSeed * 7.13);
  vec3 col;
  if (t < 0.25) col = mix(c0, c2, t * 4.0);
  else if (t < 0.50) col = mix(c2, c1, (t - 0.25) * 4.0);
  else if (t < 0.75) col = mix(c1, c3, (t - 0.50) * 4.0);
  else col = mix(c3, c0, (t - 0.75) * 4.0);

  // Brighter than before so structure reads on purple bg
  col *= (0.55 + vBrightness * 0.55);

  float alpha = 0.72 * uOpacity;

  gl_FragColor = vec4(col, alpha);
}
`;
