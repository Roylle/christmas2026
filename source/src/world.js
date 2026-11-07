// Sân khấu Three.js: tường giấy khuông nhạc, sàn giấy gấp đổi màu theo vùng, vật liệu giấy cắt, tuyết.
import * as THREE from 'three'

export const uniforms = {
  uGlowScale: { value: 1000 },
  uTime: { value: 0 },
  uFrom: { value: 0 },
  uTo: { value: 0 },
  uWipeC: { value: new THREE.Vector2(0, 0) },
  uWipeR: { value: 0 },
  uLoop: { value: 1 },
}

const SEASON = /* glsl */ `
uniform float uFrom, uTo, uWipeR;
uniform vec2 uWipeC;
float seasonAt() {
  vec2 p = gl_FragCoord.xy - uWipeC;
  float a = atan(p.y, p.x);
  float edge = uWipeR + 26.0 * sin(a * 7.0) + 14.0 * sin(a * 19.0 + 1.3);
  return mix(uFrom, uTo, smoothstep(edge + 3.0, edge - 3.0, length(p)));
}
// Đêm: giấy thành ánh trăng xanh, chỗ màu vàng ấm vẫn sáng như đèn.
vec3 grade(vec3 c, float n, float keep) {
  float l = dot(c, vec3(0.3, 0.59, 0.11));
  float warm = smoothstep(0.1, 0.42, c.r - c.b) * smoothstep(0.5, 0.78, l);
  vec3 night = c * vec3(0.5, 0.57, 0.86) + vec3(0.015, 0.02, 0.06);
  night = mix(night, c * 1.1, warm);
  return mix(c, mix(night, c * 0.82, keep), n);
}`

const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}`

// ---------- Vật liệu giấy cắt ----------

const CUT_VS = /* glsl */ `
uniform float uTime, uSway, uWave, uPhase, uBend;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float t = uTime;
  p.x += uSway * sin(t * 1.1 + uPhase) * uv.y * uv.y;
  p.z += uWave * sin(p.x * 2.4 + t * 1.5 + uPhase) * (1.0 - uv.y * 0.3);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`

const CUT_FS = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform float uKeep, uOpacity, uLift, uNightOnly;
varying vec2 vUv;
${NOISE}
${SEASON}
void main() {
  vec4 c = texture2D(map, vUv);
  if (c.a < 0.004) discard;
  vec3 rgb = c.rgb / max(c.a, 0.001);
  float grain = (vn(vUv * 240.0) - 0.5) * 0.035;
  rgb += grain;
  float season = seasonAt();
  float show = mix(1.0, season, uNightOnly);
  if (show <= 0.001) discard;
  rgb = (uNightOnly > 0.5 ? rgb : grade(rgb, season, uKeep)) + uLift * 0.05;
  gl_FragColor = vec4(rgb * c.a * uOpacity * show, c.a * uOpacity * show);
}`

const SHADOW_FS = /* glsl */ `
precision highp float;
uniform sampler2D map;
uniform float uOpacity;
varying vec2 vUv;
${SEASON}
void main() {
  vec4 c = texture2D(map, vUv);
  float n = seasonAt();
  vec3 col = mix(vec3(0.17, 0.23, 0.42), vec3(0.0, 0.01, 0.05), n);
  float a = c.a * uOpacity;
  gl_FragColor = vec4(col * a, a);
}`

function blend(mat) {
  mat.transparent = true
  mat.depthWrite = false
  mat.side = THREE.DoubleSide
  mat.blending = THREE.CustomBlending
  mat.blendSrc = THREE.OneFactor
  mat.blendDst = THREE.OneMinusSrcAlphaFactor
  return mat
}

export function cutMaterial(tex, o = {}) {
  return blend(new THREE.ShaderMaterial({
    vertexShader: CUT_VS,
    fragmentShader: CUT_FS,
    uniforms: {
      map: { value: tex },
      uTime: uniforms.uTime, uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR,
      uSway: { value: o.sway ?? 0 }, uWave: { value: o.wave ?? 0 }, uPhase: { value: o.phase ?? 0 }, uBend: { value: 0 },
      uKeep: { value: o.keep ?? 0 }, uOpacity: { value: 1 }, uLift: { value: 0 }, uNightOnly: { value: 0 },
    },
  }))
}

export function shadowMaterial(tex, opacity) {
  return blend(new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: SHADOW_FS,
    uniforms: { map: { value: tex }, uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR, uOpacity: { value: opacity } },
  }))
}

export function makeTexture(canvas, renderer, premultiply = true) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.NoColorSpace
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  t.premultiplyAlpha = premultiply
  renderer.initTexture(t)
  // Đã nằm trên GPU, trả lại bộ nhớ canvas. Mất context thì trang tải lại.
  canvas.width = 1; canvas.height = 1
  return t
}

// ---------- Tường giấy khuông nhạc ----------

export function createWall(L) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR, uLoop: { value: L } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uLoop;
      varying vec3 vW;
      ${NOISE}
      ${SEASON}
      float lineAt(float d, float w) { return smoothstep(w, w * 0.35, abs(d)); }
      void main() {
        float x = mod(vW.x, uLoop);
        float y = vW.y;
        float n = seasonAt();
        vec3 day = vec3(0.965, 0.962, 0.93);
        vec3 nig = vec3(0.075, 0.105, 0.26);
        vec3 ink = mix(vec3(0.5, 0.63, 0.86), vec3(0.45, 0.56, 0.86), n);
        vec3 col = mix(day, nig, n);
        // Sợi giấy
        float fibre = vn(vec2(x * 42.0, y * 7.0)) * 0.5 + vn(vec2(x * 9.0, y * 60.0)) * 0.5;
        col += (fibre - 0.5) * mix(0.028, 0.03, n);
        // Khuông nhạc: năm dòng, cách một khoảng rồi lặp lại. Nét hơi run như kẻ tay.
        float period = 2.5;
        float yy = mod(y + 0.2 + 0.012 * sin(x * 1.3) + 0.008 * sin(x * 3.7), period);
        float staff = 0.0;
        for (int i = 0; i < 5; i++) staff = max(staff, lineAt(yy - 0.42 - float(i) * 0.26, 0.016));
        float broken = 0.72 + 0.28 * vn(vec2(x * 3.0, floor(y * 4.0)));
        col = mix(col, ink, staff * 0.68 * broken);
        // Lề đỏ
        float count = floor(uLoop / 15.5 + 0.5);
        float m = mod(x, uLoop / count) - 2.0;
        col = mix(col, mix(vec3(0.86, 0.26, 0.3), vec3(0.95, 0.5, 0.45), n), lineAt(m + 0.004 * sin(y * 4.0), 0.024) * 0.72);
        // Sao đêm
        vec2 g = vec2(x, y) * 2.6;
        float s = h21(floor(g));
        float star = step(0.965, s) * smoothstep(0.1, 0.0, length(fract(g) - 0.5));
        col += star * n * 0.8;
        // Nếp gấp sát sàn
        col *= 1.0 - 0.22 * smoothstep(0.55, 0.0, y);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), mat)
  m.position.set(0, 18, 0)
  m.renderOrder = -10
  mat.depthWrite = false
  return m
}

// ---------- Sàn giấy ----------

export function createFloor(L, biomes) {
  const xs = biomes.map((b) => b.x)
  const cols = biomes.map((b) => new THREE.Color(b.color).convertLinearToSRGB())
  // Màu lấy trực tiếp từ mã hex, không qua quản lý màu.
  biomes.forEach((b, i) => { const n = parseInt(b.color.slice(1), 16); cols[i] = new THREE.Vector3((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) })
  const N = biomes.length
  const mat = new THREE.ShaderMaterial({
    uniforms: { uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR, uLoop: { value: L }, uX: { value: xs }, uC: { value: cols } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uLoop;
      uniform float uX[${N}];
      uniform vec3 uC[${N}];
      varying vec3 vW;
      ${NOISE}
      ${SEASON}
      void main() {
        float z = vW.z;
        // Mép giữa hai vùng rách như xé tay
        float x = mod(vW.x + (vn(vec2(vW.x * 0.3, z * 2.4)) - 0.5) * 0.5, uLoop);
        vec3 c = uC[${N - 1}];
        for (int i = 0; i < ${N}; i++) { if (x >= uX[i]) c = uC[i]; }
        // Nét sáp xiên
        float a = (vW.x + z) * 16.0;
        float hatch = vn(vec2(a, (vW.x - z) * 1.6));
        c *= 0.93 + 0.1 * hatch;
        // Lưới giấy gấp
        float gx = abs(fract(mod(vW.x, uLoop) * 1.0) - 0.5);
        float gz = abs(fract(z * 1.5) - 0.5);
        float grid = max(smoothstep(0.48, 0.5, gx), smoothstep(0.47, 0.5, gz));
        c = mix(c, c * 0.72, grid * 0.65);
        // Mép gấp thứ hai, phần gần người xem tối hơn
        c *= mix(1.0, 0.86, smoothstep(3.92, 3.97, z));
        c *= 1.0 - 0.24 * smoothstep(3.97, 3.9, z) * smoothstep(3.7, 3.9, z);
        c *= 1.0 - 0.26 * smoothstep(0.4, 0.0, z);
        gl_FragColor = vec4(grade(c, seasonAt(), 0.0), 1.0);
      }`,
  })
  mat.depthWrite = false
  const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), mat)
  m.rotation.x = -Math.PI / 2
  m.position.set(0, 0, 20)
  m.renderOrder = -9
  return m
}

// ---------- Tuyết giấy ----------

export function createSnow(count) {
  const g = new THREE.BufferGeometry()
  const seeds = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) seeds[i] = Math.random()
  g.setAttribute('position', new THREE.BufferAttribute(seeds, 3))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: uniforms.uTime, uCam: { value: new THREE.Vector3() }, uSpan: { value: new THREE.Vector3(30, 24, 7) }, uSize: { value: 40 }, uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR },
    vertexShader: /* glsl */ `
      uniform float uTime, uSize;
      uniform vec3 uCam, uSpan;
      varying float vR;
      void main() {
        vec3 s = position;
        vR = s.x * 6.28;
        float fall = uTime * (0.32 + s.y * 0.3);
        vec3 p;
        p.y = mod(s.y * uSpan.y - fall, uSpan.y) - 0.5;
        p.x = mod(s.x * uSpan.x + sin(uTime * 0.5 + s.z * 9.0) * 0.4 - uCam.x, uSpan.x) - uSpan.x * 0.5 + uCam.x;
        p.z = 0.6 + s.z * uSpan.z;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.45 + s.z * 0.6) / -mv.z * 10.0;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vR;
      ${SEASON}
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float c = cos(vR), s = sin(vR);
        p = mat2(c, -s, s, c) * p;
        float a = atan(p.y, p.x);
        float r = 0.34 + 0.08 * cos(a * 6.0);
        float d = length(p);
        float fill = smoothstep(r, r - 0.04, d);
        float ring = smoothstep(r - 0.1, r - 0.05, d) * fill;
        float n = seasonAt();
        vec3 col = mix(vec3(1.0), mix(vec3(0.42, 0.55, 0.8), vec3(0.8, 0.88, 1.0), n), ring);
        gl_FragColor = vec4(col, fill * 0.95);
      }`,
  })
  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  pts.renderOrder = 50
  return pts
}

// ---------- Ánh đèn ban đêm ----------

export function createGlow(lights) {
  const n = lights.length
  const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3); const data = new Float32Array(n * 2)
  lights.forEach((l, i) => {
    pos.set([l.x, l.y, l.z ?? 0.04], i * 3)
    col.set([((l.c >> 16) & 255) / 255, ((l.c >> 8) & 255) / 255, (l.c & 255) / 255], i * 3)
    data.set([l.size, Math.random() * 6.28], i * 2)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  g.setAttribute('aData', new THREE.BufferAttribute(data, 2))
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    uniforms: { uTime: uniforms.uTime, uGlowScale: uniforms.uGlowScale, uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute vec2 aData;
      uniform float uTime, uGlowScale;
      varying vec3 vC; varying float vT;
      void main() {
        vC = aColor;
        vT = 0.72 + 0.28 * sin(uTime * (1.4 + fract(aData.y) * 2.2) + aData.y);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aData.x * uGlowScale / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vC; varying float vT;
      ${SEASON}
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float halo = pow(1.0 - d, 2.2);
        float core = smoothstep(0.16, 0.0, d);
        float n = seasonAt();
        vec3 c = (vC * halo * 0.75 + vec3(1.0, 0.97, 0.88) * core * 0.9) * vT * n;
        gl_FragColor = vec4(c, 0.0);
      }`,
  })
  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  pts.renderOrder = 45
  return pts
}

// Cột sáng sân khấu: quét qua lại khi đêm xuống.
export function createBeam(color, length, width) {
  const geo = new THREE.PlaneGeometry(width, length, 1, 1)
  geo.translate(0, -length / 2, 0)
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    uniforms: { uColor: { value: new THREE.Color(color) }, uFrom: uniforms.uFrom, uTo: uniforms.uTo, uWipeC: uniforms.uWipeC, uWipeR: uniforms.uWipeR },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uColor;
      varying vec2 vUv;
      ${SEASON}
      void main() {
        float along = 1.0 - vUv.y;
        float spread = 0.1 + along * 0.9;
        float x = abs(vUv.x - 0.5) * 2.0 / spread;
        float a = smoothstep(1.0, 0.2, x) * (1.0 - along * 0.75) * 0.34;
        gl_FragColor = vec4(uColor * a * seasonAt(), 0.0);
      }`,
  })
  const m = new THREE.Mesh(geo, mat)
  m.renderOrder = 44
  return m
}
