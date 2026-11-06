import { Scene as T, OrthographicCamera as X, PlaneGeometry as Y, WebGLRenderer as J, LinearSRGBColorSpace as K, Color as Z, WebGLRenderTarget as Q, RGBAFormat as I, UnsignedByteType as ee, NearestFilter as R, NoColorSpace as z, ShaderMaterial as O, Vector2 as S, Vector4 as g, Mesh as N, DataTexture as te, TextureLoader as ie, Texture as se, CanvasTexture as re, ClampToEdgeWrapping as $, AdditiveBlending as oe, NormalBlending as ae, Vector3 as q } from "three";
function V(n, t, i, s = 9) {
  const e = n.left ?? 0, o = n.right ?? t, r = n.texturePeriod ?? s, u = n.interiorLights ?? [{ x: 0.067 * t, y: 0.75 * i, radiusX: 0.54 * t, radiusY: 0.69 * i }, { x: 0.94 * t, y: 0.37 * i, radiusX: 0.6 * t, radiusY: 0.74 * i }, { x: 0.8 * t, y: 0.79 * i, radiusX: 0.18 * t, radiusY: 0.21 * i }, { x: 0.28 * t, y: 0.79 * i, radiusX: 0.21 * t, radiusY: 0.27 * i }];
  if (![t, i, n.top, n.bottom, n.depth, e, o, r].every(Number.isFinite) || t <= 0 || i <= 0 || n.top < 0 || n.bottom > i || n.bottom <= n.top || n.depth <= 0 || n.depth >= 1e3 || e < 0 || o > t || o <= e || r <= 0 || u.length !== 4 || u.some((l) => ![l.x, l.y, l.radiusX, l.radiusY].every(Number.isFinite) || l.radiusX <= 0 || l.radiusY <= 0)) throw new Error("Invalid shutter definition");
  return { ...n, left: e, right: o, texturePeriod: r, interiorLights: u.map((l) => ({ ...l })) };
}
const ne = 4, le = 4;
function F(n) {
  if (!n || typeof n.enabled != "boolean" || !Number.isFinite(n.ambient) || n.ambient < 0 || n.ambient > 4 || !Array.isArray(n.lights) || n.lights.length > ne) throw new Error("Invalid shadow lighting state (maximum four lights)");
  const t = /* @__PURE__ */ new Set();
  for (const i of n.lights) {
    if (!i || typeof i.id != "string" || !i.id || t.has(i.id)) throw new Error("Shadow light IDs must be unique");
    if (t.add(i.id), !Array.isArray(i.color) || i.color.length !== 3 || !i.color.every((s) => Number.isFinite(s) && s >= 0 && s <= 1) || !Number.isFinite(i.intensity) || i.intensity < 0 || i.intensity > 8) throw new Error(`Invalid shadow light color/intensity: ${i.id}`);
    if (i.scope !== void 0 && i.scope !== "world" && i.scope !== "room") throw new Error(`Invalid shadow light scope: ${i.id}`);
    if (i.enabled !== void 0 && typeof i.enabled != "boolean") throw new Error(`Invalid enabled: ${i.id}`);
    if (i.softness !== void 0 && (!Number.isFinite(i.softness) || i.softness < 0 || i.softness > 32)) throw new Error(`Invalid softness: ${i.id}`);
    if (i.type === "directional") {
      if (!Number.isFinite(i.azimuthDeg) || !Number.isFinite(i.elevationDeg) || i.elevationDeg < -90 || i.elevationDeg > 90 || i.maxDistance !== void 0 && (!Number.isFinite(i.maxDistance) || i.maxDistance <= 0)) throw new Error(`Invalid directional light: ${i.id}`);
    } else if (i.type === "point") {
      if (![i.x, i.y, i.elevation, i.radius].every(Number.isFinite) || i.elevation < 0 || i.radius <= 0) throw new Error(`Invalid point light: ${i.id}`);
    } else throw new Error("Unknown shadow light type");
  }
  return structuredClone(n);
}
function Ie(n, t, i, s, e) {
  if (e.enabled === !1 || s <= i) return null;
  if (e.type === "point") {
    if (e.elevation <= s) return null;
    const u = (e.elevation - s) / (e.elevation - i);
    return [e.x + (n - e.x) * u, e.y + (t - e.y) * u];
  }
  if (e.elevationDeg <= 0) return null;
  const o = Math.min(e.maxDistance ?? 4096, (s - i) / Math.max(1e-5, Math.tan(e.elevationDeg * Math.PI / 180))), r = e.azimuthDeg * Math.PI / 180;
  return [n + Math.cos(r) * o, t + Math.sin(r) * o];
}
function ue(n) {
  const t = n.includes("vec2 pos=") ? "pos+uOrigin, texUV" : "p+uOrigin, uv";
  return n.replace("void main()", he + `
void main()`).replace("vec3 col=c.rgb*uTint;", `vec3 col=shadowSurface(c.rgb*uTint, ${t});`);
}
const he = (
  /* glsl */
  `
uniform sampler2D uCaster0,uCaster1,uCaster2,uCaster3,uShadowReceiver;
uniform vec4 uCasterRect[4],uCasterInfo[4];
uniform vec4 uShadowLight[4],uShadowColor[4],uShadowParams[4];
uniform float uShadowEnabled,uShadowAmbient,uReceiverElevation,uReceiverSelf,uReceiverMask,uShadowTransmission;
float blocker(int i,vec2 p){
  vec4 rect=uCasterRect[i]; vec2 uv=(p-rect.xy)/rect.zw;
  if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0)))) return 0.0;
  uv.y=1.0-uv.y;
  vec4 m=vec4(0.0);
  if(i==0)m=texture2D(uCaster0,uv);
  else if(i==1)m=texture2D(uCaster1,uv);
  else if(i==2)m=texture2D(uCaster2,uv);
  else m=texture2D(uCaster3,uv);
  return m.a*mix(1.0,m.r,uCasterInfo[i].z)*uCasterInfo[i].y;
}
float lightVisibility(vec2 p,int j){
  float visible=1.0;
  for(int i=0;i<4;i++){
    vec4 info=uCasterInfo[i];
    if(info.w<0.5||abs(float(i)-uReceiverSelf)<0.1||info.x<=uReceiverElevation)continue;
    vec4 light=uShadowLight[j]; vec2 q;
    if(light.w<0.5){
      float distance=min(uShadowParams[j].w,(info.x-uReceiverElevation)/max(0.00001,light.z));
      q=p+light.xy*distance;
    }else{
      if(light.z<=info.x)continue;
      float ratio=(light.z-info.x)/(light.z-uReceiverElevation);
      q=light.xy+(p-light.xy)*ratio;
    }
    visible*=1.0-blocker(i,q);
  }
  return visible;
}
vec3 shadowSurface(vec3 base,vec2 p,vec2 uv){
  if(uShadowEnabled<0.5)return base;
  vec3 illumination=vec3(uShadowAmbient);
  float receive=mix(1.0,texture2D(uShadowReceiver,uv).r*texture2D(uShadowReceiver,uv).a,uReceiverMask);
  for(int j=0;j<4;j++){
    vec4 light=uShadowLight[j], color=uShadowColor[j], params=uShadowParams[j];
    if(color.a<=0.0)continue;
    float attenuation=1.0;
    if(light.w>0.5){
      if(light.z<=uReceiverElevation)continue;
      float d=length(vec3(p-light.xy,light.z-uReceiverElevation));
      attenuation=1.0/(1.0+pow(d/params.y,2.0));
    }
    float v=lightVisibility(p,j);
    if(params.z>0.0){
      vec2 s=vec2(params.z,0.0);
      v=(v+lightVisibility(p+s,j)+lightVisibility(p-s,j)+lightVisibility(p+s.yx,j)+lightVisibility(p-s.yx,j))/5.0;
    }
    illumination+=color.rgb*color.a*attenuation*mix(1.0,v,receive)*uShadowTransmission;
  }
  // Existing engine palette is display-space; decode/encode only this opt-in lighting term.
  vec3 linearBase=mix(base/12.92,pow((base+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),base));
  vec3 lit=linearBase*illumination;
  return mix(lit*12.92,1.055*pow(max(lit,vec3(0.0)),vec3(1.0/2.4))-0.055,step(vec3(0.0031308),lit));
}
`
), ce = {
  presetVersion: 1,
  seed: 712,
  timeOfDay: 22,
  life: { beacons: !1, traffic: 0, windowDrops: !1 },
  sky: { palette: "cyberpunk_night", starsEnabled: !1, moonEnabled: !1, horizonGlow: 0.15, overcast: 0 },
  clouds: {
    enabled: !1,
    coverage: 0,
    density: 0.35,
    scale: 1,
    windSpeed: 0.25,
    windDirectionDeg: 0,
    layers: {
      far: { enabled: !0, depth: 10, coverage: 0.85, density: 0.7, scale: 1.4, height: 0.23, thickness: 0.25, speed: 0.4, colorSteps: 4 },
      low: { enabled: !0, depth: 30, coverage: 1, density: 1, scale: 0.85, height: 0.38, thickness: 0.31, speed: 1, colorSteps: 4 }
    }
  },
  weather: { fog: 0, rain: 0, stormEnabled: !1, layers: {} },
  lighting: { cityLightsIntensity: 0.55, exteriorRoomFill: 0.15, interiorLightsEnabled: !1, radioBacklightEnabled: !1, computerEnabled: !1 },
  render: { sampling: "nearest", dithering: !1, pixelGrid: "match_scene_assets", colorSteps: 12 }
}, P = {
  canonical: {},
  drifting: { clouds: { enabled: !0, coverage: 0.7, density: 0.75 }, sky: { horizonGlow: 0.22 } },
  storm: { clouds: { enabled: !0, coverage: 0.95, density: 1, windSpeed: 0.65 }, weather: { stormEnabled: !0, fog: 0.23, rain: 0.45 }, sky: { horizonGlow: 0.12 } },
  dawn: { timeOfDay: 5.7, clouds: { enabled: !0, coverage: 0.42, density: 0.65 }, sky: { horizonGlow: 0.3 }, lighting: { cityLightsIntensity: 0.25 } },
  day: { timeOfDay: 12, clouds: { enabled: !0, coverage: 0.52, density: 0.75 }, lighting: { cityLightsIntensity: 0.08, exteriorRoomFill: 0.4 } }
};
function G(n, t, i = "") {
  for (const s of Object.keys(t)) {
    if (!Object.hasOwn(n, s)) throw new Error(`Unknown parameter: ${i}${s}`);
    const e = t[s];
    if (e && typeof e == "object" && !Array.isArray(e)) {
      if (!n[s] || typeof n[s] != "object") throw new Error(`Invalid object: ${i}${s}`);
      G(n[s], e, `${i}${s}.`);
    } else {
      if (typeof e != typeof n[s]) throw new Error(`Invalid type: ${i}${s}`);
      n[s] = e;
    }
  }
}
function p(n, t, i, s, e = !1) {
  if (!Number.isFinite(n) || n < t || n > i || e && !Number.isInteger(n))
    throw new Error(`${s}: expected ${e ? "integer " : ""}${t}вЂ¦${i}`);
}
function E(n = {}, t = ce) {
  const i = structuredClone(t);
  for (const s of Object.keys(n.weather?.layers ?? {})) {
    if (!/^[a-zA-Z0-9_-]+$/.test(s) || ["__proto__", "constructor", "prototype"].includes(s)) throw new Error("Invalid atmosphere layer ID");
    Object.hasOwn(i.weather.layers, s) || (i.weather.layers[s] = { hazeDensity: 0, fogDensity: 0, fogAmount: 0.5, billowing: 0 });
  }
  if (G(i, n), i.presetVersion !== 1) throw new Error("Unsupported presetVersion (expected 1)");
  if (i.sky.moonEnabled !== !1) throw new Error("Moon is intentionally unsupported in this prototype");
  if (!["cyberpunk_night", "coastal", "forest"].includes(i.sky.palette)) throw new Error("Unknown sky palette");
  if (i.render.sampling !== "nearest" || i.render.pixelGrid !== "match_scene_assets") throw new Error("Pixel grid must match scene assets; sampling must be nearest");
  p(i.seed, 0, 65535, "seed", !0), p(i.timeOfDay, 0, 24, "timeOfDay"), p(i.life.traffic, 0, 1, "life.traffic"), p(i.sky.horizonGlow, 0, 1, "sky.horizonGlow"), p(i.sky.overcast, 0, 1, "sky.overcast");
  for (const s of ["coverage", "density", "windSpeed"]) p(i.clouds[s], 0, 1, `clouds.${s}`);
  p(i.clouds.scale, 0.25, 4, "clouds.scale"), p(i.clouds.windDirectionDeg, -360, 360, "clouds.windDirectionDeg");
  for (const [s, e] of Object.entries(i.clouds.layers)) {
    p(e.depth, 1, 999, `${s}.depth`);
    for (const o of ["coverage", "density", "height", "thickness"]) p(e[o], 0, 1, `${s}.${o}`);
    p(e.scale, 0.25, 4, `${s}.scale`), p(e.speed, 0, 4, `${s}.speed`), p(e.colorSteps, 2, 16, `${s}.colorSteps`, !0);
  }
  for (const s of ["fog", "rain"]) p(i.weather[s], 0, 1, `weather.${s}`);
  for (const [s, e] of Object.entries(i.weather.layers))
    for (const o of ["hazeDensity", "fogDensity", "fogAmount", "billowing"]) p(e[o], 0, 1, `weather.layers.${s}.${o}`);
  return p(i.lighting.cityLightsIntensity, 0, 1, "lighting.cityLightsIntensity"), p(i.lighting.exteriorRoomFill, 0, 1, "lighting.exteriorRoomFill"), p(i.render.colorSteps, 2, 32, "render.colorSteps", !0), i;
}
function de(n) {
  if (!Object.hasOwn(P, n)) throw new Error(`Unknown preset: ${n}`);
  return E(P[n]);
}
function fe(n) {
  if (n.length > 65536) throw new Error("Preset is too large");
  const t = JSON.parse(n);
  if (!t || typeof t != "object" || Array.isArray(t)) throw new Error("Expected a preset object");
  return E(t);
}
const D = [
  { t: 0, top: "#07091b", bottom: "#24233f", cloud: "#34344f", ambient: 0.05 },
  { t: 4.5, top: "#0d1026", bottom: "#34304d", cloud: "#49415a", ambient: 0.12 },
  { t: 6, top: "#33385b", bottom: "#bd7c7f", cloud: "#a3778b", ambient: 0.55 },
  { t: 8, top: "#125bb8", bottom: "#91d6fa", cloud: "#c2ccd4", ambient: 0.9 },
  { t: 16, top: "#1555b0", bottom: "#8bcef4", cloud: "#bbc6cd", ambient: 0.85 },
  { t: 18, top: "#302d53", bottom: "#b76b6e", cloud: "#8f617a", ambient: 0.5 },
  { t: 20, top: "#11132c", bottom: "#44334f", cloud: "#49405e", ambient: 0.13 },
  { t: 22, top: "#080b20", bottom: "#24233e", cloud: "#34354e", ambient: 0.05 },
  { t: 24, top: "#07091b", bottom: "#24233f", cloud: "#34344f", ambient: 0.05 }
];
function M(n) {
  if (!/^#[0-9a-f]{6}$/i.test(n)) throw new Error(`Expected #rrggbb color: ${n}`);
  return [1, 3, 5].map((t) => parseInt(n.slice(t, t + 2), 16) / 255);
}
function U(n, t) {
  const i = (n % 24 + 24) % 24, s = Math.max(0, D.findIndex((a, h) => h < D.length - 1 && i >= a.t && i < D[h + 1].t)), e = D[s], o = D[s + 1];
  let r = (i - e.t) / (o.t - e.t);
  r = r * r * (3 - 2 * r);
  const u = t === "coastal" ? [0.8, 1.07, 1.1] : t === "forest" ? [0.8, 1.05, 0.83] : [1, 1, 1], l = (a, h) => M(a).map((c, d) => Math.min(1, (c + (M(h)[d] - c) * r) * u[d]));
  return { top: l(e.top, o.top), bottom: l(e.bottom, o.bottom), cloud: l(e.cloud, o.cloud), ambient: e.ambient + (o.ambient - e.ambient) * r };
}
function me(n, t) {
  return !Number.isFinite(n) || !Number.isFinite(t) ? 0 : Math.max(0, Math.min(0.1, (n - t) / 1e3));
}
class pe {
  constructor(t, i, s) {
    this.width = t, this.height = i, this.state = s || 1;
  }
  drops = [];
  state;
  accumulator = 0;
  random() {
    return this.state = Math.imul(this.state, 1664525) + 1013904223 >>> 0, this.state / 4294967296;
  }
  reset(t) {
    this.state = t || 1, this.drops = [], this.accumulator = 0;
  }
  update(t, i) {
    for (this.accumulator += Math.min(1, t); this.accumulator >= 1 / 60; )
      this.accumulator -= 1 / 60, this.step(i);
  }
  step(t) {
    this.drops.length < 32 && this.random() < t * 0.12 && this.drops.push({ x: this.random() * this.width, y: this.random() * this.height, mass: 3 + this.random() * 9, speed: 0, phase: this.random() * 30 });
    for (const i of this.drops) {
      i.mass += t * 4e-3;
      const s = i.mass > 7 ? Math.min(100, (i.mass - 7) * 5) : 0;
      i.speed += (s - i.speed) * 0.03, i.y += i.speed / 60, i.x += Math.sin(i.y * 0.035 + i.phase) * i.speed / 180, t === 0 && (i.mass -= 6e-3);
    }
    for (let i = 0; i < this.drops.length; i++) for (let s = this.drops.length - 1; s > i; s--) {
      const e = this.drops[i], o = this.drops[s];
      if (Math.hypot(e.x - o.x, e.y - o.y) < (Math.sqrt(e.mass) + Math.sqrt(o.mass)) * 0.75) {
        const r = e.mass + o.mass;
        e.x = (e.x * e.mass + o.x * o.mass) / r, e.y = Math.max(e.y, o.y), e.speed = Math.max(e.speed, o.speed), e.mass = r, this.drops.splice(s, 1);
      }
    }
    this.drops = this.drops.filter((i) => i.y < this.height + 20 && i.mass > 0.5);
  }
}
const C = (n) => {
  let t = Math.imul(n ^ n >>> 16, 2246822519);
  return t = Math.imul(t ^ t >>> 13, 3266489917), ((t ^ t >>> 16) >>> 0) / 4294967296;
};
function ve(n) {
  return n < 2 ? 6 : 4;
}
function ge(n, t, i, s) {
  const e = t / i;
  let o = 0, r = 0;
  if (n === 1 || n === 2)
    r = (n === 1 ? 0.14 : -0.18) * s / i, o = (e - 0.5) * (n === 1 ? 0.14 : -0.18) * s;
  else if (n >= 3) {
    const u = Math.tanh((e - 0.32) * 12), l = Math.tanh((e - 0.7) * 12), a = (n % 2 ? -0.065 : 0.065) * s;
    o = a * (u - l), r = a * 12 * (1 - u * u - (1 - l * l)) / i;
  }
  return { y: s * (0.18 + n * 0.095) + o, slope: r };
}
function we(n, t, i, s, e, o) {
  const r = [], u = ve(i), l = i < 2 ? 5 : 3;
  for (let a = 0; a < u; a++) for (let h = 0; h < 2; h++) for (let c = 0; c < l; c++) {
    const d = o + i * 1777 + a * 113 + h * 37 + c * 7;
    if (C(d + 1) >= e) continue;
    const m = C(d + 2), y = m < 0.6 ? 0 : m < 0.83 ? 1 : 2, v = h === 0 ? 1 : -1, f = n + 80, w = (y === 0 ? 23 : y === 1 ? 16 : 13) * (0.6 + i * 0.2) * (0.8 + C(d + 3) * 0.4), b = ((C(d + 4) * f + s * w * v) % f + f) % f - 40, L = ge(a, b, n, t), k = Math.hypot(1, L.slope);
    r.push({
      x: b,
      y: L.y + h * 12,
      dx: v / k,
      dy: v * L.slope / k,
      kind: y,
      variant: Math.floor(C(d + 5) * 3),
      tint: C(d + 6)
    });
  }
  return r;
}
function ye(n, t, i, s, e) {
  const o = [];
  for (let r = 0; r < 2; r++) for (let u = 0; u < 6; u++) {
    if (C(e + u * 31 + r * 223) >= s) continue;
    const l = r === 0 ? 1 : -1, a = n + 160, h = 30 + u % 3 * 5, c = (((u / 6 + r * 0.07) * a + i * h * l) % a + a) % a - 80, d = (c / n - 0.5) * Math.PI, m = Math.cos(d) * t * 0.025 * Math.PI / n, y = Math.hypot(1, m);
    o.push({
      x: c,
      y: t * (0.55 + r * 0.055) + Math.sin(d) * t * 0.025,
      dx: l / y,
      dy: l * m / y,
      kind: u % 3,
      variant: Math.floor(u / 2) % 3,
      tint: C(e + u * 13 + r * 17)
    });
  }
  return o;
}
const j = (
  /* glsl */
  `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
), x = (
  /* glsl */
  `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform sampler2D uWindow;
uniform float uClip;
uniform float uSteps;
uniform float uFlash;
uniform float uSeed;
float windowAt(vec2 uv) { vec4 m = texture2D(uWindow, uv); return mix(1.0, m.r * m.a, uClip); }
float quant(float x, float levels) { return floor(x * levels + 0.0001) / levels; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed * 0.713) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float n=0.0, a=0.54;
  for(int i=0;i<4;i++){ n+=a*noise(p); p=p*2.03+vec2(13.1,7.7); a*=0.47; }
  return n;
}
`
), xe = x + /* glsl */
`
uniform vec3 uTop, uBottom;
uniform float uGlow, uStars, uNight, uDither, uTime, uOvercast;
void main() {
  vec2 p=floor(vUv*uResolution);
  float d = (mod(p.x,2.0)*2.0+mod(p.y,2.0)-1.5)/4.0;
  float h=quant(pow(1.0-vUv.y,0.8)+d*uDither/uSteps,uSteps);
  vec3 c=mix(uTop,uBottom,h);
  float glow=quant(pow(1.0-vUv.y,3.0),8.0)*uGlow;
  c+=glow*vec3(0.21,0.14,0.29)*uNight;
  vec3 gray=mix(vec3(0.20,0.26,0.34),vec3(0.48,0.55,0.62),h)*(1.0-uNight*0.88);
  c=mix(c,gray,uOvercast);
  // Star coordinates never depend on time. Only brightness changes smoothly.
  vec2 cell=floor(p/22.0),local=mod(p,22.0);
  float id=hash(cell+vec2(19.0,7.0));
  vec2 offset=floor(vec2(hash(cell+vec2(3.0,11.0)),hash(cell+vec2(31.0,5.0)))*20.0)+1.0;
  float point=(1.0-step(0.5,abs(local.x-offset.x)))*(1.0-step(0.5,abs(local.y-offset.y)));
  float twinkle=0.68+0.32*sin(uTime*(0.7+id*1.3)+id*39.0);
  float stars=point*step(0.82,id)*smoothstep(0.28,0.7,vUv.y)*uStars*uNight*(1.0-uOvercast);
  c+=stars*twinkle*vec3(0.8,0.88,1.0);
  c+=uFlash*vec3(0.32,0.38,0.48);
  gl_FragColor=vec4(c,windowAt(vUv));
}
`, W = (
  /* glsl */
  `
// Integer lattice hash avoids sin()/large-float rounding at threshold edges.
// Keep this independent of the star/rain hashes and of animation time.
float cloudHash(ivec2 p) {
  uint h=uint(p.x)*1597334677u ^ uint(p.y)*3812015801u ^ uint(uSeed)*2798796415u;
  h=(h^(h>>16u))*2246822519u;
  h=(h^(h>>13u))*3266489917u;
  h=h^(h>>16u);
  return float(h>>8u)*(1.0/16777216.0);
}
float cloudNoise(vec2 p) {
  ivec2 i=ivec2(floor(p));
  vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(cloudHash(i),cloudHash(i+ivec2(1,0)),f.x),
    mix(cloudHash(i+ivec2(0,1)),cloudHash(i+ivec2(1,1)),f.x),f.y);
}
float cloudField(vec2 p) {
  float n=0.0, a=0.54;
  for(int i=0;i<4;i++){ n+=a*cloudNoise(p); p=p*2.03+vec2(13.1,7.7); a*=0.47; }
  return n;
}
`
), be = x + W + /* glsl */
`
uniform vec2 uOffset;
uniform float uCoverage, uDensity, uScale, uHeight, uThickness, uCloudSteps, uStorm;
uniform vec3 uCloudColor;
void main() {
  vec2 pixel=floor(gl_FragCoord.xy);
  // Only integer translations reach the noise. No subpixel interpolation in time.
  vec2 p=(pixel+floor(uOffset+0.5))*vec2(0.018,0.038)*uScale;
  float n=cloudField(p);
  float screenY=1.0-(pixel.y+0.5)/uResolution.y;
  float band=1.0-smoothstep(uThickness*0.25,max(0.001,uThickness),abs(screenY-uHeight));
  float shape=n*band;
  float threshold=mix(1.0,0.18,uCoverage);
  float inside=step(threshold,shape);
  float tone=quant(clamp((shape-threshold)*3.5,0.0,1.0),uCloudSteps);
  vec3 c=uCloudColor*(0.6+tone*0.65)*(1.0-uStorm*0.22)+uFlash*vec3(0.38,0.42,0.52);
  float alpha=inside*quant(uDensity,uCloudSteps);
  gl_FragColor=vec4(c,alpha*windowAt(vUv));
}
`, Se = x + /* glsl */
`
uniform sampler2D uImage;
uniform vec2 uOrigin, uSize;
uniform float uOpacity, uReceivesFlash;
uniform sampler2D uCityMask;
uniform float uHasCityMask, uCityLights, uTime, uBeacons;
uniform vec3 uTint;
void main() {
  vec2 pos=vec2(vUv.x,1.0-vUv.y)*uResolution-uOrigin;
  if(pos.x<0.0||pos.y<0.0||pos.x>=uSize.x||pos.y>=uSize.y) discard;
  vec2 texUV=vec2(pos.x/uSize.x,1.0-pos.y/uSize.y);
  vec4 c=texture2D(uImage,texUV);
  vec3 col=c.rgb*uTint;
  if(uHasCityMask>0.5){
    vec3 m=texture2D(uCityMask,texUV).rgb;
    // Reuse only prepared masks. Whole windows share the mask's cluster ID.
    float phase=floor(m.g*255.0+0.5);
    if(m.r>0.5){
      float pulse=0.985+0.015*sin(uTime*0.14+phase);
      col=mix(col*0.3,c.rgb*1.28,uCityLights)*pulse+vec3(0.045,0.028,0.0)*uCityLights;
    }
    if(m.b>0.5) col=mix(col*0.4,c.rgb*1.25,uCityLights)*(0.97+0.03*sin(uTime*0.7+phase));
  }
  if(uBeacons>0.5 && c.r>0.55 && c.r>c.g*2.5 && c.r>c.b*2.5){
    float cluster=hash(floor(pos/16.0));
    float phase=fract(uTime/(2.0+cluster*3.0)+cluster);
    float pulse=smoothstep(0.0,0.08,phase)*(1.0-smoothstep(0.16,0.3,phase));
    col=mix(c.rgb*0.14,c.rgb*1.3,pulse);
  }
  c.rgb=col;
  c.rgb+=c.rgb*uFlash*uReceivesFlash*1.7;
  gl_FragColor=vec4(c.rgb,c.a*uOpacity*windowAt(vUv));
}
`, Ce = x + /* glsl */
`
uniform sampler2D uImage, uLeftLight, uRightLight, uEmitters;
uniform vec2 uOrigin, uSize, uRadioLed;
uniform vec4 uRadioDial;
uniform vec3 uTint, uRoomControls;
uniform sampler2D uComputerScreen;
uniform vec4 uComputerRect,uComputerCorners;
uniform float uComputerOn,uExteriorVisibility;
uniform float uOpacity, uReceivesFlash;
void main(){
  vec2 p=vec2(vUv.x,1.0-vUv.y)*uResolution-uOrigin;
  if(p.x<0.0||p.y<0.0||p.x>=uSize.x||p.y>=uSize.y) discard;
  vec2 uv=vec2(p.x/uSize.x,1.0-p.y/uSize.y);
  vec4 c=texture2D(uImage,uv); if(c.a<0.01) discard;
  vec3 controls=floor(uRoomControls*24.0+0.5)/24.0;
  vec3 em=texture2D(uEmitters,uv).rgb;
  vec3 col=c.rgb*uTint;
  // Lamps illuminate the authored material; a smooth additive field alone erases its texture.
  vec3 direct=texture2D(uLeftLight,uv).rgb*controls.x+texture2D(uRightLight,uv).rgb*controls.y;
  vec3 bounce=vec3(0.25,0.20,0.15)*max(controls.x,controls.y);
  bounce+=vec3(0.018,0.012,0.006)*controls.z;
  col+=c.rgb*(direct*4.5+bounce);
  col+=vec3(1.0,0.72,0.42)*em.r*controls.x*0.35+vec3(1.0,0.62,0.28)*em.g*controls.y*0.3;
  vec2 pixel=floor(p)+0.5;
  float dial=step(uRadioDial.x,pixel.x)*step(pixel.x,uRadioDial.z)*step(uRadioDial.y,pixel.y)*step(pixel.y,uRadioDial.w);
  float lum=dot(c.rgb,vec3(0.3,0.59,0.11));
  col+=dial*vec3(1.0,0.62,0.25)*(0.1+lum*1.6)*controls.z;
  float led=1.0-step(2.1,length(pixel-uRadioLed));
  col+=vec3(0.25,1.0,0.35)*led*controls.z*0.8;
  col+=c.rgb*uFlash*uReceivesFlash*0.6*uExteriorVisibility;
  float sy=(p.y-uComputerRect.y)/max(1.0,uComputerRect.w-uComputerRect.y);
  float left=mix(uComputerCorners.x,uComputerCorners.z,sy),right=mix(uComputerCorners.y,uComputerCorners.w,sy);
  vec2 glassSize=vec2(max(1.0,right-left),max(1.0,uComputerRect.w-uComputerRect.y));
  vec2 pc=vec2((p.x-left)/glassSize.x,sy);
  vec2 edge=abs((pc-0.5)*glassSize)-(glassSize*0.5-5.0);
  float screen=step(length(max(edge,vec2(0.0)))+min(max(edge.x,edge.y),0.0)-5.0,0.0);
  vec2 q=pc*2.0-1.0;
  vec2 curved=q*(1.0+dot(q,q)*0.045);
  vec2 sampleUV=clamp(curved*0.5+0.5,0.0,1.0);
  vec3 display=texture2D(uComputerScreen,vec2(sampleUV.x,1.0-sampleUV.y)).rgb;
  display*=1.0-0.16*dot(q,q);
  float strip=pow(max(0.0,1.0-abs(q.y+q.x*0.45+0.65)/0.33),2.0);
  float frame=step(0.92,abs(q.x))*0.035+step(0.94,abs(q.y))*0.025;
  float warm=pow(max(0.0,1.0-length((q-vec2(-0.65,-0.25))*vec2(2.0,3.0))),3.0)*controls.x;
  vec3 reflection=(vec3(0.09,0.14,0.18)*strip+vec3(0.12,0.2,0.24)*frame)*uExteriorVisibility+vec3(0.4,0.29,0.14)*warm*0.17;
  col=mix(col,display,uComputerOn*screen);
  col+=reflection*screen*(0.35+0.65*uComputerOn);
  float spill=quant(max(0.0,1.0-length((p-vec2(uComputerRect.x+80.0,uComputerRect.w))/vec2(155.0,75.0))),16.0);
  col+=vec3(0.025,0.065,0.08)*spill*uComputerOn*(1.0-screen);
  gl_FragColor=vec4(col,c.a*uOpacity);
}
`, Ee = x + /* glsl */
`
uniform sampler2D uImage;
uniform vec3 uColor;
uniform float uIntensity;
void main() {
  vec4 mask=texture2D(uImage,vUv);
  float a=mask.r*mask.a*quant(uIntensity,16.0)*windowAt(vUv);
  gl_FragColor=vec4(uColor,a);
}
`, Le = x + /* glsl */
`
uniform float uFog;
uniform vec3 uFogColor;
void main() {
  float a=quant(pow(1.0-vUv.y,2.0)*uFog,12.0);
  gl_FragColor=vec4(uFogColor+uFlash*0.3,a*windowAt(vUv));
}
`, ke = x + W + /* glsl */
`
uniform vec4 uAtmosphere;
uniform vec3 uAtmosphereColor;
uniform vec2 uDrift;
void main() {
  vec2 pixel=floor(gl_FragCoord.xy);
  float bottom=1.0-(pixel.y+0.5)/uResolution.y;
  float amount=uAtmosphere.z;
  float rise=smoothstep(1.0-amount,1.0,bottom);
  vec2 p=(pixel+floor(uDrift))*vec2(0.012,0.025);
  float rolls=0.5+0.5*cloudNoise(p);
  float fog=uAtmosphere.y*rise*mix(1.0,rolls,uAtmosphere.w);
  float alpha=quant(1.0-(1.0-uAtmosphere.x)*(1.0-fog),32.0);
  gl_FragColor=vec4(uAtmosphereColor+uFlash*0.3,alpha*windowAt(vUv));
}
`, De = x + /* glsl */
`
uniform float uRain, uTime;
void main() {
  vec2 p=floor(vUv*uResolution);
  float alpha=0.0;
  // Three native-pixel column fields, adapted from nightcity's rain model.
  // No smooth subpixel edges: each streak occupies whole logical pixels.
  for(int i=0;i<3;i++){
    float layer=float(i), cellWidth=4.0+layer*2.0;
    float x=floor(p.x+p.y*(0.09+layer*0.025));
    float column=floor(x/cellWidth), within=mod(x,cellWidth);
    float seed=hash(vec2(column,layer*17.0));
    float speed=(340.0+layer*180.0)*(0.8+seed*0.4);
    float period=250.0+seed*230.0;
    float fall=p.y+floor(uTime*speed)+floor(seed*period*3.0);
    float cycle=floor(fall/period), phase=mod(fall,period);
    float allowed=step(1.0-uRain*(0.7-layer*0.12),hash(vec2(column+layer*97.0,cycle)));
    float len=(7.0+layer*6.0)*(0.6+uRain);
    float position=floor(hash(vec2(column,cycle+layer+2.0))*cellWidth);
    float streak=(1.0-step(0.5,abs(within-position)))*(1.0-step(len,phase));
    alpha+=allowed*streak*(0.12+layer*0.07);
  }
  gl_FragColor=vec4(vec3(0.5,0.61,0.74)+uFlash*0.3,min(0.5,alpha)*windowAt(vUv));
}
`, _ = x + /* glsl */
`
uniform float uVehicleCount,uTrafficRank,uDetailedTraffic;
uniform vec4 uVehicles[60],uVehicleStyles[60];
uniform vec2 uOrigin,uSize,uNative;
void main(){
  vec2 p=floor(gl_FragCoord.xy); p.y=uResolution.y-p.y;
  vec2 local=(p-uOrigin)*uNative/uSize;
  vec3 color=vec3(0.0); float alpha=0.0;
  for(int i=0;i<60;i++){
    if(float(i)>=uVehicleCount) break;
    vec4 v=uVehicles[i],style=uVehicleStyles[i];
    vec2 delta=local-floor(v.xy);
    if(abs(delta.x)>16.0+uDetailedTraffic*24.0 || abs(delta.y)>16.0+uDetailedTraffic*24.0) continue;
    vec2 q=floor(vec2(dot(delta,v.zw),dot(delta,vec2(-v.w,v.z)))/(1.0+uDetailedTraffic*1.5)+0.5);
    vec3 lamp=v.z>0.0?vec3(0.5,0.85,1.0):vec3(1.0,0.36,0.18);
    if(uTrafficRank<1.5){
      float dotPixel=1.0-step(0.75,length(delta));
      color+=lamp*dotPixel*0.8;alpha=max(alpha,dotPixel);continue;
    }
    float kind=style.x,variant=style.y;
    float halfLength=kind<0.5?3.0+variant:kind<1.5?6.0+variant:8.0+variant;
    float body=step(abs(q.x),halfLength)*step(abs(q.y),kind<0.5?1.0:2.0);
    // Three car roofs, three cargo boxes and three bus lengths.
    float roof=step(abs(q.x+(kind<1.5?1.0:0.0)),kind<0.5?1.0+variant:halfLength-2.0)*step(abs(q.y+2.0),0.0);
    if(kind>0.5 && kind<1.5) roof*=1.0-step(halfLength-2.0,q.x);
    float shape=max(body,roof);
    float enginePod=uDetailedTraffic*step(abs(q.y-3.0),0.0)*step(abs(q.x),halfLength-1.0);
    shape=max(shape,enginePod);
    vec3 paint=mix(vec3(0.15,0.31,0.42),vec3(0.45,0.25,0.16),style.z);
    if(kind>1.5) paint=mix(vec3(0.2,0.34,0.4),vec3(0.5,0.38,0.16),style.z);
    float windows=step(1.0,mod(q.x+halfLength,3.0))*step(abs(q.y+1.0),0.0);
    if(kind>1.5) paint=mix(paint,vec3(0.55,0.72,0.68),windows*0.7);
    else if(q.x>halfLength-2.0 && q.y<0.0) paint=vec3(0.32,0.65,0.78);
    if(q.x>halfLength-1.0) paint=lamp;
    if(q.x<-halfLength+1.0) paint=vec3(0.8,0.12,0.07);
    if(enginePod>0.5) paint=mix(vec3(0.08,0.15,0.2),vec3(0.28,0.65,0.9),step(halfLength-3.0,abs(q.x)));
    if(uDetailedTraffic>0.5 && kind>0.5 && kind<1.5 && q.x<halfLength-2.0 && q.y>=0.0) paint*=mix(0.65,1.0,step(0.5,mod(q.x+halfLength,3.0)));
    color+=paint*shape;alpha=max(alpha,shape);
  }
  gl_FragColor=vec4(color,alpha*windowAt(vUv));
}
`, Me = x + /* glsl */
`
uniform sampler2D uSlatTexture;
uniform float uHasSlatTexture,uSlatTop,uSlatPeriod;
uniform vec2 uSlatBounds;
uniform vec4 uShutterLights[4];
uniform float uShutterEdge,uShutterClosed,uExteriorAmbient;
uniform vec4 uInterior;
void main(){
  vec2 p=floor(gl_FragCoord.xy);p.y=uResolution.y-p.y;
  if(p.y>uShutterEdge)discard;
  float slat=mod(p.y,9.0);
  float rib=slat<1.0?0.35:slat<3.0?1.15:0.78;
  float outside=pow(1.0-uShutterClosed,1.4)*(0.1+uExteriorAmbient*0.18);
  vec3 light=vec3(0.14,0.19,0.23)*outside;
  light+=vec3(0.18,0.11,0.05)*uInterior.x*max(0.0,1.0-length((p-uShutterLights[0].xy)/uShutterLights[0].zw));
  light+=vec3(0.16,0.09,0.04)*uInterior.y*max(0.0,1.0-length((p-uShutterLights[1].xy)/uShutterLights[1].zw));
  light+=vec3(0.015,0.04,0.05)*uInterior.w*max(0.0,1.0-length((p-uShutterLights[3].xy)/uShutterLights[3].zw));
  light+=vec3(0.025,0.018,0.008)*uInterior.z*max(0.0,1.0-length((p-uShutterLights[2].xy)/uShutterLights[2].zw));
  vec3 metal=texture2D(uSlatTexture,vec2(clamp((p.x-uSlatBounds.x)/uSlatBounds.y,0.0,1.0),1.0-fract((p.y-uSlatTop)/uSlatPeriod))).rgb;
  vec3 color=uHasSlatTexture>0.5?metal*(outside*4.0)+metal*light*3.0:light*rib;
  gl_FragColor=vec4(color,windowAt(vUv));
}
`, Ae = (
  /* glsl */
  `
precision highp float;
varying vec2 vUv;
uniform sampler2D uFrame,uGlassMask;
uniform vec2 uGlassResolution;
uniform vec4 uDrops[32];
uniform float uDropCount;
uniform float uShutterEdge;
void main(){
  vec4 base=texture2D(uFrame,vUv);
  if(texture2D(uGlassMask,vUv).r<0.5 || (1.0-vUv.y)*uGlassResolution.y<=uShutterEdge){gl_FragColor=base;return;}
  vec2 pixel=floor(vUv*uGlassResolution)+0.5;
  vec2 shift=vec2(0.0);float rim=0.0;
  for(int i=0;i<32;i++){
    if(float(i)>=uDropCount) break;
    vec4 drop=uDrops[i];
    vec2 delta=pixel-drop.xy;
    vec2 size=vec2(drop.z,drop.z*(1.2+drop.w*0.015));
    vec2 q=delta/size;float dist=dot(q,q);
    if(dist<1.0){ shift=q*drop.z*0.65;rim=(step(0.65,dist)*0.1+step(0.88,dist)*0.06)*step(0.0,q.y);break; }
    // A thin wet wake above each moving droplet.
    if(abs(delta.x)<0.65 && delta.y>0.0 && delta.y<drop.w*0.25) shift=vec2(1.0,0.0);
  }
  vec2 uv=(floor(pixel+shift)+0.5)/uGlassResolution;
  if(texture2D(uGlassMask,uv).r>0.5 && (1.0-uv.y)*uGlassResolution.y>uShutterEdge) base=texture2D(uFrame,uv);
  gl_FragColor=vec4(base.rgb+rim,1.0);
}
`
);
class B {
  canvas;
  width;
  height;
  options;
  renderer;
  target;
  scene = new T();
  output = new T();
  camera = new X(-1, 1, 1, -1, 0, 2);
  geometry = new Y(2, 2);
  textures = [];
  passes = [];
  clouds = [];
  lights = [];
  atmosphereLayers = /* @__PURE__ */ new Map();
  trafficLayers = /* @__PURE__ */ new Map();
  drops;
  imageLayers = /* @__PURE__ */ new Map();
  shadowLighting;
  shadowCasters = [];
  shadowReceivers = [];
  observer;
  parameters;
  windowTexture;
  outputMaterial;
  frameId = 0;
  previousTime = 0;
  time = 0;
  flashAge = 1 / 0;
  nextFlash = 14;
  running = !1;
  disposed = !1;
  contextLost = !1;
  resumeAfterRestore = !1;
  scale = 1;
  calls = 0;
  static async create(t) {
    const { width: i, height: s, layers: e = [], lights: o = [] } = t.scene;
    if (![i, s].every((l) => Number.isInteger(l) && l >= 1 && l <= 4096)) throw new Error("Scene dimensions must be integer logical pixels, 1вЂ¦4096");
    const r = ["sky", "cloud-far", "cloud-low", "fog", "rain", ...e.map((l) => l.id), ...o.map((l) => l.id)];
    if (t.scene.shutter) {
      if (r.push("shutter"), !t.scene.windowMask) throw new Error("Shutter requires window mask");
      V(t.scene.shutter, i, s);
    }
    if (r.push(...e.filter((l) => l.scope === "world").map((l) => `atmosphere-${l.id}`)), r.push(...e.filter((l) => l.scope === "world").map((l) => `traffic-${l.id}`)), r.push(...e.filter((l) => l.scope === "world" && l.closeTraffic).map((l) => `traffic-close-${l.id}`)), new Set(r).size !== r.length) throw new Error("Layer IDs must be unique, including reserved atmosphere IDs");
    for (const l of [...e, ...o]) {
      if (!Number.isFinite(l.depth) || l.depth <= 0 || l.depth >= 1e3) throw new Error(`Invalid depth for ${l.id}: expected 0 < depth < 1000`);
      if (!["world", "room"].includes(l.scope)) throw new Error(`Invalid scope: ${l.id}`);
    }
    for (const l of ["fogDepth", "rainDepth"]) {
      const a = t.scene[l];
      if (a !== void 0 && (!Number.isFinite(a) || a <= 0 || a >= 1e3)) throw new Error(`Invalid ${l}: expected 0 < depth < 1000`);
    }
    if (E(t.parameters), t.scene.shadowLighting && F(t.scene.shadowLighting), e.filter((l) => l.shadows?.casts).length > le) throw new Error("At most four shadow casters are supported");
    for (const l of e) if (l.shadows) {
      const a = l.shadows;
      if (!Number.isFinite(a.elevation) || a.elevation < 0 || a.opacity !== void 0 && (!Number.isFinite(a.opacity) || a.opacity < 0 || a.opacity > 1) || a.casts !== void 0 && typeof a.casts != "boolean" || a.receives !== void 0 && typeof a.receives != "boolean") throw new Error(`Invalid shadow geometry: ${l.id}`);
    }
    const u = new B(t);
    try {
      return await u.initialize(), u.render(), u;
    } catch (l) {
      throw u.dispose(), l;
    }
  }
  constructor(t) {
    this.options = t, this.width = t.scene.width, this.height = t.scene.height, this.parameters = E(t.parameters), this.shadowLighting = F(t.scene.shadowLighting ?? { enabled: !1, ambient: 1, lights: [] }), this.drops = new pe(this.width, this.height, this.parameters.seed), this.renderer = new J({ antialias: !1, alpha: !1, powerPreference: "low-power", premultipliedAlpha: !1 }), this.renderer.setPixelRatio(1), this.renderer.setSize(this.width, this.height, !1), this.renderer.outputColorSpace = K, this.renderer.setClearColor(new Z(...M(t.scene.background ?? "#060912")), 1), this.renderer.info.autoReset = !1, this.target = new Q(this.width, this.height, {
      minFilter: R,
      magFilter: R,
      depthBuffer: !1,
      stencilBuffer: !1,
      type: ee,
      format: I,
      generateMipmaps: !1
    }), this.target.texture.colorSpace = z, this.canvas = this.renderer.domElement, this.canvas.className = "atmosphere-canvas", this.canvas.setAttribute("aria-label", "Процедурная пиксельная сцена: небо, город и окно"), this.canvas.setAttribute("role", "img"), this.canvas.style.imageRendering = "pixelated", this.canvas.style.display = "block", this.canvas.style.flexShrink = "0", this.windowTexture = this.whiteTexture(), this.camera.position.z = 1, this.outputMaterial = new O({ vertexShader: j, fragmentShader: Ae, uniforms: { uFrame: { value: this.target.texture }, uGlassMask: { value: this.windowTexture }, uGlassResolution: { value: new S(this.width, this.height) }, uDrops: { value: Array.from({ length: 32 }, () => new g()) }, uDropCount: { value: 0 }, uShutterEdge: { value: -1 } }, depthTest: !1, depthWrite: !1 }), this.output.add(new N(this.geometry, this.outputMaterial)), t.container.append(this.canvas), this.observer = new ResizeObserver(() => this.resize()), this.observer.observe(t.container), this.canvas.addEventListener("webglcontextlost", this.onContextLost), this.canvas.addEventListener("webglcontextrestored", this.onContextRestored), this.resize();
  }
  assertAlive() {
    if (this.disposed) throw new Error("AtmosphereEngine has been disposed");
  }
  whiteTexture() {
    const t = new te(new Uint8Array([255, 255, 255, 255]), 1, 1, I);
    return t.needsUpdate = !0, this.textures.push(t), t;
  }
  async texture(t, i = !1) {
    const s = typeof t == "string" ? await new ie().loadAsync(t) : t instanceof se ? t.clone() : new re(t);
    this.textures.push(s), s.minFilter = R, s.magFilter = R, s.wrapS = $, s.wrapT = $, s.generateMipmaps = !1, s.premultiplyAlpha = !1, s.colorSpace = z, s.needsUpdate = !0;
    const e = s.image;
    if (!e?.width || !e.height) throw new Error("Texture must have a loaded 2D image");
    if (i && (e.width !== this.width || e.height !== this.height)) throw new Error(`Mask must match scene ${this.width}Г—${this.height}; got ${e.width}Г—${e.height}`);
    return s;
  }
  pass(t, i, s, e, o = {}, r = !1) {
    const u = {
      uResolution: { value: new S(this.width, this.height) },
      uWindow: { value: this.windowTexture },
      uClip: { value: e ? 1 : 0 },
      uSteps: { value: 12 },
      uFlash: { value: 0 },
      uSeed: { value: this.parameters.seed },
      ...o
    }, l = new O({
      vertexShader: j,
      fragmentShader: i,
      uniforms: u,
      transparent: !0,
      depthTest: !1,
      depthWrite: !1,
      blending: r ? oe : ae
    }), a = new N(this.geometry, l);
    a.renderOrder = s, a.frustumCulled = !1, this.scene.add(a);
    const h = { id: t, mesh: a, uniforms: u, userVisible: !0 };
    return this.passes.push(h), h;
  }
  async initialize() {
    const t = this.options.scene;
    t.windowMask && (this.windowTexture = await this.texture(t.windowMask, !0)), this.outputMaterial.uniforms.uGlassMask.value = this.windowTexture, this.pass("sky", xe, 0, !0, {
      uTop: { value: [0, 0, 0] },
      uBottom: { value: [0, 0, 0] },
      uGlow: { value: 0 },
      uTime: { value: 0 },
      uOvercast: { value: 0 },
      uStars: { value: 0 },
      uNight: { value: 1 },
      uDither: { value: 0 }
    });
    for (const e of ["far", "low"]) {
      const o = new S(), r = this.pass(`cloud-${e}`, be, this.parameters.clouds.layers[e].depth, !0, {
        uOffset: { value: o },
        uCoverage: { value: 0 },
        uDensity: { value: 0 },
        uScale: { value: 1 },
        uHeight: { value: 0.2 },
        uThickness: { value: 0.3 },
        uCloudSteps: { value: 4 },
        uStorm: { value: 0 },
        uCloudColor: { value: [0.2, 0.2, 0.3] }
      });
      this.clouds.push(Object.assign(r, { name: e, offset: o }));
    }
    this.pass("fog", Le, t.fogDepth ?? 50, !0, { uFog: { value: 0 }, uFogColor: { value: [0.2, 0.2, 0.3] } }), this.pass("rain", De, t.rainDepth ?? 80, !0, { uRain: { value: 0 }, uTime: { value: 0 } });
    for (const e of t.layers ?? []) {
      const o = await this.texture(e.source), { width: r, height: u } = o.image, l = e.x ?? 0, a = e.y ?? 0, h = e.opacity ?? 1;
      if (!e.placement && (!Number.isInteger(l) || !Number.isInteger(a) || l < 0 || a < 0 || l + r > this.width || a + u > this.height)) throw new Error(`${e.id}: native-size art must fit scene at integer coordinates`);
      if (!Number.isFinite(h) || h < 0 || h > 1) throw new Error(`${e.id}: opacity must be 0вЂ¦1`);
      const c = {
        uImage: { value: o },
        uOrigin: { value: new S(l, a) },
        uSize: { value: new S(r, u) },
        uOpacity: { value: h },
        uReceivesFlash: { value: e.receivesLightning ? 1 : 0 },
        uTint: { value: new q(...e.tint ?? [1, 1, 1]) },
        uTime: { value: 0 },
        uHasCityMask: { value: e.cityLightMask ? 1 : 0 },
        uCityMask: { value: e.cityLightMask ? await this.texture(e.cityLightMask) : this.windowTexture },
        uCityLights: { value: this.parameters.lighting.cityLightsIntensity },
        uBeacons: { value: 0 }
      }, d = (f) => {
        const w = f.image;
        if (w.width !== r || w.height !== u) throw new Error(`${e.id}: light map must match its source image`);
      };
      if (e.cityLightMask && d(c.uCityMask.value), e.roomLights) {
        const [f, w, b] = await Promise.all([this.texture(e.roomLights.left), this.texture(e.roomLights.right), this.texture(e.roomLights.emitters)]);
        [f, w, b].forEach(d), Object.assign(c, {
          uLeftLight: { value: f },
          uRightLight: { value: w },
          uEmitters: { value: b },
          uRoomControls: { value: new q() },
          uRadioDial: { value: new g(...e.roomLights.radioDial) },
          uRadioLed: { value: new S(...e.roomLights.radioLed) },
          uComputerScreen: { value: e.roomLights.computerScreen ? await this.texture(e.roomLights.computerScreen) : this.windowTexture },
          uComputerRect: { value: new g(...e.roomLights.computerRect ?? [0, 0, 0, 0]) },
          uComputerCorners: { value: new g(...e.roomLights.computerCorners ?? [e.roomLights.computerRect?.[0] ?? 0, e.roomLights.computerRect?.[2] ?? 0, e.roomLights.computerRect?.[0] ?? 0, e.roomLights.computerRect?.[2] ?? 0]) },
          uComputerOn: { value: 0 },
          uExteriorVisibility: { value: 1 }
        });
      }
      const m = e.shadows && e.shadows.receives !== !1;
      if (m) {
        const f = e.shadows.receiverMask ? await this.texture(e.shadows.receiverMask) : this.windowTexture;
        e.shadows.receiverMask && d(f), Object.assign(c, {
          uShadowReceiver: { value: f },
          uReceiverMask: { value: e.shadows.receiverMask ? 1 : 0 },
          uShadowEnabled: { value: 0 },
          uShadowAmbient: { value: 1 },
          uShadowTransmission: { value: 1 },
          uReceiverElevation: { value: e.shadows.elevation },
          uReceiverSelf: { value: -1 },
          uCasterRect: { value: Array.from({ length: 4 }, () => new g(0, 0, 1, 1)) },
          uCasterInfo: { value: Array.from({ length: 4 }, () => new g()) },
          uShadowLight: { value: Array.from({ length: 4 }, () => new g()) },
          uShadowColor: { value: Array.from({ length: 4 }, () => new g()) },
          uShadowParams: { value: Array.from({ length: 4 }, () => new g()) },
          ...Object.fromEntries([0, 1, 2, 3].map((w) => [`uCaster${w}`, { value: this.windowTexture }]))
        });
      }
      const y = e.roomLights ? Ce : Se, v = this.pass(e.id, m ? ue(y) : y, e.depth, e.scope === "world", c);
      if (m && this.shadowReceivers.push({ pass: v, id: e.id, scope: e.scope }), e.shadows?.casts) {
        const f = e.shadows.casterMask ? await this.texture(e.shadows.casterMask) : o;
        d(f), this.shadowCasters.push({ id: e.id, pass: v, texture: f, elevation: e.shadows.elevation, opacity: e.shadows.opacity ?? 1, red: !!e.shadows.casterMask, scope: e.scope });
      }
      this.imageLayers.set(e.id, { pass: v, native: new S(r, u) }), e.placement && this.placeLayer(e.id, e.placement);
    }
    const i = ["cityWindows", "neon", "street", "reflections", "exteriorRoom", "interior", "radio", "computer"];
    for (const e of t.lights ?? []) {
      if (!i.includes(e.group)) throw new Error(`Unknown light group: ${e.group}`);
      if (e.intensity !== void 0 && (!Number.isFinite(e.intensity) || e.intensity < 0 || e.intensity > 1)) throw new Error(`Invalid light intensity: ${e.id}`);
      if (e.pulse && (!Number.isFinite(e.pulse.periodSeconds) || e.pulse.periodSeconds <= 0 || !Number.isFinite(e.pulse.amount) || e.pulse.amount < 0 || e.pulse.amount > 1)) throw new Error(`Invalid pulse: ${e.id}`);
      const o = await this.texture(e.source, !0), r = this.pass(e.id, Ee, e.depth, e.scope === "world", {
        uImage: { value: o },
        uColor: { value: M(e.color) },
        uIntensity: { value: e.intensity ?? 1 }
      }, !0);
      this.lights.push(Object.assign(r, { config: { ...e } }));
    }
    const s = this.passes.map((e) => e.mesh.renderOrder);
    for (const e of t.layers ?? []) {
      if (e.scope !== "world") continue;
      const o = Math.min(1e3, ...s.filter((a) => a > e.depth)), r = this.pass(`atmosphere-${e.id}`, ke, (e.depth + o) / 2, !0, {
        uAtmosphere: { value: new g() },
        uAtmosphereColor: { value: [0, 0, 0] },
        uDrift: { value: new S() }
      });
      this.atmosphereLayers.set(e.id, r);
      const u = this.imageLayers.get(e.id), l = this.pass(`traffic-${e.id}`, _, e.depth + (o - e.depth) * 0.25, !0, {
        uVehicleCount: { value: 0 },
        uTrafficRank: { value: (t.layers ?? []).filter((a) => a.scope === "world" && a.depth < e.depth).length },
        uDetailedTraffic: { value: 0 },
        uVehicles: { value: Array.from({ length: 60 }, () => new g()) },
        uVehicleStyles: { value: Array.from({ length: 60 }, () => new g()) },
        uOrigin: u.pass.uniforms.uOrigin,
        uSize: u.pass.uniforms.uSize,
        uNative: { value: u.native }
      });
      if (this.trafficLayers.set(e.id, l), e.closeTraffic) {
        const a = this.pass(`traffic-close-${e.id}`, _, e.depth + (o - e.depth) * 0.75, !0, {
          ...l.uniforms,
          uDetailedTraffic: { value: 1 },
          uTrafficRank: { value: 2 },
          uVehicleCount: { value: 0 },
          uVehicles: { value: Array.from({ length: 60 }, () => new g()) },
          uVehicleStyles: { value: Array.from({ length: 60 }, () => new g()) }
        });
        this.trafficLayers.set(`close-${e.id}`, a);
      }
    }
    if (this.prepareAtmosphere(this.parameters), t.shutter) {
      const e = t.shutter.texture ? await this.texture(t.shutter.texture) : this.windowTexture, o = V(t.shutter, this.width, this.height, t.shutter.texture && e.image.height || 9);
      this.pass("shutter", Me, o.depth, !0, { uSlatTexture: { value: e }, uHasSlatTexture: { value: t.shutter.texture ? 1 : 0 }, uSlatTop: { value: o.top }, uSlatPeriod: { value: o.texturePeriod }, uSlatBounds: { value: new S(o.left, o.right - o.left) }, uShutterLights: { value: o.interiorLights.map((r) => new g(r.x, r.y, r.radiusX, r.radiusY)) }, uShutterEdge: { value: -1 }, uShutterClosed: { value: 0 }, uExteriorAmbient: { value: 0 }, uInterior: { value: new g() } });
    }
  }
  prepareAtmosphere(t) {
    for (const i of Object.keys(t.weather.layers)) if (!this.atmosphereLayers.has(i)) throw new Error(`Unknown world atmosphere layer: ${i}`);
    for (const i of this.atmosphereLayers.keys())
      Object.hasOwn(t.weather.layers, i) || (t.weather.layers[i] = { hazeDensity: 0, fogDensity: 0, fogAmount: 0.5, billowing: 0 });
  }
  getParameters() {
    return structuredClone(this.parameters);
  }
  getShadowLighting() {
    return this.assertAlive(), structuredClone(this.shadowLighting);
  }
  setShadowLighting(t) {
    this.assertAlive(), this.shadowLighting = F(t), this.renderAfterEdit();
  }
  exportShadowLighting() {
    return JSON.stringify(this.getShadowLighting());
  }
  importShadowLighting(t) {
    this.setShadowLighting(JSON.parse(t));
  }
  syncShadows() {
    for (const t of this.shadowReceivers) {
      const i = t.pass.uniforms;
      i.uShadowEnabled.value = this.shadowLighting.enabled ? 1 : 0, i.uShadowAmbient.value = this.shadowLighting.ambient, i.uReceiverSelf.value = this.shadowCasters.findIndex((s) => s.id === t.id);
      for (let s = 0; s < 4; s++) {
        const e = this.shadowCasters[s];
        if (i.uCasterInfo.value[s].set(0, 0, 0, 0), e) {
          const r = e.pass.uniforms.uOrigin.value, u = e.pass.uniforms.uSize.value;
          i.uCasterRect.value[s].set(r.x, r.y, u.x, u.y), i.uCasterInfo.value[s].set(e.elevation, e.opacity * e.pass.uniforms.uOpacity.value, e.red ? 1 : 0, e.pass.userVisible && e.scope === t.scope ? 1 : 0), i[`uCaster${s}`].value = e.texture;
        }
        const o = this.shadowLighting.lights[s];
        if (i.uShadowColor.value[s].set(0, 0, 0, 0), !(!o || o.enabled === !1 || (o.scope ?? "world") !== t.scope || o.type === "directional" && o.elevationDeg <= 0))
          if (i.uShadowColor.value[s].set(...o.color, o.intensity), o.type === "point")
            i.uShadowLight.value[s].set(o.x, o.y, o.elevation, 1), i.uShadowParams.value[s].set(0, o.radius, o.softness ?? 0, 0);
          else {
            const r = o.azimuthDeg * Math.PI / 180;
            i.uShadowLight.value[s].set(Math.cos(r), Math.sin(r), Math.tan(o.elevationDeg * Math.PI / 180), 0), i.uShadowParams.value[s].set(0, 1, o.softness ?? 0, o.maxDistance ?? 4096);
          }
      }
    }
  }
  setParameters(t) {
    this.assertAlive();
    const i = E(t, this.parameters);
    this.prepareAtmosphere(i), i.seed !== this.parameters.seed && this.drops.reset(i.seed), i.weather.stormEnabled || (this.flashAge = 1 / 0), i.weather.stormEnabled && !this.parameters.weather.stormEnabled && (this.nextFlash = this.time + 14), this.parameters = i, this.renderAfterEdit();
  }
  applyPreset(t) {
    this.replaceParameters(de(t));
  }
  importPreset(t) {
    this.replaceParameters(fe(t));
  }
  exportPreset() {
    return JSON.stringify(this.parameters, null, 2);
  }
  replaceParameters(t) {
    this.prepareAtmosphere(t), this.assertAlive(), this.parameters = t, this.seek(0);
  }
  /** Absolute deterministic state for screenshots, replays and preset comparisons. */
  seek(t) {
    if (this.assertAlive(), !Number.isFinite(t) || t < 0) throw new Error("Time must be finite and non-negative");
    this.time = t, this.flashAge = 1 / 0, this.nextFlash = t + 14, this.drops.reset(this.parameters.seed);
    for (const i of this.clouds)
      i.offset.set(0, 0), this.moveCloud(i, this.parameters.clouds.layers[i.name], t);
    this.render();
  }
  setLayerVisible(t, i) {
    this.assertAlive();
    const s = this.passes.find((e) => e.id === t);
    if (!s) throw new Error(`Unknown layer: ${t}`);
    s.userVisible = i, this.renderAfterEdit();
  }
  renderAfterEdit() {
    !this.running && this.options.autoRender !== !1 && this.render();
  }
  placeLayer(t, i) {
    const s = this.imageLayers.get(t);
    if (!s) throw new Error(`Unknown image layer: ${t}`);
    const { x: e, y: o, scale: r } = i;
    if (![e, o, r].every(Number.isFinite) || r < 0.1 || r > 4 || Math.abs(e) > this.width * 4 || Math.abs(o) > this.height * 4) throw new Error(`Invalid placement: ${t}`);
    const u = s.native.clone().multiplyScalar(r);
    s.pass.uniforms.uSize.value.copy(u), s.pass.uniforms.uOrigin.value.set(Math.round((this.width - u.x) / 2 + e), Math.round((this.height - u.y) / 2 + o));
  }
  /** Applies only explicit scene-authored transforms. Image data stays untouched. */
  setLayerPlacement(t, i) {
    this.assertAlive(), this.placeLayer(t, i), this.renderAfterEdit();
  }
  setLayerTint(t, i) {
    this.assertAlive();
    const s = this.imageLayers.get(t);
    if (!s || !i.every((e) => Number.isFinite(e) && e >= 0 && e <= 2)) throw new Error(`Invalid tint/layer: ${t}`);
    s.pass.uniforms.uTint.value.set(...i), this.renderAfterEdit();
  }
  setRoomLightLevels(t, i, s, e) {
    this.assertAlive();
    const o = this.imageLayers.get(t)?.pass;
    if (!o?.uniforms.uRoomControls || ![i, s, e].every((r) => Number.isFinite(r) && r >= 0 && r <= 1)) throw new Error(`Invalid room light controls: ${t}`);
    o.uniforms.uRoomControls.value.set(i, s, e), this.renderAfterEdit();
  }
  setComputerLevel(t, i, s = !1) {
    this.assertAlive();
    const e = this.imageLayers.get(t)?.pass;
    if (!e?.uniforms.uComputerOn || !Number.isFinite(i) || i < 0 || i > 1) throw new Error("Invalid computer control");
    e.uniforms.uComputerOn.value = i, s && (e.uniforms.uComputerScreen.value.needsUpdate = !0), this.renderAfterEdit();
  }
  setWindowShutter(t, i = [0, 0, 0, 0]) {
    this.assertAlive();
    const s = this.passes.find((r) => r.id === "shutter"), e = this.options.scene.shutter;
    if (!s || !e || ![t, ...i].every((r) => Number.isFinite(r) && r >= 0 && r <= 1)) throw new Error("Invalid shutter control");
    const o = t === 0 ? -1 : e.top + (e.bottom - e.top) * t;
    s.uniforms.uShutterEdge.value = o, s.uniforms.uShutterClosed.value = t, s.uniforms.uInterior.value.set(...i), this.outputMaterial.uniforms.uShutterEdge.value = o;
    for (const r of this.imageLayers.values()) r.pass.uniforms.uExteriorVisibility && (r.pass.uniforms.uExteriorVisibility.value = Math.pow(1 - t, 1.4));
    this.renderAfterEdit();
  }
  /** For an editor panorama view. Location art and masks themselves stay untouched. */
  setWindowMaskEnabled(t) {
    this.assertAlive();
    for (const i of this.passes)
      !this.options.scene.layers?.some((e) => e.id === i.id && e.scope === "room") && !this.options.scene.lights?.some((e) => e.id === i.id && e.scope === "room") && (i.uniforms.uClip.value = t ? 1 : 0);
    this.renderAfterEdit();
  }
  triggerLightning() {
    return this.assertAlive(), !this.parameters.weather.stormEnabled || this.flashAge < 1 ? !1 : (this.flashAge = 0, this.options.onLightning?.(), this.renderAfterEdit(), !0);
  }
  moveCloud(t, i, s) {
    const e = this.parameters.clouds.windDirectionDeg * Math.PI / 180, o = this.parameters.clouds.windSpeed * i.speed * 12 * s;
    t.offset.x -= Math.cos(e) * o, t.offset.y += Math.sin(e) * o;
  }
  update(t) {
    if (this.assertAlive(), !Number.isFinite(t) || t < 0) throw new Error("deltaSeconds must be finite and non-negative");
    this.time += t, this.flashAge += t, this.parameters.life.windowDrops && this.options.scene.windowMask && this.drops.update(t, this.parameters.weather.rain);
    for (const i of this.clouds) this.moveCloud(i, this.parameters.clouds.layers[i.name], t);
    this.parameters.weather.stormEnabled && this.time >= this.nextFlash && (this.triggerLightning(), this.nextFlash = this.time + 12 + (this.parameters.seed * 17 + Math.floor(this.time)) % 9), this.render();
  }
  groupIntensity(t) {
    const i = this.parameters;
    let s;
    switch (t.group) {
      case "exteriorRoom":
        s = i.lighting.exteriorRoomFill * (1 + U(i.timeOfDay, i.sky.palette).ambient) + this.flash() * 0.65;
        break;
      case "interior":
        s = i.lighting.interiorLightsEnabled ? 1 : 0;
        break;
      case "radio":
        s = i.lighting.radioBacklightEnabled ? 1 : 0;
        break;
      case "computer":
        s = i.lighting.computerEnabled ? 1 : 0;
        break;
      default:
        s = i.lighting.cityLightsIntensity;
    }
    const e = t.pulse ? 1 - t.pulse.amount * (0.5 + 0.5 * Math.sin(this.time * Math.PI * 2 / t.pulse.periodSeconds)) : 1;
    return Math.min(1, s * (t.intensity ?? 1) * e);
  }
  flash() {
    return this.parameters.weather.stormEnabled ? Math.max(0, 1 - this.flashAge / 0.55) ** 2 : 0;
  }
  render() {
    if (this.assertAlive(), this.contextLost) return;
    this.syncShadows();
    const t = this.parameters, i = U(t.timeOfDay, t.sky.palette), s = this.flash();
    for (const a of this.passes)
      a.uniforms.uFlash.value = s, a.uniforms.uSteps.value = t.render.colorSteps, a.uniforms.uSeed.value = t.seed, a.uniforms.uTime && (a.uniforms.uTime.value = this.time), a.uniforms.uCityLights && (a.uniforms.uCityLights.value = t.lighting.cityLightsIntensity), a.uniforms.uBeacons && (a.uniforms.uBeacons.value = t.life.beacons ? 1 : 0), a.mesh.visible = a.userVisible;
    const e = this.passes[0].uniforms;
    e.uTop.value = i.top, e.uBottom.value = i.bottom, e.uGlow.value = t.sky.horizonGlow, e.uStars.value = t.sky.starsEnabled && t.weather.rain === 0 && !t.weather.stormEnabled && t.sky.overcast < 0.5 ? 1 : 0, e.uNight.value = Math.max(0, Math.min(1, (0.42 - i.ambient) / 0.3)), e.uOvercast.value = Math.max(t.sky.overcast, t.weather.stormEnabled ? 0.95 : t.weather.rain > 0 ? 0.65 + t.weather.rain * 0.3 : 0), e.uDither.value = t.render.dithering ? 1 : 0;
    for (const a of this.clouds) {
      const h = t.clouds.layers[a.name], c = a.uniforms;
      a.mesh.visible = a.userVisible && t.clouds.enabled && h.enabled && h.thickness > 0 && t.clouds.coverage > 0, a.mesh.renderOrder = h.depth, c.uCoverage.value = t.clouds.coverage * h.coverage, c.uDensity.value = t.clouds.density * h.density, c.uScale.value = t.clouds.scale * h.scale, c.uHeight.value = h.height, c.uThickness.value = h.thickness, c.uCloudSteps.value = h.colorSteps, c.uStorm.value = t.weather.stormEnabled ? 1 : 0, c.uCloudColor.value = i.cloud;
    }
    const o = this.passes.find((a) => a.id === "fog"), r = this.passes.find((a) => a.id === "shutter");
    r && (r.mesh.visible = r.userVisible && r.uniforms.uShutterClosed.value > 0, r.uniforms.uExteriorAmbient.value = i.ambient);
    for (const a of this.trafficLayers.values())
      if (a.mesh.visible = a.userVisible && t.life.traffic > 0, a.mesh.visible) {
        const h = a.uniforms.uNative.value, c = a.uniforms.uDetailedTraffic.value > 0 ? ye(h.x, h.y, this.time, t.life.traffic, t.seed) : we(h.x, h.y, a.uniforms.uTrafficRank.value, this.time, t.life.traffic, t.seed);
        a.uniforms.uVehicleCount.value = c.length, c.forEach((d, m) => {
          a.uniforms.uVehicles.value[m].set(d.x, d.y, d.dx, d.dy), a.uniforms.uVehicleStyles.value[m].set(d.kind, d.variant, d.tint, 0);
        });
      }
    const u = t.life.windowDrops && this.options.scene.windowMask ? this.drops.drops : [];
    this.outputMaterial.uniforms.uDropCount.value = u.length, u.forEach((a, h) => this.outputMaterial.uniforms.uDrops.value[h].set(a.x, this.height - a.y, Math.sqrt(a.mass), a.speed));
    for (const [a, h] of this.atmosphereLayers) {
      const c = t.weather.layers[a];
      h.mesh.visible = h.userVisible && (c.hazeDensity > 0 || c.fogDensity > 0 && c.fogAmount > 0), h.uniforms.uAtmosphere.value.set(c.hazeDensity, c.fogDensity, Math.max(1e-4, c.fogAmount), c.billowing), h.uniforms.uAtmosphereColor.value = i.bottom.map((d, m) => d * 0.4 + i.cloud[m] * 0.6), h.uniforms.uDrift.value.set(this.time * 2, 0);
    }
    o.mesh.visible = o.userVisible && t.weather.fog > 0, o.uniforms.uFog.value = t.weather.fog, o.uniforms.uFogColor.value = i.bottom;
    const l = this.passes.find((a) => a.id === "rain");
    l.mesh.visible = l.userVisible && t.weather.rain > 0, l.uniforms.uRain.value = t.weather.rain, l.uniforms.uTime.value = this.time;
    for (const a of this.lights)
      a.uniforms.uIntensity.value = this.groupIntensity(a.config), a.config.group === "exteriorRoom" && (a.uniforms.uColor.value = M(a.config.color).map((h, c) => h * 0.8 + i.bottom[c] * 0.2)), a.mesh.visible = a.userVisible && a.uniforms.uIntensity.value > 0;
    this.renderer.info.reset(), this.renderer.setRenderTarget(this.target), this.renderer.render(this.scene, this.camera), this.renderer.setRenderTarget(null), this.renderer.render(this.output, this.camera), this.calls = this.renderer.info.render.calls;
  }
  start() {
    if (this.assertAlive(), this.running || this.contextLost) return;
    this.running = !0, this.previousTime = performance.now();
    const t = (i) => {
      if (!this.running) return;
      const s = me(i, this.previousTime);
      this.previousTime = i;
      try {
        this.update(s), this.frameId = requestAnimationFrame(t);
      } catch (e) {
        this.stop(), this.options.onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    };
    this.frameId = requestAnimationFrame(t);
  }
  stop() {
    this.running = !1, cancelAnimationFrame(this.frameId);
  }
  resize() {
    if (this.disposed) return;
    const t = this.options.container;
    this.scale = Math.max(1, Math.floor(Math.min(t.clientWidth / this.width, t.clientHeight / this.height))), this.canvas.style.width = `${this.width * this.scale}px`, this.canvas.style.height = `${this.height * this.scale}px`, this.canvas.style.transform = "";
    const i = this.canvas.getBoundingClientRect();
    this.canvas.style.transform = `translate(${Math.round(i.left) - i.left}px, ${Math.round(i.top) - i.top}px)`;
  }
  readPixels() {
    this.assertAlive(), this.render();
    const t = new Uint8Array(this.width * this.height * 4);
    return this.renderer.readRenderTargetPixels(this.target, 0, 0, this.width, this.height, t), t;
  }
  getDiagnostics() {
    return {
      logicalWidth: this.width,
      logicalHeight: this.height,
      integerScale: this.scale,
      drawCalls: this.calls,
      running: this.running,
      time: this.time,
      layers: this.passes.map((t) => ({ id: t.id, depth: t.mesh.renderOrder, visible: t.mesh.visible })).sort((t, i) => t.depth - i.depth)
    };
  }
  onContextLost = (t) => {
    t.preventDefault(), this.contextLost = !0, this.resumeAfterRestore = this.running, this.stop(), this.options.onError?.(new Error("WebGL context lost. Waiting for the browser to restore it."));
  };
  onContextRestored = () => {
    this.contextLost = !1, this.resumeAfterRestore ? this.start() : this.render();
  };
  dispose() {
    if (!this.disposed) {
      this.stop(), this.observer.disconnect(), this.canvas.removeEventListener("webglcontextlost", this.onContextLost), this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
      for (const t of this.passes) t.mesh.material.dispose();
      this.outputMaterial.dispose(), this.geometry.dispose(), this.target.dispose();
      for (const t of this.textures) t.dispose();
      this.renderer.dispose(), this.canvas.remove(), this.disposed = !0;
    }
  }
}
const Re = { clear: "Р§РёСЃС‚РѕРµ РЅРµР±Рѕ", broken: "РџРµСЂРµРјРµРЅРЅР°СЏ РѕР±Р»Р°С‡РЅРѕСЃС‚СЊ", overcast: "РџР°СЃРјСѓСЂРЅРѕ", rain: "Р”РѕР¶РґСЊ", storm: "Р“СЂРѕР·Р°", mist: "РўСѓРјР°РЅРЅР°СЏ С‚РёС€РёРЅР°" };
function ze(n, t = ["far", "midfar", "midnear", "near"]) {
  let i = n >>> 0;
  const s = () => (i = Math.imul(i, 1664525) + 1013904223 >>> 0, i / 4294967296), e = (v, f) => v + (f - v) * s(), o = s(), r = o < 0.25 ? "clear" : o < 0.45 ? "broken" : o < 0.6 ? "overcast" : o < 0.78 ? "rain" : o < 0.87 ? "storm" : "mist", u = s();
  let l = u < 0.4 ? e(21, 24) : u < 0.55 ? e(0, 4.5) : u < 0.85 ? e(8, 16) : s() < 0.5 ? e(5.5, 7) : e(18, 19.3);
  r === "mist" && (l = s() < 0.65 ? e(5.5, 7.8) : e(0, 5));
  const a = r === "rain" || r === "storm", h = a || r === "overcast", c = r === "clear" ? 0 : r === "mist" ? e(0.15, 0.55) : h ? e(0.88, 1) : e(0.3, 0.65), d = h ? e(0.84, 1) : r === "clear" ? 0 : e(0.4, 0.7), m = Object.fromEntries(t.map((v, f) => {
    const w = 1 - f / Math.max(1, t.length) * 0.8, b = (r === "mist" ? e(0.25, 0.55) : a ? e(0.06, 0.18) : r === "overcast" ? e(0.015, 0.06) : e(0, 0.025)) * w;
    return [v, { hazeDensity: (r === "mist" ? e(0.12, 0.25) : a ? e(0.07, 0.16) : e(0.015, 0.065)) * w, fogDensity: b, fogAmount: r === "mist" ? e(0.4, 0.7) : e(0.2, 0.45), billowing: r === "mist" ? e(0.3, 0.65) : e(0.02, 0.2) }];
  })), y = E({
    seed: n & 65535,
    timeOfDay: l,
    sky: { starsEnabled: !0, overcast: h ? a ? 0.9 : 0.72 : r === "mist" ? 0.35 : 0, horizonGlow: r === "clear" ? 0.12 : 0.08 },
    clouds: {
      enabled: c > 0,
      coverage: c,
      density: d,
      scale: e(0.28, 0.38),
      windSpeed: r === "mist" ? e(0.02, 0.12) : a ? e(0.25, 0.65) : e(0.08, 0.35),
      windDirectionDeg: e(-180, 180),
      layers: { far: { coverage: 1, height: h ? 0.45 : 0.25, thickness: h ? 0.8 : 0.28 }, low: { coverage: 1, height: h ? 0.55 : 0.4, thickness: h ? 0.85 : 0.3 } }
    },
    weather: { rain: r === "storm" ? e(0.6, 0.95) : r === "rain" ? e(0.2, 0.65) : 0, stormEnabled: r === "storm", fog: 0, layers: m }
  });
  return { kind: r, name: Re[r], parameters: y };
}
function Oe(n) {
  if (!Number.isFinite(n)) throw new Error("Invalid shutter closure");
  return Math.pow(1 - Math.max(0, Math.min(1, n)), 1.4);
}
function H(n) {
  if (!Number.isFinite(n.ambient) || n.ambient < 0 || !Number.isFinite(n.transmission ?? 1) || (n.transmission ?? 1) < 0 || (n.transmission ?? 1) > 1 || !Number.isFinite(n.minimumAmbient ?? 0.015) || (n.minimumAmbient ?? 0.015) < 0) throw new Error("Invalid ambient lighting");
  for (const t of n.lights) if (![t.x, t.y, t.radius, t.intensity, ...t.color].every(Number.isFinite) || t.radius <= 0 || t.intensity < 0 || t.color.length !== 3 || t.color.some((i) => i < 0 || i > 1)) throw new Error("Invalid sprite light");
}
function Fe(n, t, i, s) {
  if (H(s), ![n, t, i].every(Number.isFinite)) throw new Error("Invalid sample");
  const e = Math.max(s.minimumAmbient ?? 0.015, s.ambient * (s.transmission ?? 1)), o = [e, e, e];
  for (const r of s.lights) {
    const u = r.x - n, l = Math.hypot(u, r.y - t), a = 0.85 + 0.15 * (Math.max(0, Math.min(1, i)) - 0.5) * 2 * u / Math.max(1, l), h = r.intensity / (1 + (l / r.radius) ** 2) * a;
    for (let c = 0; c < 3; c++) o[c] += h * r.color[c];
  }
  return o;
}
function Ne(n, t, i) {
  if (!n.complete || !n.naturalWidth || ![t, i].every((c) => Number.isInteger(c) && c > 0 && c <= 4096)) throw new Error("Decoded image and valid sprite dimensions required");
  const s = document.createElement("canvas");
  s.width = t, s.height = i, s.className = "object-material";
  const e = s.getContext("2d"), o = document.createElement("canvas");
  o.width = 17, o.height = 17;
  const r = o.getContext("2d"), u = r.createImageData(17, 17);
  let l = "", a = !1;
  const h = n.style.visibility;
  return n.style.visibility = "hidden", { canvas: s, update(c, d, m) {
    if (a) return;
    H(m);
    const y = JSON.stringify([c, d, m]);
    if (y !== l) {
      l = y;
      for (let v = 0; v < 17; v++) for (let f = 0; f < 17; f++) {
        const w = f / 16, b = v / 16, L = Fe(c + w * t, d - i + b * i, w, m), k = (v * 17 + f) * 4;
        for (let A = 0; A < 3; A++) u.data[k + A] = Math.min(255, Math.round(L[A] * 255));
        u.data[k + 3] = 255;
      }
      r.putImageData(u, 0, 0), e.globalCompositeOperation = "source-over", e.clearRect(0, 0, t, i), e.imageSmoothingEnabled = !1, e.drawImage(n, 0, 0, t, i), e.globalCompositeOperation = "multiply", e.imageSmoothingEnabled = !0, e.drawImage(o, 0, 0, t, i), e.globalCompositeOperation = "destination-in", e.imageSmoothingEnabled = !1, e.drawImage(n, 0, 0, t, i), e.globalCompositeOperation = "source-over";
    }
  }, dispose() {
    a || (a = !0, n.style.visibility = h, s.remove(), s.width = s.height = o.width = o.height = 0);
  } };
}
const $e = "0.4.0";
export {
  $e as ATMOSPHERE_ENGINE_VERSION,
  B as AtmosphereEngine,
  ce as DEFAULT_PARAMETERS,
  P as PRESETS,
  Re as WEATHER_NAMES,
  Ne as createSpriteMaterial,
  de as getPreset,
  U as paletteAt,
  fe as parsePreset,
  Ie as projectShadowSample,
  ze as randomWeatherPreset,
  E as resolveParameters,
  F as resolveShadowLighting,
  V as resolveShutter,
  Fe as sampleSpriteLight,
  Oe as windowTransmission
};
//# sourceMappingURL=atmosphere-engine.js.map
