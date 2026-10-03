// Ink-and-pencil post-process, after Maxime Heckel, "Moebius-style post-processing"
// (blog.maximeheckel.com/posts/moebius-style-post-processing).
// Inputs: the lit scene (tone in rgb; the body mask comes from depth), its depth, and view-space normals.
// Output: ink outlines from Sobel edges on depth and normals, pencil cross-hatching from tone,
// paper inside the body and transparent paper around it, premultiplied for the page.
import { Color, LinearSRGBColorSpace, Vector2, type DepthTexture, type Texture } from 'three'

export const INK = '#1F1C17'
export const PENCIL = '#57524A'
export const PAPER = '#F5F0E6'

export const inkVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const inkFragmentShader = /* glsl */ `
#include <packing>
precision highp float;

varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
uniform float uPx;
uniform vec3 uLine;
uniform vec3 uPencil;
uniform vec3 uPaper;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float linearDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  float viewZ = perspectiveDepthToViewZ(z, uNear, uFar);
  return viewZToOrthographicDepth(viewZ, uNear, uFar);
}

// One family of parallel pencil strokes. v is the coordinate across the strokes.
float strokes(float v, float spacing, float width) {
  float d = abs(mod(v, spacing) - 0.5 * spacing);
  return 1.0 - smoothstep(width * 0.5, width * 0.5 + uPx, d);
}

void main() {
  vec2 px = 1.0 / uResolution;
  vec2 frag = vUv * uResolution / uPx;

  // A slow, fixed wobble of the sample positions: the line drifts like a hand-drawn one.
  vec2 wob = vec2(noise(frag * 0.045), noise(frag * 0.045 + 31.7)) - 0.5;
  vec2 uv = vUv + wob * 2.2 * uPx * px;

  // Sobel on depth and normals.
  float gxD = 0.0;
  float gyD = 0.0;
  vec3 gxN = vec3(0.0);
  vec3 gyN = vec3(0.0);
  float kx[9];
  kx[0] = -1.0; kx[1] = 0.0; kx[2] = 1.0;
  kx[3] = -2.0; kx[4] = 0.0; kx[5] = 2.0;
  kx[6] = -1.0; kx[7] = 0.0; kx[8] = 1.0;
  float ky[9];
  ky[0] = -1.0; ky[1] = -2.0; ky[2] = -1.0;
  ky[3] = 0.0;  ky[4] = 0.0;  ky[5] = 0.0;
  ky[6] = 1.0;  ky[7] = 2.0;  ky[8] = 1.0;
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 3; i++) {
      vec2 o = vec2(float(i - 1), float(j - 1)) * px * uPx;
      float d = linearDepth(uv + o);
      vec3 n = texture2D(tNormal, uv + o).rgb;
      int k = j * 3 + i;
      gxD += kx[k] * d;
      gyD += ky[k] * d;
      gxN += kx[k] * n;
      gyN += ky[k] * n;
    }
  }
  float depthEdge = smoothstep(0.004, 0.012, sqrt(gxD * gxD + gyD * gyD));
  float normalEdge = smoothstep(0.8, 1.4, sqrt(dot(gxN, gxN) + dot(gyN, gyN)));
  // Break the line a little, as a pen lifts.
  float lift = smoothstep(0.18, 0.32, noise(frag * 0.09 + 7.0));
  float edge = max(depthEdge, normalEdge * mix(0.55, 1.0, lift));

  vec4 scene = texture2D(tColor, vUv);
  float tone = pow(dot(scene.rgb, vec3(0.299, 0.587, 0.114)), 1.0 / 2.2);
  float body = step(texture2D(tDepth, vUv).x, 0.99999);

  // Cross-hatching in screen space, three tones, with a wobble so strokes are not ruled.
  vec2 h = frag + wob * 3.0;
  float spacing = 5.0;
  float width = 0.9;
  float hatch = 0.0;
  hatch = max(hatch, strokes(h.x + h.y, spacing, width) * (1.0 - smoothstep(0.76, 0.82, tone)));
  hatch = max(hatch, strokes(h.x - h.y, spacing, width) * (1.0 - smoothstep(0.54, 0.6, tone)));
  hatch = max(hatch, strokes(h.x + h.y + spacing * 0.5, spacing, width) * (1.0 - smoothstep(0.28, 0.34, tone)));
  // Pencil pressure varies along the stroke.
  hatch *= mix(0.55, 0.9, noise(h * 0.06 + 3.0));

  vec3 color = uPaper;
  float alpha = body;
  color = mix(color, uPencil, hatch);
  alpha = max(alpha, hatch);
  color = mix(color, uLine, edge);
  alpha = max(alpha, edge);
  gl_FragColor = vec4(color * alpha, alpha);
}
`

export interface InkUniforms {
  [name: string]: { value: unknown }
  tColor: { value: Texture | null }
  tDepth: { value: DepthTexture | null }
  tNormal: { value: Texture | null }
  uResolution: { value: Vector2 }
  uNear: { value: number }
  uFar: { value: number }
  uPx: { value: number }
  uLine: { value: Color }
  uPencil: { value: Color }
  uPaper: { value: Color }
}

/** Keeps the sRGB numbers as they are: the ink pass writes straight to the page. */
export function rawColor(hex: string): Color {
  return new Color().setStyle(hex, LinearSRGBColorSpace)
}

export function createInkUniforms(lineInk: string = INK): InkUniforms {
  return {
    tColor: { value: null },
    tDepth: { value: null },
    tNormal: { value: null },
    uResolution: { value: new Vector2(1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 20 },
    uPx: { value: 1 },
    uLine: { value: rawColor(lineInk) },
    uPencil: { value: rawColor(PENCIL) },
    uPaper: { value: rawColor(PAPER) },
  }
}

// Soft shadow under the animal. Drawn into the scene pass as tone only, without depth, so
// the ink pass turns it into hatching on the open page.
export const shadowVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const shadowFragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uStrength;
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float shade = (1.0 - smoothstep(0.15, 1.0, r)) * uStrength;
  gl_FragColor = vec4(vec3(1.0 - shade), 0.0);
}
`
