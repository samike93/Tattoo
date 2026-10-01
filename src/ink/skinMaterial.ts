import {
  Color,
  DataTexture,
  FloatType,
  MeshPhysicalMaterial,
  NearestFilter,
  RGBAFormat,
  ShaderChunk,
  Texture,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { TABLE_CHANNELS, type LimbFrame, type CylPlacement } from '../projection/cylindrical';
import type { DesignTransform } from '../projection/design';

/**
 * Skin material with one live ink layer.
 *
 * Ink is absorbed into the skin, not painted on top: the design colour multiplies the skin albedo,
 * and the skin's own roughness, sheen and lighting stay on top. Placement math runs per fragment in
 * object space (meters), so the design does not care about the body's UV seams.
 *
 * uInkMode 1: per-vertex coordinates (exponential map), attribute inkCoord, valid where inkMask > 0.5
 * uInkMode 2: cylindrical wrap computed per fragment from the limb's ring table; inkMask = limb region
 */
export interface SkinUniforms {
  [k: string]: { value: unknown };
  uInk: { value: Texture | null };
  uInkMode: { value: number };
  uSize: { value: Vector2 };
  uRotation: { value: number };
  uMirror: { value: boolean };
  uBand: { value: boolean };
  uOpacity: { value: number };
  uShowRegion: { value: boolean };
  /** Draw the selection outline around the design. */
  uSelected: { value: boolean };
  uA: { value: Vector3 };
  uD: { value: Vector3 };
  uE1: { value: Vector3 };
  uE2: { value: Vector3 };
  uCyl: { value: Vector2 };
  uCylNaive: { value: boolean };
  uTable: { value: DataTexture | null };
  uCenters: { value: DataTexture | null };
  uTableInfo: { value: Vector4 };
  /** 0 = off, 1 = default. Subsurface scattering approximation (per-channel wrap lighting). */
  uSSS: { value: number };
  /** 0 = off, 1 = default. Procedural pores and fine skin variation. */
  uDetail: { value: number };
}

const VERT_HEAD = /* glsl */ `
attribute vec2 inkCoord;
attribute float inkMask;
varying vec2 vInkCoord;
varying float vInkMask;
varying vec3 vObjPos;
`;

const FRAG_HEAD = /* glsl */ `
uniform float uSSS;
uniform float uDetail;
uniform sampler2D uInk;
uniform int uInkMode;
uniform vec2 uSize;
uniform float uRotation;
uniform bool uMirror;
uniform bool uBand;
uniform float uOpacity;
uniform bool uShowRegion;
uniform bool uSelected;
uniform vec3 uA, uD, uE1, uE2;
uniform vec2 uCyl;          // centre t (m), centre angle (rad)
uniform bool uCylNaive;
uniform sampler2D uTable;   // (nTheta+1) x nT, RGBA32F: fraction, circumference, meridian, 0
uniform sampler2D uCenters; // nT x 1, RGBA32F: cx, cy
uniform vec4 uTableInfo;    // tMin, tMax, nT, nTheta
varying vec2 vInkCoord;
varying float vInkMask;
varying vec3 vObjPos;

const float PI_ = 3.14159265358979;
float wrapPi(float a) { return a - 2.0 * PI_ * floor((a + PI_) / (2.0 * PI_)); }
float wrapPeriod(float x, float p) { return x - p * floor((x + 0.5 * p) / p); }

float ringIndex(float t) {
  return clamp((t - uTableInfo.x) / (uTableInfo.y - uTableInfo.x) * (uTableInfo.z - 1.0), 0.0, uTableInfo.z - 1.0);
}
vec4 ringAt(float ti, float th) {
  float tj = (wrapPi(th) + PI_) / (2.0 * PI_) * uTableInfo.w;
  float i0 = min(floor(ti), uTableInfo.z - 2.0), j0 = min(floor(tj), uTableInfo.w - 1.0);
  float a = ti - i0, b = tj - j0;
  ivec2 p = ivec2(int(j0), int(i0));
  vec4 v00 = texelFetch(uTable, p, 0), v01 = texelFetch(uTable, p + ivec2(1, 0), 0);
  vec4 v10 = texelFetch(uTable, p + ivec2(0, 1), 0), v11 = texelFetch(uTable, p + ivec2(1, 1), 0);
  return mix(mix(v00, v01, b), mix(v10, v11, b), a);
}
vec2 centerAt(float ti) {
  float i0 = min(floor(ti), uTableInfo.z - 2.0);
  return mix(texelFetch(uCenters, ivec2(int(i0), 0), 0).xy, texelFetch(uCenters, ivec2(int(i0) + 1, 0), 0).xy, ti - i0);
}
// Mirrors cylCoords() in projection/cylindrical.ts. Returns (x, y) in meters and the ring period.
vec3 cylCoords(vec3 p) {
  vec3 q = p - uA;
  float t = dot(q, uD);
  float ti = ringIndex(t);
  vec2 c = centerAt(ti);
  vec2 r = vec2(dot(q, uE1), dot(q, uE2)) - c;
  float th = atan(r.y, r.x);
  if (uCylNaive) {
    float rad = length(r);
    return vec3(wrapPi(th - uCyl.y) * rad, uCyl.x - t, 2.0 * PI_ * rad);
  }
  vec4 s = ringAt(ti, th);
  float frac0 = ringAt(ti, uCyl.y).x;
  float x = wrapPeriod((s.x - frac0) * s.y, s.y);
  float y = ringAt(ringIndex(uCyl.x), th).z - s.z;
  return vec3(x, y, s.y);
}
// Mirrors designUV() in projection/design.ts (lin = true: transform a derivative, no offset).
vec2 toDesign(vec2 xy, float C, bool lin) {
  vec2 uv;
  if (uBand) {
    uv = vec2(xy.x / C, xy.y / uSize.y);
  } else {
    float c = cos(uRotation), s = sin(uRotation);
    uv = vec2(c * xy.x + s * xy.y, -s * xy.x + c * xy.y) / uSize;
  }
  if (!lin) uv += 0.5;
  if (uMirror) uv.x = lin ? -uv.x : 1.0 - uv.x;
  return uv;
}
`;

// Procedural skin detail: value noise with analytic derivatives (Inigo Quilez), in object space
// (meters), so pores keep their real size whatever the body shape or camera distance.
const FRAG_NOISE = /* glsl */ `
float skinHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
vec4 skinNoised(vec3 x) {
  vec3 i = floor(x), w = fract(x);
  vec3 u = w * w * (3.0 - 2.0 * w), du = 6.0 * w * (1.0 - w);
  float a = skinHash(i), b = skinHash(i + vec3(1, 0, 0)), c = skinHash(i + vec3(0, 1, 0)), d = skinHash(i + vec3(1, 1, 0));
  float e = skinHash(i + vec3(0, 0, 1)), f = skinHash(i + vec3(1, 0, 1)), g = skinHash(i + vec3(0, 1, 1)), h = skinHash(i + vec3(1, 1, 1));
  float k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f, k7 = -a + b + c - d + e - f - g + h;
  return vec4(a + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z,
    du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z, k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x, k3 + k6 * u.x + k5 * u.y + k7 * u.x * u.y));
}
`;

// Pores (~1.1 mm apart) and fine bumps perturb the shading normal. They fade out when a pore is
// smaller than a pixel, which would otherwise shimmer. Applied after the ink, so the skin's surface
// texture stays on top of the ink, as in a real tattoo.
const FRAG_PORES = /* glsl */ `
if (uDetail > 0.0) {
  const float PORE_FREQ = 900.0;   // cycles per meter
  const float BUMP_FREQ = 210.0;
  vec4 n1 = skinNoised(vObjPos * PORE_FREQ);
  vec4 n2 = skinNoised(vObjPos * BUMP_FREQ + 11.0);
  float footprint = length(fwidth(vObjPos)) * PORE_FREQ;
  float fade = 1.0 - smoothstep(0.45, 1.1, footprint);
  // Slopes: pores ~35 micron deep, bumps ~60 micron.
  vec3 g = (0.035e-3 * PORE_FREQ * fade) * n1.yzw + (0.06e-3 * BUMP_FREQ) * n2.yzw;
  vec3 gv = (viewMatrix * vec4(g, 0.0)).xyz * uDetail;
  normal = normalize(normal - (gv - dot(gv, normal) * normal));
}
`;

const FRAG_ROUGH = /* glsl */ `
if (uDetail > 0.0) {
  // Centimetre-scale variation in oiliness and tone, as real skin has.
  float v = skinNoised(vObjPos * 45.0 + 3.0).x;
  roughnessFactor = clamp(roughnessFactor * (0.9 + 0.2 * v * uDetail), 0.05, 1.0);
}
`;

const FRAG_TONE = /* glsl */ `
if (uDetail > 0.0) {
  float t = skinNoised(vObjPos * 28.0 + 7.0).x - 0.5;
  diffuseColor.rgb *= 1.0 + uDetail * vec3(0.05, 0.035, 0.03) * t;
}
`;

// Subsurface scattering approximation: per-channel wrap lighting. Light bleeds past the terminator,
// red furthest, which gives skin its soft, warm shadow edge instead of a plastic one.
const SSS_DIFFUSE = /* glsl */ `
	vec3 sssWrap = uSSS * vec3(0.55, 0.22, 0.12);
	float sssNL = dot(geometryNormal, directLight.direction);
	vec3 sssIrradiance = directLight.color * clamp((vec3(sssNL) + sssWrap) / (1.0 + sssWrap), 0.0, 1.0) / (1.0 + 0.5 * sssWrap);
	reflectedLight.directDiffuse += sssIrradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
`;

const FRAG_INK = /* glsl */ `
{
  vec2 xy = vInkCoord;
  float C = 1e6;
  if (uInkMode == 2) {
    vec3 cc = cylCoords(vObjPos);
    xy = cc.xy;
    C = cc.z;
  }
  // Derivatives outside any non-uniform branch; unwrap the jump at the band seam so the seam does
  // not pick a blurry mip level (that would draw a visible line).
  vec2 dx = dFdx(xy), dy = dFdy(xy);
  dx.x -= C * floor(dx.x / C + 0.5);
  dy.x -= C * floor(dy.x / C + 0.5);
  vec2 uv = toDesign(xy, C, false);
  vec2 gx = toDesign(dx, C, true), gy = toDesign(dy, C, true);
  vec4 ink = textureGrad(uInk, uv, gx, gy);
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  // Mode 1 needs all three vertices of the triangle reached (an interpolated mask of exactly 1);
  // otherwise the coordinates would blend with unreached vertices and smear the design.
  float on = (uInkMode == 1 && vInkMask > 0.999) || (uInkMode == 2 && vInkMask > 0.5) ? 1.0 : 0.0;
  float a = ink.a * uOpacity * inside * on;
  diffuseColor.rgb *= mix(vec3(1.0), ink.rgb, a);
  if (uSelected && on > 0.5) {
    // Selection outline: ~2 px band just inside the design rectangle, following the skin.
    vec2 fw = abs(gx) + abs(gy) + 1e-6;
    vec2 edge = min(uv, 1.0 - uv) / fw;
    float d = uBand ? edge.y : min(edge.x, edge.y);
    float line = (1.0 - smoothstep(1.5, 2.5, d)) * step(-0.5, d);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.5, 1.0), line);
  }
  if (uShowRegion && uInkMode != 0 && vInkMask > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.55, 1.0), 0.18);
}
`;

export function createSkinMaterial(color: string): { material: MeshPhysicalMaterial; uniforms: SkinUniforms } {
  const blank = new DataTexture(new Uint8Array(4), 1, 1);
  blank.needsUpdate = true;
  const uniforms: SkinUniforms = {
    uInk: { value: blank },
    uInkMode: { value: 0 },
    uSize: { value: new Vector2(0.1, 0.1) },
    uRotation: { value: 0 },
    uMirror: { value: false },
    uBand: { value: false },
    uOpacity: { value: 1 },
    uShowRegion: { value: false },
    uSelected: { value: false },
    uA: { value: new Vector3() },
    uD: { value: new Vector3(0, -1, 0) },
    uE1: { value: new Vector3(0, 0, 1) },
    uE2: { value: new Vector3(1, 0, 0) },
    uCyl: { value: new Vector2() },
    uCylNaive: { value: false },
    uTable: { value: emptyFloatTexture() },
    uCenters: { value: emptyFloatTexture() },
    uTableInfo: { value: new Vector4(0, 1, 2, 2) },
    uSSS: { value: 1 },
    uDetail: { value: 1 },
  };
  const material = new MeshPhysicalMaterial({
    color: new Color(color),
    roughness: 0.52,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new Color('#ffb59a'),
    specularIntensity: 0.45,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERT_HEAD + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n vObjPos = position; vInkCoord = inkCoord; vInkMask = inkMask;',
    );
    const diffuseLine = 'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';
    const lights = ShaderChunk.lights_physical_pars_fragment;
    if (!lights.includes(diffuseLine)) console.warn('three.js lighting chunk changed: skin SSS approximation disabled');
    shader.fragmentShader = (FRAG_HEAD + FRAG_NOISE + shader.fragmentShader)
      .replace('#include <lights_physical_pars_fragment>', lights.replace(diffuseLine, SSS_DIFFUSE))
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + FRAG_TONE + FRAG_INK)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + FRAG_ROUGH)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FRAG_PORES);
  };
  material.customProgramCacheKey = () => 'tattoo-skin-v2';
  return { material, uniforms };
}

function emptyFloatTexture() {
  const t = new DataTexture(new Float32Array(16), 2, 2, RGBAFormat, FloatType);
  t.needsUpdate = true;
  return t;
}

/** Upload a limb's ring table as float textures (read with texelFetch, so no float filtering needed: iPad-safe). */
export function setCylinderUniforms(u: SkinUniforms, f: LimbFrame, pl: CylPlacement) {
  if ((u.uTable.value as DataTexture & { userData: { frame?: LimbFrame } }).userData.frame !== f) {
    const W = f.nTheta + 1;
    const table = new DataTexture(f.table, W, f.nT, RGBAFormat, FloatType);
    table.minFilter = table.magFilter = NearestFilter;
    table.userData.frame = f;
    table.needsUpdate = true;
    const c = new Float32Array(f.nT * 4);
    for (let i = 0; i < f.nT; i++) c.set([f.centers[2 * i], f.centers[2 * i + 1], 0, 0], 4 * i);
    const centers = new DataTexture(c, f.nT, 1, RGBAFormat, FloatType);
    centers.minFilter = centers.magFilter = NearestFilter;
    centers.needsUpdate = true;
    u.uTable.value?.dispose();
    u.uCenters.value?.dispose();
    u.uTable.value = table;
    u.uCenters.value = centers;
    if (TABLE_CHANNELS !== 4) throw new Error('ring table must be RGBA');
  }
  u.uA.value.set(...f.A);
  u.uD.value.set(...f.d);
  u.uE1.value.set(...f.e1);
  u.uE2.value.set(...f.e2);
  u.uTableInfo.value.set(f.tMin, f.tMax, f.nT, f.nTheta);
  u.uCyl.value.set(pl.centerT, pl.centerAngle);
  u.uCylNaive.value = pl.mode === 'naive';
}

export function setDesignUniforms(u: SkinUniforms, tf: DesignTransform, opacity: number) {
  u.uSize.value.set(tf.width, tf.height);
  u.uRotation.value = tf.rotation;
  u.uMirror.value = tf.mirror;
  u.uBand.value = tf.band;
  u.uOpacity.value = opacity;
}
