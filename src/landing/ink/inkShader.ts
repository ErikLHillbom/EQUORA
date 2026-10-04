// Pencil engraving of the 3D animals, in two passes.
//
// 1. Pencil pass (pencilVertexShader, pencilFragmentShader): the skinned mesh is lit with smooth
//    normals and drawn as graphite hatching. The strokes are slices through the animal's own
//    body (iso-lines of a plane through its rest pose), so they curve around the barrel, the neck
//    and the legs the way an engraver's strokes follow the form, and they stay on the body when it
//    moves. Screen derivatives keep the strokes 3 to 5 px apart however the surface turns. Up to
//    four families of strokes at different angles build the tone. Output: stroke coverage in red.
// 2. Ink pass (inkVertexShader, inkFragmentShader): a thin ink contour from depth jumps (the
//    silhouette darkest, inner overlaps lighter) and faint creases from normals, slightly uneven
//    and broken, over the graphite. Light areas stay transparent, so the paper shows through.
//
// The idea of a post-process ink pass follows Maxime Heckel, "Moebius-style post-processing"
// (blog.maximeheckel.com/posts/moebius-style-post-processing). The code is our own.
import { Color, LinearSRGBColorSpace, Vector2, Vector3, type DepthTexture, type Texture } from 'three'

export const INK = '#1F1C17'
export const PENCIL = '#57524A'
export const PAPER = '#F5F0E6'

/** Stroke spacing and width in CSS px. Spacing is the widest gap; turned surfaces get up to twice as many strokes. */
export const STROKE_SPACING = 5
export const STROKE_WIDTH = 0.85

const NOISE = /* glsl */ `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

float noise2(vec2 p) {
  return noise3(vec3(p, 0.5));
}
`

// Draws one family of parallel strokes: the iso-lines of f, kept between spacing / 2 and spacing
// apart on screen. Where the surface turns away and the lines would crowd, every other line fades
// out, so the strokes never clot into a black edge.
const HATCH = /* glsl */ `
// f: the slice value. fw: how much f changes per screen pixel (smooth, see below).
float hatchFamily(float f, float fw, float press, float jitter) {
  fw = max(fw, 1e-6);
  float spacing = uSpacing * uPx;
  float lod = log2(fw * spacing);
  float l0 = floor(lod);
  float t = lod - l0;
  float m = exp2(-l0);
  // Wobble: the stroke drifts by up to a quarter of a gap, like a hand-drawn line.
  float g = f * m + jitter * 0.28;
  float gap = 1.0 / (fw * m);
  float w = uWidth * uPx * mix(0.5, 1.0, press);
  float dFine = abs(fract(g + 0.5) - 0.5) * gap;
  float dCoarse = abs(fract(g * 0.5 + 0.5) - 0.5) * 2.0 * gap;
  float aa = 0.6 * uPx;
  float fine = 1.0 - smoothstep(0.5 * w - aa * 0.5, 0.5 * w + aa * 0.5, dFine);
  float coarse = 1.0 - smoothstep(0.5 * w - aa * 0.5, 0.5 * w + aa * 0.5, dCoarse);
  return max(coarse, fine * (1.0 - t));
}
`

// Slice axes in the rest pose, which has x across the body, y along it (tail to head) and z up.
// 1: rings around the barrel and neck, tilted; 2: level contours, rings around the legs;
// 3 and 4: the cross strokes of the darker tones.
const AXES = /* glsl */ `
const vec3 AXIS1 = vec3(0.14, 0.92, 0.37);
const vec3 AXIS2 = vec3(0.05, 0.21, 0.98);
const vec3 AXIS3 = vec3(-0.22, -0.72, 0.66);
const vec3 AXIS4 = vec3(0.93, 0.33, -0.16);
const float SLICES = 60.0;
`

export const pencilVertexShader = /* glsl */ `
#include <common>
#include <color_pars_vertex>
#include <skinning_pars_vertex>
uniform float uBufferHeight;
varying vec3 vNormalV;
varying vec3 vBody;
varying vec3 vA1;
varying vec3 vA2;
varying vec3 vA3;
varying vec3 vA4;
varying float vPixel;
${AXES}
void main() {
  #include <color_vertex>
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vNormalV = normalize(transformedNormal);
  // Rest-pose position: the strokes are drawn on the body, so they move with it.
  vBody = position;
  // How each slice value changes per unit of view space here: the slice axis carried through the
  // skinning and the view, as a gradient (inverse transpose). The fragment shader turns it into a
  // change per screen pixel that is smooth across faces, unlike fwidth on a low-poly mesh.
  #ifdef USE_SKINNING
    mat3 grad = normalMatrix * inverse(transpose(mat3(skinMatrix)));
  #else
    mat3 grad = normalMatrix;
  #endif
  vA1 = grad * AXIS1 * SLICES;
  vA2 = grad * AXIS2 * SLICES;
  vA3 = grad * AXIS3 * SLICES;
  vA4 = grad * AXIS4 * SLICES;
  // View-space size of one buffer pixel at this depth.
  vPixel = 2.0 * -mvPosition.z / (projectionMatrix[1][1] * uBufferHeight);
}
`

export const pencilFragmentShader = /* glsl */ `
precision highp float;
#include <color_pars_fragment>
varying vec3 vNormalV;
varying vec3 vBody;
varying vec3 vA1;
varying vec3 vA2;
varying vec3 vA3;
varying vec3 vA4;
varying float vPixel;
uniform vec3 uLightDir;
uniform float uPx;
uniform float uSpacing;
uniform float uWidth;
${NOISE}
${HATCH}
${AXES}

// Change of a slice value per screen pixel: moving across the screen moves along the surface,
// whose depth changes with the normal. Steep where the surface turns away.
float perPixel(vec3 a, vec3 n) {
  float nz = max(n.z, 0.15);
  return length(a.xy - a.z * n.xy / nz) * vPixel;
}

void main() {
  vec3 n = normalize(vNormalV);
  float ndl = dot(n, uLightDir);
  // Wrapped light: the shade turns slowly from the lit side to the core shadow.
  float diffuse = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
  float light = 0.38 + 0.74 * diffuse;
  // A little reflected light from the ground on the underside, as an engraver leaves it.
  light += 0.08 * clamp(-n.y, 0.0, 1.0);
  // The form darkens slightly as it turns away from the eye.
  light *= mix(0.86, 1.0, smoothstep(0.05, 0.5, n.z));
  float albedo = 1.0;
  #if defined( USE_COLOR )
  albedo = vColor.r;
  #endif
  float tone = clamp(albedo * light, 0.0, 1.0);

  vec3 p = vBody;
  // Pencil pressure varies along a stroke, and now and then the pencil lifts.
  float press = mix(0.55, 1.0, noise3(p * 23.0));
  float lift = smoothstep(0.12, 0.3, noise3(p * 5.0 + 5.0));
  float jitter = noise3(p * 6.0 + 2.0) - 0.5;

  float k1 = smoothstep(0.9, 0.64, tone);
  float k2 = smoothstep(0.68, 0.44, tone);
  float k3 = smoothstep(0.48, 0.26, tone);
  float k4 = smoothstep(0.3, 0.1, tone);

  float a1 = hatchFamily(dot(p, AXIS1) * SLICES, perPixel(vA1, n), press * mix(0.6, 1.0, k1), jitter) * k1;
  float a2 = hatchFamily(dot(p, AXIS2) * SLICES, perPixel(vA2, n), press * mix(0.6, 1.0, k2), -jitter) * k2;
  float a3 = hatchFamily(dot(p, AXIS3) * SLICES, perPixel(vA3, n), press * mix(0.6, 1.0, k3), jitter) * k3;
  float a4 = hatchFamily(dot(p, AXIS4) * SLICES, perPixel(vA4, n), press, -jitter) * k4;
  float cover = 1.0 - (1.0 - a1) * (1.0 - a2) * (1.0 - a3) * (1.0 - a4);
  cover *= mix(0.55, 1.0, lift) * mix(0.75, 1.0, press);
  gl_FragColor = vec4(cover, tone, 0.0, 1.0);
}
`

// Soft hatched shadow on the ground. Level strokes, as an engraver draws a cast shadow, denser
// under the body and fading out at the rim, with a second family under the middle.
export const shadowVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const shadowFragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uStrength;
uniform float uPx;
uniform float uSpacing;
uniform float uWidth;
${NOISE}
${HATCH}

void main() {
  vec2 q = (vUv - 0.5) * 2.0;
  float r = length(q);
  float shade = (1.0 - smoothstep(0.0, 1.0, r + 0.15 * (noise2(q * 3.0) - 0.5))) * uStrength;
  vec2 s = gl_FragCoord.xy / uPx;
  float press = mix(0.55, 1.0, noise2(s * 0.09));
  float jitter = noise2(s * 0.03) - 0.5;
  float f1 = s.y * 0.25;
  float f2 = (s.x * 0.45 + s.y) * 0.25;
  float a1 = hatchFamily(f1, fwidth(f1), press, jitter) * smoothstep(0.05, 0.4, shade);
  float a2 = hatchFamily(f2, fwidth(f2), press, -jitter) * smoothstep(0.5, 0.85, shade);
  float lift = smoothstep(0.2, 0.4, noise2(s * 0.05 + 9.0));
  float cover = (1.0 - (1.0 - a1) * (1.0 - a2)) * mix(0.5, 1.0, lift) * min(1.0, shade * 1.2);
  gl_FragColor = vec4(cover, 1.0, 0.0, 0.0);
}
`

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
uniform float uPencilAlpha;
${NOISE}

const float FAR = 1.0e4;

float viewDist(vec2 uv) {
  float z = texture2D(tDepth, uv).x;
  if (z >= 0.99999) return FAR;
  return -perspectiveDepthToViewZ(z, uNear, uFar);
}

void main() {
  vec2 px = 1.0 / uResolution;
  // Position in CSS px, so the hand looks the same at every pixel ratio.
  vec2 s = vUv * uResolution / uPx;

  // The contour drifts slowly, like a line drawn by hand.
  vec2 wob = vec2(noise2(s * 0.04), noise2(s * 0.04 + 31.7)) - 0.5;
  vec2 uv = vUv + wob * 1.3 * uPx * px;

  float dC = viewDist(uv);
  // Depth slope from the smaller one-sided difference, so a smooth surface seen edge-on is not a line.
  float dl = viewDist(uv - vec2(px.x, 0.0));
  float dr = viewDist(uv + vec2(px.x, 0.0));
  float dd = viewDist(uv - vec2(0.0, px.y));
  float du = viewDist(uv + vec2(0.0, px.y));
  float sx = abs(dr - dC) < abs(dC - dl) ? dr - dC : dC - dl;
  float sy = abs(du - dC) < abs(dC - dd) ? du - dC : dC - dd;
  if (dC >= FAR) { sx = 0.0; sy = 0.0; }
  sx = clamp(sx, -0.5, 0.5);
  sy = clamp(sy, -0.5, 0.5);

  // Line width in CSS px: 0.9 to 1.5, varying slowly along the line.
  float lw = mix(1.1, 1.8, noise2(s * 0.03 + 11.0));
  float r = lw * uPx;

  float sil = 0.0;
  float inner = 0.0;
  if (dC < FAR) {
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5235988;
      vec2 o = vec2(cos(a), sin(a)) * r;
      float d = viewDist(uv + o * px);
      if (d >= FAR) {
        sil += 1.0;
      } else {
        float expect = dC + sx * o.x + sy * o.y;
        inner += smoothstep(0.05, 0.12, d - expect);
      }
    }
  }
  sil = clamp(sil / 12.0 * 2.6, 0.0, 1.0);
  inner = clamp(inner / 12.0 * 2.6, 0.0, 1.0);

  // Faint creases where the surface folds.
  float crease = 0.0;
  if (dC < FAR) {
    vec3 nC = texture2D(tNormal, uv).rgb;
    float dn = 0.0;
    for (int i = 0; i < 4; i++) {
      float a = float(i) * 1.5707963 + 0.39;
      vec2 o = vec2(cos(a), sin(a)) * uPx * px;
      dn += length(texture2D(tNormal, uv + o).rgb - nC);
    }
    crease = smoothstep(0.55, 1.1, dn);
  }

  // The pen lifts now and then, and presses unevenly.
  float pen = mix(0.65, 1.0, smoothstep(0.15, 0.35, noise2(s * 0.04 + 3.0)));
  float line = max(sil * 0.96, max(inner * 0.62, crease * 0.3)) * pen;

  float pencil = texture2D(tColor, vUv).r * uPencilAlpha;
  float alpha = line + pencil * (1.0 - line);
  vec3 premul = uLine * line + uPencil * pencil * (1.0 - line);
  gl_FragColor = vec4(premul, alpha);
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
  uPencilAlpha: { value: number }
}

export interface PencilUniforms {
  [name: string]: { value: unknown }
  uLightDir: { value: Vector3 }
  uPx: { value: number }
  uSpacing: { value: number }
  uWidth: { value: number }
  uBufferHeight: { value: number }
}

export interface ShadowUniforms {
  [name: string]: { value: unknown }
  uStrength: { value: number }
  uPx: { value: number }
  uSpacing: { value: number }
  uWidth: { value: number }
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
    uPencilAlpha: { value: 0.88 },
  }
}

/** Light from the upper left and in front, in view space. */
export function createPencilUniforms(): PencilUniforms {
  return {
    uLightDir: { value: new Vector3(-0.38, 0.62, 0.69).normalize() },
    uPx: { value: 1 },
    uSpacing: { value: STROKE_SPACING },
    uWidth: { value: STROKE_WIDTH },
    uBufferHeight: { value: 1 },
  }
}

export function createShadowUniforms(): ShadowUniforms {
  return {
    uStrength: { value: 0.8 },
    uPx: { value: 1 },
    uSpacing: { value: STROKE_SPACING * 0.8 },
    uWidth: { value: STROKE_WIDTH },
  }
}
