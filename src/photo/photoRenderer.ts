import {
  CanvasTexture,
  LinearSRGBColorSpace,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { INK_LOOKS, type InkLook } from '../ink/skinMaterial';
import { PIGMENT_LOSS_GLSL } from '../ink/aging';
import { curveRadius, type PhotoDesign, type PhotoView } from './geometry';

/**
 * Draws the client photo with the design soaked into the skin. Same idea as the 3D skin shader:
 * ink multiplies the skin (so the photo's own light, pores and hair stay on top), lines spread by a
 * real-millimetre radius for healed and aged ink, blacks go blue-grey with age, and fresh ink gets
 * redness around the lines. Everything is in the photo's sRGB values, like a "multiply" layer.
 */
const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uPhoto, uInk;
uniform vec2 uPhotoSize;     // px
uniform vec3 uView;          // scale, offset x, offset y (photo px -> CSS px)
uniform float uDpr, uCanvasH; // device pixel ratio, canvas height in device px
uniform vec3 uBg;
uniform bool uHasInk;
uniform vec2 uAt, uSize;     // design centre and size, photo px
uniform float uRot, uRadius, uOpacity;
uniform bool uMirror;
uniform float uSpreadPx, uFade, uRedness, uDarken, uHaloPx, uVeil, uGrain, uAgeArea, uPxPerMm;
${PIGMENT_LOSS_GLSL}
float hash2(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float vnoise(vec2 x) {
  vec2 i = floor(x), f = fract(x), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y);
}

vec2 toDesign(vec2 p) {
  vec2 d = p - uAt;
  float c = cos(uRot), s = sin(uRot);
  float x = c * d.x - s * d.y;
  float y = s * d.x + c * d.y;
  float arc = x;
  if (uRadius > 0.0) arc = abs(x) < uRadius ? uRadius * asin(x / uRadius) : 1e9;
  return vec2(arc / uSize.x + 0.5, y / uSize.y + 0.5);
}

vec4 ink(vec2 uv) {
  vec2 t = vec2(uMirror ? 1.0 - uv.x : uv.x, 1.0 - uv.y);
  return texture2D(uInk, t);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, uCanvasH - gl_FragCoord.y) / uDpr;
  vec2 p = (css - uView.yz) / uView.x;
  if (p.x < 0.0 || p.y < 0.0 || p.x > uPhotoSize.x || p.y > uPhotoSize.y) {
    gl_FragColor = vec4(uBg, 1.0);
    return;
  }
  vec3 col = texture2D(uPhoto, vec2(p.x / uPhotoSize.x, 1.0 - p.y / uPhotoSize.y)).rgb;
  if (uHasInk) {
    vec2 uv = toDesign(p);
    float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    if (inside > 0.5) {
      // Spread: 9-tap disc blur with a real-millimetre radius (converted to design UV).
      vec2 r = uSpreadPx / uSize;
      vec4 k = 0.2 * ink(uv);
      float halo = 0.0;
      vec2 hr = uHaloPx / uSize;
      for (int i = 0; i < 8; i++) {
        float a = 0.785398 * float(i) + 0.39;
        vec2 o = vec2(cos(a), sin(a));
        k += 0.1 * ink(uv + o * r * (i % 2 == 0 ? 0.55 : 0.95));
        if (uRedness > 0.0) halo += 0.125 * ink(uv + o * hr).a;
      }
      float a = k.a * uOpacity;
      // Same ink model as the 3D skin shader (ink/skinMaterial.ts), in the photo's sRGB values.
      float lum = dot(k.rgb, vec3(0.2126, 0.7152, 0.0722));
      float fadeK = clamp(uFade * uAgeArea, 0.0, 0.85);
      float loss = pigmentLoss(k.rgb);
      vec3 rgb = mix(k.rgb, vec3(lum), clamp(0.6 * fadeK * loss, 0.0, 1.0));
      rgb = mix(rgb, vec3(0.3, 0.36, 0.44), fadeK * (1.0 - smoothstep(0.0, 0.25, lum)));
      rgb *= 1.0 - uDarken;
      a *= clamp(1.0 - 0.3 * fadeK * loss, 0.3, 1.0);
      if (uGrain > 0.0) a *= 1.0 - uGrain * vnoise(p / (0.7 * uPxPerMm) + 5.0);
      float skinDark = 1.0 - smoothstep(0.2, 0.7, dot(col, vec3(0.2126, 0.7152, 0.0722)));
      float veil = clamp(uVeil + 0.04 + 0.05 * skinDark, 0.0, 0.8);
      vec3 skinBase = col;
      col *= mix(vec3(1.0), rgb, a * (1.0 - veil));
      col = mix(col, min(skinBase * 1.06 + 0.03, vec3(1.0)), smoothstep(0.2, 0.4, uVeil) * 0.3 * a);
      col *= mix(vec3(1.0), vec3(1.0, 0.8, 0.78), 0.45 * uRedness * smoothstep(0.02, 0.35, halo) * (1.0 - a));
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface PhotoFrame {
  photo: HTMLCanvasElement;
  ink: { key: string; canvas: HTMLCanvasElement } | null;
  design: PhotoDesign;
  /** Photo pixels per millimetre, for ink spread. */
  pxPerMm: number;
  look: InkLook;
  /** How much faster ink ages at this body area (ink/aging.ts). */
  areaFactor: number;
  opacity: number;
  view: PhotoView;
}

export class PhotoRenderer {
  readonly renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: ShaderMaterial;
  private photoTex: { src: HTMLCanvasElement; tex: Texture } | null = null;
  private inkTex: { key: string; tex: Texture } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = LinearSRGBColorSpace; // values pass through untouched
    this.material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      uniforms: {
        uPhoto: { value: null },
        uInk: { value: null },
        uPhotoSize: { value: new Vector2(1, 1) },
        uView: { value: new Vector3(1, 0, 0) },
        uDpr: { value: 1 },
        uCanvasH: { value: 1 },
        uBg: { value: new Vector3(0.169, 0.176, 0.2) },
        uHasInk: { value: false },
        uAt: { value: new Vector2() },
        uSize: { value: new Vector2(1, 1) },
        uRot: { value: 0 },
        uRadius: { value: 0 },
        uOpacity: { value: 1 },
        uMirror: { value: false },
        uSpreadPx: { value: 0 },
        uFade: { value: 0 },
        uRedness: { value: 0 },
        uDarken: { value: 0 },
        uHaloPx: { value: 0 },
        uVeil: { value: 0 },
        uGrain: { value: 0 },
        uAgeArea: { value: 1 },
        uPxPerMm: { value: 4 },
      },
    });
    this.scene.add(new Mesh(new PlaneGeometry(2, 2), this.material));
  }

  private texture(src: HTMLCanvasElement, mipmaps: boolean) {
    const t = new CanvasTexture(src);
    t.colorSpace = NoColorSpace;
    t.generateMipmaps = mipmaps;
    t.anisotropy = 8;
    return t;
  }

  /** Draw one frame into a drawing buffer of w x h device pixels (CSS size w / dpr). */
  render(f: PhotoFrame, w: number, h: number, dpr: number) {
    const u = this.material.uniforms;
    if (this.photoTex?.src !== f.photo) {
      this.photoTex?.tex.dispose();
      this.photoTex = { src: f.photo, tex: this.texture(f.photo, true) };
    }
    if (f.ink && this.inkTex?.key !== f.ink.key) {
      this.inkTex?.tex.dispose();
      this.inkTex = { key: f.ink.key, tex: this.texture(f.ink.canvas, true) };
    }
    const look = INK_LOOKS[f.look];
    u.uPhoto.value = this.photoTex.tex;
    u.uInk.value = f.ink ? this.inkTex!.tex : this.photoTex.tex;
    u.uHasInk.value = !!f.ink;
    u.uPhotoSize.value.set(f.photo.width, f.photo.height);
    u.uView.value.set(f.view.scale, f.view.ox, f.view.oy);
    u.uDpr.value = dpr;
    u.uCanvasH.value = h;
    u.uAt.value.set(...f.design.at);
    u.uSize.value.set(f.design.w, f.design.h);
    u.uRot.value = f.design.rotation;
    const R = curveRadius(f.design);
    u.uRadius.value = Number.isFinite(R) ? R : 0;
    u.uMirror.value = f.design.mirror;
    u.uOpacity.value = f.opacity;
    const area = f.look === 'fresh' ? 1 : f.areaFactor;
    u.uAgeArea.value = area;
    u.uSpreadPx.value = look.spreadMm * area * f.pxPerMm;
    u.uVeil.value = look.veil;
    u.uGrain.value = look.grain;
    u.uPxPerMm.value = f.pxPerMm;
    u.uHaloPx.value = 1.5 * f.pxPerMm;
    u.uFade.value = look.fade;
    u.uRedness.value = look.redness;
    u.uDarken.value = look.darken;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.photoTex?.tex.dispose();
    this.inkTex?.tex.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}
