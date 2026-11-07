// Hành trình qua quyển tập nhạc: dựng cảnh, đọc con lăn và cảm ứng, vòng lặp vẽ, tương tác.
import '@fontsource/mali/400.css'
import '@fontsource/mali/600.css'
import '@fontsource/mali/700.css'
import * as THREE from 'three'
import { buildProps, renderProp } from './art.js'
import { uniforms, cutMaterial, shadowMaterial, makeTexture, createWall, createFloor, createSnow, createGlow, createBeam } from './world.js'
import { data, chapters, biomes, LOOP, BUY, MAP } from './content.js'
import { createMusic } from './music.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const root = document.documentElement
const $ = (s) => document.querySelector(s)
const mod = (v, m) => ((v % m) + m) % m
const wrapDelta = (v) => mod(v + LOOP / 2, LOOP) - LOOP / 2
const smooth = (t) => t * t * (3 - 2 * t)

// Câu trả lời đưa vào lớp chữ để trình đọc màn hình đọc được.
$('#doc-faq').innerHTML = data.faq.map((f) => `<h3>${f.q}</h3><p>${f.a}</p>`).join('')

function supportsGL() {
  try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false }
}

if (supportsGL()) start().catch((error) => {
  console.error(error)
  root.classList.remove('gl'); root.classList.add('nogl')
  $('#loader').remove()
})
else { root.classList.add('nogl'); $('#loader').remove() }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Không tải được ${src}`))
    img.src = src
  })
}

async function start() {
  root.classList.add('gl')
  const base = import.meta.env.BASE_URL
  const canvas = $('#stage')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setClearColor(0xf6f5ed)
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); root.classList.remove('gl'); root.classList.add('nogl'); window.dispatchEvent(new Event('scene-lost')); })

  const notes = $('#loader-notes')
  const setLoad = (p) => {
    const want = Math.round(p * 11)
    while (notes.children.length < want) {
      const i = notes.children.length
      const y = 58 - ((i * 5) % 4) * 10
      notes.insertAdjacentHTML('beforeend', `<g><ellipse cx="${20 + i * 26}" cy="${y}" rx="7" ry="5" transform="rotate(-20 ${20 + i * 26} ${y})"/><rect x="${26 + i * 26}" y="${y - 26}" width="1.8" height="26"/></g>`)
    }
  }

  // ---------- Ảnh và phông chữ ----------
  await Promise.all([600, 700].map((w) => document.fonts.load(`${w} 30px Mali`, document.documentElement.lang === 'en' ? 'Christmas together' : 'Giáng Sinh bên nhau')))
  const a = `${base}assets/`
  const imgs = {}
  const jobs = [['logo', 'logotype-gold.webp'], ['brand', 'logo-light.svg'], ['seat', 'seating-map.svg'], ['hotel', 'renaissance-exterior.jpg']]
  data.photos.forEach((p, i) => jobs.push([`photo${i}`, `moments/${p.src}.webp`]))
  data.albums.forEach((p, i) => jobs.push([`album${i}`, `${p.src}.webp`]))
  let loaded = 0
  const blank = document.createElement('canvas')
  blank.width = 480; blank.height = 320
  const blankCtx = blank.getContext('2d')
  blankCtx.fillStyle = '#eee8d9'; blankCtx.fillRect(0, 0, 480, 320)
  blankCtx.fillStyle = '#64728a'; blankCtx.font = '600 24px Mali'; blankCtx.textAlign = 'center'
  blankCtx.fillText('♪  ·  ♪  ·  ♪', 240, 170)
  jobs.forEach(([k]) => { imgs[k] = blank })
  await Promise.all(jobs.slice(0, 2).map(async ([k, f]) => { imgs[k] = await loadImage(a + f); setLoad(++loaded / 2 * 0.4) }))

  // ---------- Sân khấu ----------
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120)
  const wall = createWall(LOOP)
  const floor = createFloor(LOOP, biomes)
  scene.add(wall, floor)
  const snow = reduced ? null : createSnow(innerWidth < 800 ? 60 : 120)
  if (snow) scene.add(snow)

  const view = { W: 16, H: 10, cx: 3.5, portrait: false }
  const narrow = innerWidth / innerHeight < 1
  const quality = Math.min(1.5, Math.max(1, (narrow ? 1.25 : 1.55) * (Math.min(devicePixelRatio, 2) / 2 + 0.25)))

  const P = buildProps(imgs, data)
  for (const [name, prop] of Object.entries(P)) {
    if (/^(note|seasonAdult|frameHead|storyHead|ticketHead|venueHead|faqHead|dateCard|seatCard|checkin|photo\d+|ticket\d+|faq\d+)$/.test(name)) prop.keep = true
  }
  const tex = {}
  const names = Object.keys(P)
  for (let i = 0; i < names.length; i++) {
    const n = names[i]
    const prop = P[n]
    const k = Math.min(quality, 2048 / Math.max(prop.w + 16, prop.h + 16))
    const out = renderProp(n, prop, k)
    const shadow = out.shadow ? makeTexture(out.shadow, renderer) : null
    tex[n] = { pad: out.pad, map: makeTexture(out.canvas, renderer), shadow, w: (prop.w + out.pad * 2) / 100, h: (prop.h + out.pad * 2) / 100, prop }
    if (i % 4 === 3) { setLoad(0.4 + (i / names.length) * 0.6); await new Promise((r) => setTimeout(r)) }
  }

  const pendingImages = jobs.slice(2)
  const hydrated = new Set()
  const imageProps = key => key === 'seat' ? ['seatCard'] : key === 'hotel' ? ['hotel'] : key.startsWith('photo') ? [key] : [`wagon${key.replace('album', '')}`]
  async function hydrateImages() {
    while (pendingImages.length) {
      const [key, file] = pendingImages.shift()
      try {
        imgs[key] = await loadImage(a + file)
        for (const name of imageProps(key)) {
          const prop = P[name], texture = tex[name]
          const out = renderProp(name, prop, Math.min(quality, 2048 / Math.max(prop.w + 16, prop.h + 16)))
          texture.map.image = out.canvas; texture.map.needsUpdate = true
          if (texture.shadow && out.shadow) { texture.shadow.image = out.shadow; texture.shadow.needsUpdate = true }
        }
        hydrated.add(key)
      } catch { /* The full image remains available through its dialog link. */ }
      await new Promise(resolve => setTimeout(resolve, 24))
    }
  }

  // ---------- Xếp vật thể ----------
  const items = []
  const glows = []
  const hits = []
  const planeBottom = (w, h) => { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); return g }
  const planeTop = (w, h) => { const g = new THREE.PlaneGeometry(w, h); g.translate(0, -h / 2, 0); return g }
  let phase = 1

  // mode: up = bật dậy từ sàn, peel = lật ra khỏi tường, hang = thả từ trên xuống, none = đứng yên.
  function add(name, x, y, o = {}) {
    const t = tex[name]
    const s = o.s ?? 1
    const w = t.w * s; const h = t.h * s
    const group = new THREE.Group()
    const pivot = new THREE.Group()
    group.add(pivot)
    const z = o.z ?? 0.3
    phase += 1.7
    const hang = o.mode === 'hang' || o.anchorTop
    const mat = cutMaterial(t.map, { sway: (t.prop.sway ? 0.07 : 0) * h * (reduced ? 0 : 1), wave: (t.prop.wave ? 0.05 : 0) * (reduced ? 0 : 1), phase, keep: t.prop.keep ? 1 : 0 })
    const mesh = new THREE.Mesh((hang ? planeTop : planeBottom)(w, h), mat)
    mesh.renderOrder = z * 10 + 2
    pivot.add(mesh)
    if (o.flipX) mesh.scale.x = -1
    if (t.shadow && o.shadow !== false) {
      const depth = hang ? z : z
      const m = new THREE.Mesh((hang ? planeTop : planeBottom)(w * 1.05, h * 1.05), shadowMaterial(t.shadow, Math.max(0.16, 0.42 - depth * 0.06)))
      m.position.set(0.05 + depth * 0.07, -0.05 - depth * 0.03, -z + 0.015)
      m.renderOrder = 1
      pivot.add(m)
    }
    if (o.stick) {
      const st = tex.stick
      const len = hang ? 12 : (o.stickLen ?? y + 0.55)
      const sm = new THREE.Mesh((hang ? planeBottom : planeTop)(0.13, len), cutMaterial(st.map))
      sm.position.set(o.stickX ?? 0, hang ? 0 : 0.5 - 0.05, -0.02)
      if (!hang) sm.position.y = 0.55
      sm.renderOrder = mesh.renderOrder - 1
      pivot.add(sm)
    }
    // Bóng đèn của vật: nằm trong pivot nên theo vật bật dậy, đung đưa và lặp vòng.
    if (t.prop.lights) {
      const pad = t.pad
      const pts = createGlow(t.prop.lights.map(([ax, ay, c, size]) => ({
        x: ((ax + pad) / 100 - t.w / 2) * s * (o.flipX ? -1 : 1),
        y: hang ? -((ay + pad) / 100) * s : (t.h - (ay + pad) / 100) * s,
        z: 0.04, c, size: size * Math.sqrt(s),
      })))
      pts.renderOrder = mesh.renderOrder + 0.5
      pivot.add(pts)
      glows.push(pts)
    }
    if (o.night) mat.uniforms.uNightOnly.value = 1
    if (o.string) {
      const sm = new THREE.Mesh(planeBottom(0.05, 10), cutMaterial(tex.string.map))
      sm.position.set(0, -0.03, -0.02)
      sm.renderOrder = mesh.renderOrder - 1
      pivot.add(sm)
    }
    group.position.set(x, y, z)
    scene.add(group)
    const item = { name, x, y, z, m: o.m, s, group, pivot, mesh, mode: o.mode ?? 'up', onTap: o.onTap, label: o.label, sp: reduced ? 1 : 0, v: 0, hover: 0, hv: 0, phase, bob: o.bob ?? 0, spin: o.spin, tick: o.tick, h, w, delay: o.delay ?? 0, seen: false }
    items.push(item)
    if (o.onTap) { mesh.userData.item = item; hits.push(mesh) }
    return item
  }

  const openLink = (url) => () => window.open(url, '_blank', 'noopener')
  const scatter = (arr) => arr.forEach(([n, x, o = {}]) => add(n, x, o.y ?? 0, { z: o.z ?? 0.6, ...o }))

  // Chương 1: mở đầu
  add('banner', -0.3, 3.0, { z: 0.5, stick: true, stickX: -2.2, m: { x: 0, y: 4.6, s: 0.96 } })
  const b1 = items[items.length - 1]
  const st2 = new THREE.Mesh(planeTop(0.13, 3.6), cutMaterial(tex.stick.map)); st2.position.set(2.2, 0.55, -0.02); st2.renderOrder = 3; b1.pivot.add(st2)
  add('dateCard', 4.95, 1.9, { z: 0.9, stick: true, s: 0.84, m: { x: 1.5, y: 2.2, s: 1.12 } })
  add('buy', 4.75, 0.42, { z: 1.9, s: 1, onTap: openLink(BUY), label: 'Mở trang đặt vé', m: { x: 1.9, y: 0.65, s: 1 } })
  add('hint', 0.6, 0.45, { z: 2.6, mode: 'none', shadow: false, s: 0.9, m: { x: 1.3, y: -0.7, s: 0.8 } })
  scatter([
    ['tree', -9.2, { z: 0.8, s: 1.25 }], ['treeSmall', -6.4, { z: 1.4 }], ['snowman', 10, { z: 1.2, s: 1.05, onTap: (it) => kick(it), label: 'Chào người tuyết' }],
    ['giftR', 8, { z: 2.5, s: 0.9 }], ['giftG', 9.2, { z: 3.1, s: 0.9 }], ['tuft', 5.3, { z: 3.1 }], ['tuft', -2.6, { z: 3.3, s: 0.8 }], ['treeSmall', 13.2, { z: 0.8, s: 1.2 }],
  ])
  add('cloud', -3.8, 6.2, { z: 0.35, mode: 'peel', s: 0.8, m: { x: 2.5, y: 8.4 } })
  add('star', 5.2, 7.9, { z: 0.6, mode: 'hang', string: true, s: 0.8, bob: 0.08, m: { x: -2.4, y: 9.9 } })
  add('bauble', 7.8, 7.7, { z: 0.5, mode: 'hang', string: true, s: 0.8, bob: 0.06, m: { x: 0.5, y: 10.2 } })

  add('sleigh', 12.2, 5.9, { z: 0.55, mode: 'peel', s: 0.9, bob: 0.1, m: { x: 12.2, y: 8.2 } })
  add('wreath', -7.4, 4.3, { z: 0.2, mode: 'peel', s: 0.95, m: { x: -5.2, y: 5.2 } })
  add('gingerHouse', 11.2, 0, { z: 0.85, s: 0.95 })
  add('candyCane', 8.8, 0, { z: 1.0, s: 0.95 })
  add('candyCane', -4.6, 0, { z: 2.0, s: 0.72 })
  add('teddy', 12.8, 0, { z: 2.5, s: 0.85 })
  // Chương 2: hai mùa
  add('note', 18.2, 2.3, { z: 0.35, mode: 'peel', m: { x: 15.5, y: 3.0, s: 1.05 } })
  add('seasonChild', 25.2, 1.9, { z: 0.6, stick: true, onTap: () => setSeason(0), label: 'Mở mùa thơ bé', m: { x: 24, y: 2.2, s: 1.15 } })
  add('seasonAdult', 32.4, 1.9, { z: 0.6, stick: true, onTap: () => setSeason(1), label: 'Mở mùa trưởng thành', m: { x: 32, y: 2.2, s: 1.15 } })
  add('twoNote', 28.8, 7.0, { z: 0.3, mode: 'peel', m: { x: 28, y: 8.5, s: 1.1 } })
  scatter([
    ['giftR', 22, { z: 2.4 }], ['giftG', 23.2, { z: 3 }], ['treeSmall', 20.9, { z: 1.2, s: 1.1 }], ['tree', 36.3, { z: 1, s: 1.1 }], ['tuft', 29, { z: 3.2 }], ['giftG', 37.8, { z: 2.6 }],
  ])
  add('star', 22.4, 8, { z: 0.5, mode: 'hang', string: true, s: 0.6, bob: 0.08 })
  add('bauble', 35.6, 7.9, { z: 0.5, mode: 'hang', string: true, s: 0.7, bob: 0.08 })

  add('moon', 36.6, 5.2, { z: 0.08, mode: 'none', shadow: false, night: true, m: { x: 35, y: 7.6 } })
  add('teddy', 25.8, 0, { z: 2.3, s: 0.9 })
  add('drum', 27.3, 0, { z: 1.9, s: 0.9 })
  add('piano', 32.5, 0, { z: 1.5, s: 0.82 })
  add('lamp', 29.4, 0, { z: 0.95, s: 1.05 })
  add('lamp', 38.4, 0, { z: 1.0, s: 1.05 })
  add('wreath', 16.0, 5.2, { z: 0.15, mode: 'peel', s: 0.72 })
  // Chương 3: dây phơi ảnh
  add('frameHead', 43.6, 2.8, { z: 0.35, mode: 'peel', m: { x: 43.6, y: 3.4, s: 1.05 } })
  add('camera', 40.0, 0, { z: 1.8, s: 1.1 })
  add('bunting', 43.6, 6.7, { z: 0.2, mode: 'none', shadow: false, m: { y: 8.0 } })
  data.photos.forEach((ph, i) => {
    const it = add(`photo${i}`, ph.x, ph.top, {
      z: ph.rope ? 0.7 + (i % 3) * 0.14 : 0.42, mode: ph.rope ? 'hang' : 'peelTop', s: ph.s, bob: ph.rope ? 0.018 : 0,
      onTap: () => openPhoto(ph), label: 'Xem ảnh lớn', anchorTop: true, m: { y: ph.top + 0.5 },
    })
    it.swing = !!ph.rope
    if (!ph.rope) it.tilt = (i % 2 ? 1 : -1) * 0.035
    if (ph.rope) {
      const clip = add('clip', ph.x, ph.top + 0.34, { z: 0.72 + (i % 3) * 0.14, mode: 'none', shadow: false, s: 0.42, anchorTop: true, m: { y: ph.top + 0.84 } })
      void clip
    }
  })
  add('photoEmpty', 81, 7.05, { z: 0.72, mode: 'hang', s: 0.92, onTap: openLink(BUY), label: 'Mua vé', m: { y: 7.55 } })
  for (let i = -1; i < 12; i++) {
    const rp = add('rope', 49.5 + i * 3.2, 7.06, { z: 0.66, mode: 'none', shadow: false, s: 1.02 })
    rp.m = { y: 7.56 }
  }
  scatter([['giftG', 46, { z: 2.9, s: 0.85 }], ['drum', 47.8, { z: 2.3 }], ['candyCane', 53.8, { z: 1.2, s: 0.8 }]])
  // Hàng khán giả nhỏ đứng xem ảnh, lắc lư theo nhạc.
  ;[49.6, 51, 56.4, 60.8, 62.2, 67, 71.2, 75.6].forEach((x, i) => add('choir', x, 0, { z: 1.5 + (i % 3) * 0.5, s: 0.92 + (i % 2) * 0.1, bob: 0.03 }))

  // Chương 4: một đoàn tàu duy nhất, đầu máy dẫn đầu bên phải, các toa nối phía sau. Em bé ngồi trên mái.
  add('storyHead', 85.6, 5.5, { z: 0.28, mode: 'peel', s: 0.95, m: { x: 90, y: 6.3, s: 1.1 } })
  add('mountain', 90, 0, { z: 0.1, mode: 'none', shadow: false, s: 1.25 })
  add('moon', 94.5, 5.6, { z: 0.08, mode: 'none', shadow: false, s: 0.9, night: true, m: { x: 93, y: 8.6 } })
  const railZ = 1.4
  const trainX0 = 83.6
  const CAR = 3.92
  for (let i = 0; i < 7; i++) add('rail', trainX0 - 3.2 + i * 3, 0.02, { z: railZ - 0.05, mode: 'none', shadow: false })
  const spinners = []
  const addWheels = (it, list, big) => {
    list.forEach((wx) => {
      const t = tex[big ? 'wheelBig' : 'wheelSmall']
      const w2 = new THREE.Mesh(new THREE.PlaneGeometry(t.w, t.h), cutMaterial(t.map))
      w2.position.set(wx, 0.1, 0.04); w2.renderOrder = it.mesh.renderOrder + 1
      it.pivot.add(w2); spinners.push(w2)
    })
  }
  // Thứ tự ngược: album đầu tiên nối ngay sau đầu máy, các toa còn lại kéo dài về phía sau.
  ;[3, 2, 1, 0].forEach((albumIndex, slot) => {
    const it = add(`wagon${albumIndex}`, trainX0 + slot * CAR, 0.22, { z: railZ, bob: 0.008, onTap: () => openAlbum(albumIndex), label: 'Xem ảnh lớn' })
    addWheels(it, [-1.2, 1.2], false)
    add('connector', trainX0 + slot * CAR + CAR / 2, 0.44, { z: railZ - 0.02, mode: 'none', shadow: false, s: 1 })
  })
  const engineX = trainX0 + 4 * CAR + 0.42
  const engine = add('engine', engineX, 0.22, { z: railZ, s: 1.05, bob: 0.014 })
  addWheels(engine, [-1.3, -0.25, 0.8], true)
  // Khói tàu bay lên từ ống khói, lặp đi lặp lại.
  ;[0, 1, 2].forEach((i) => {
    const sm = add('smoke', engineX + 0.9, 3.4, { z: railZ + 0.05, mode: 'none', s: 0.7, shadow: false })
    sm.smoke = i / 3
  })
  const ROOF = { from: trainX0 - 2.1, to: engineX + 0.2, y: 3.62, z: railZ + 0.08 }
  scatter([['tree', 79.6, { z: 0.8, s: 0.95 }], ['signal', 81.4, { z: 2.1 }]])

  // Chương 5: sân khấu và vé
  const stageX = 109.6
  add('stageBack', stageX, 0.4, { z: 0.08, mode: 'none', shadow: false, m: { y: 0.4 } })
  add('stageFloor', stageX, 0.32, { z: 1.0, mode: 'none' })
  add('valance', stageX, 6.95, { z: 1.25, mode: 'hang', s: 1.1, m: { y: 6.95 } })
  const choirXs = [-3.1, -2.2, -1.3, 1.3, 2.2, 3.1]
  choirXs.forEach((dx, i) => add('choir', stageX + dx, 0.8, { z: 0.35, s: 1.05, bob: 0.02 + (i % 2) * 0.012, m: {} }))
  ;[-2.0, 2.0].forEach((dx, i) => add('violin', stageX + dx, 0.75, { z: 0.72, flipX: i === 0, bob: 0.025 }))
  const conductor = add('conductor', stageX - 0.1, 0.72, { z: 0.85, s: 1 })
  const arm = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4).translate(0.62, 0, 0), cutMaterial(tex.arm.map))
  arm.position.set(0.42, 1.98, 0.02); arm.renderOrder = 20
  conductor.pivot.add(arm)
  add('curtain', stageX - 4.95, 0.32, { z: 1.15, mode: 'none', s: 0.93 })
  const rc = add('curtain', stageX + 4.95, 0.32, { z: 1.15, mode: 'none', flipX: true, s: 0.93 })
  void rc
  add('musicNote', stageX + 1.1, 5.2, { z: 0.9, mode: 'none', shadow: false, s: 0.7, bob: 0.2 })
  add('musicNote', stageX - 2.4, 4.8, { z: 0.9, mode: 'none', shadow: false, s: 0.55, bob: 0.25 })
  // Cột sáng từ trên giàn đèn, chỉ hiện ban đêm.
  const beams = []
  const beamHost = add('connector', stageX, 6.1, { z: 0.8, mode: 'none', shadow: false, s: 0.01 })
  ;[[-3, 0xfff0c0], [3, 0xffc8d8], [0, 0xbfd8ff]].forEach(([dx, col]) => {
    const beam = createBeam(col, 5.6, 3.6)
    beam.position.set(dx, 0, 0)
    beamHost.pivot.add(beam)
    beams.push(beam)
  })
  ;[stageX - 7.0, stageX + 7.3].forEach((x, i) => add('nutcracker', x, 0, { z: 1.9, s: 1.05, flipX: i === 1 }))
  add('horn', stageX + 6.1, 0.05, { z: 2.4, s: 0.85 })
  add('drum', stageX - 5.9, 0, { z: 2.6, s: 0.95 })
  add('seatCard', 121.4, 2.3, { z: 0.5, stick: true, onTap: () => openSeat(), label: 'Xem sơ đồ khán phòng', m: { x: 120, y: 2.8, s: 1.2 } })
  data.tickets.forEach((_, i) => {
    const x = 127.2 + i * 3.45
    add(`ticket${i}`, x, 2.8 - (i % 2) * 1.0, { z: 0.8, stick: true, onTap: openLink(BUY), label: 'Mở trang đặt vé', m: { y: 3.2 - (i % 2) * 1 } })
  })
  add('ticketHead', 131.2, 6.2, { z: 0.3, mode: 'peel', m: { y: 7.6, x: 129, s: 0.85 } })

  // Chương 6: Sài Gòn
  add('skyline', 146, 0, { z: 0.15, mode: 'none', shadow: false, s: 1.15 })
  add('boat', 143.2, 0.1, { z: 1.6, bob: 0.04, s: 1 })
  add('venueHead', 145.6, 4.3, { z: 0.45, stick: true, s: 0.92, m: { x: 145.6, y: 5.6, s: 1.08 } })
  add('hotel', 151.2, 2.2, { z: 0.6, stick: true, onTap: openLink(MAP), label: 'Mở chỉ đường', m: { x: 153, y: 2.6, s: 1.15 } })
  add('checkin', 157, 2.2, { z: 0.6, stick: true, m: { x: 161, y: 2.6, s: 1.2 } })
  add('directions', 151.2, 0.5, { z: 2.1, onTap: openLink(MAP), label: 'Mở chỉ đường', s: 1, m: { x: 153.6, y: 0.6 } })
  scatter([['palm', 147.9, { z: 1.2, s: 1 }], ['palm', 160.4, { z: 1.3, s: 0.95 }]])

  add('cathedral', 141.6, 0, { z: 0.12, mode: 'none', shadow: true, s: 0.82, m: { x: 141.6, y: 0 } })
  add('lamp', 138.9, 0, { z: 1.1, s: 0.95 })
  add('lamp', 161, 0, { z: 0.5, s: 0.95 })
  add('scooter', 155.8, 0, { z: 2.5, s: 0.95, flipX: false })
  add('cart', 158.6, 0, { z: 2.3, s: 0.72 })
  add('lantern', 139.7, 7.9, { z: 0.6, mode: 'hang', string: true, s: 0.72, bob: 0.05, m: { y: 9.6 } })
  add('lantern', 148, 7.9, { z: 0.6, mode: 'hang', string: true, s: 0.62, bob: 0.05, m: { y: 9.7 } })
  add('lantern', 154.2, 8, { z: 0.6, mode: 'hang', string: true, s: 0.7, bob: 0.05, m: { y: 9.5 } })
  add('moon', 149.4, 6.1, { z: 0.08, mode: 'none', shadow: false, s: 0.72, night: true, m: { x: 144, y: 8 } })
  // Chương 7: hỏi đáp và kết
  add('faqHead', 168, 5.7, { z: 0.35, mode: 'peel', s: 0.94, m: { x: 166, y: 6.2, s: 1.05 } })
  data.faq.forEach((f, i) => {
    add(`faq${i}`, 163.5 + i * 3.7, 2.05 + (i % 2) * 0.22, {
      z: 0.5, mode: 'peel', s: 1.05, onTap: () => openFaq(f), label: 'Xem câu trả lời', m: { y: 2.4 + (i % 2) * 0.3 },
    })
  })
  add('endBanner', 189.6, 2.9, { z: 0.5, stick: true, stickX: -2.2, m: { x: 189.6, y: 4.4, s: 0.96 } })
  const b2 = items[items.length - 1]
  const st3 = new THREE.Mesh(planeTop(0.13, 3.4), cutMaterial(tex.stick.map)); st3.position.set(2.2, 0.55, -0.02); st3.renderOrder = 3; b2.pivot.add(st3)
  add('buy', 187.6, 0.45, { z: 1.7, onTap: openLink(BUY), label: 'Mở trang đặt vé', m: { x: 189.6, y: 2.1, s: 1 } })
  add('info', 191.2, 0.45, { z: 1.7, onTap: () => openInfo(), label: 'Xem thông tin liên hệ', m: { x: 189.6, y: 0.65, s: 1 } })
  add('orchestars', 189.6, 6.4, { z: 0.4, mode: 'peel', s: 0.85, m: { x: 189.6, y: 8.2, s: 0.85 } })
  scatter([['treeSmall', 184, { z: 1.2 }], ['tree', 194.2, { z: 1, s: 1.05 }]])

  add('pencil', 172.5, 0.1, { z: 2.7, s: 1, m: { x: 169, y: -0.6 } })
  add('mug', 178.4, 0, { z: 2.1, s: 0.95 })
  add('clip', 163.5, 5.22, { z: 0.62, mode: 'none', shadow: false, s: 0.5, anchorTop: true })
  add('clip', 174.6, 5.45, { z: 0.62, mode: 'none', shadow: false, s: 0.5, anchorTop: true })
  add('lantern', 195.5, 7.8, { z: 0.6, mode: 'hang', string: true, s: 0.7, bob: 0.05 })

  // Trang trí cả hành trình: dây đèn trên cùng, khóa sol và nốt nhạc đậu đúng khuông, chim, nét vẽ nguệch ngoạc.
  for (let i = 0; i < Math.floor(LOOP / 12); i++) {
    if (Math.abs(i * 12 + 6 - 109.6) < 12) continue
    if (i * 12 + 6 > 48 && i * 12 + 6 < 84) continue
    const g2 = add('garland', i * 12 + 6, 8.16, { z: 0.14, mode: 'none', shadow: false, anchorTop: true, m: { y: 10.3 } })
    void g2
  }
  // Khuông 2.5 đơn vị một lần, dòng đầu tiên ở 0.22 phía trên mỗi bội số trừ độ lệch 0.2.
  ;[[7.6, 5.22], [19.6, 7.72], [41, 5.22], [78, 2.72], [183, 5.22], [182.4, 2.72]].forEach(([x, y], i) => add(i % 2 ? 'wallNotes' : 'clef', x, y - (i % 2 ? 0.98 : 1.56), { z: 0.03, mode: 'none', shadow: false, s: i % 2 ? 0.96 : 1.1 }))
  ;[[8, 3.46], [19.6, 1.02], [29, 6], [45.5, 1.74], [90, 6.5], [125, 1.74], [156, 5.2], [176, 6.48]].forEach(([x, y], i) => add('bird', x, y, { z: 0.08, mode: 'peel', s: 0.72, flipX: i % 2 === 1, bob: 0.015 }))
  ;[[-2.8, 1.2, 'doodleHeart'], [14.5, 2.2, 'doodleStar'], [47.4, 2.2, 'doodleHeart'], [102.6, 5.6, 'doodleStar'], [137, 7, 'doodleHeart'], [181, 4.4, 'doodleStar'], [199, 5, 'doodleHeart']].forEach(([x, y, n]) => add(n, x, y, { z: 0.03, mode: 'none', shadow: false, s: 0.72 }))
  // Tiền cảnh sát người xem, trôi nhanh hơn để tạo chiều sâu. Chỉ ở mép dưới, không che chữ.
  ;[[6, 'fgMound', 1.6], [31, 'fgCandy', 1.3], [58, 'fgMound', 1.5], [74, 'fgCandy', 1.2], [106, 'fgMound', 1.5], [163, 'fgCandy', 1.2], [186, 'fgMound', 1.7]].forEach(([x, n, sc]) => add(n, x, -2.05, { z: 6.4, mode: 'none', shadow: false, s: sc, m: { y: -3.4, s: 0.55 } }))

  // ---------- Rối giấy ----------
  const puppet = new THREE.Group()
  scene.add(puppet)
  const stick = new THREE.Mesh(planeTop(0.13, 4), cutMaterial(tex.stick.map))
  stick.position.set(0, 0.7, -0.02); stick.renderOrder = 60; puppet.add(stick)
  const bodyGeo = planeBottom(1.8 + 0.16, 2.22 + 0.16)
  const bodyChild = new THREE.Mesh(bodyGeo, cutMaterial(tex.child.map)); bodyChild.renderOrder = 63
  const bodyAdult = new THREE.Mesh(bodyGeo, cutMaterial(tex.adult.map)); bodyAdult.renderOrder = 63; bodyAdult.visible = false
  const body = new THREE.Group(); body.add(bodyChild, bodyAdult); puppet.add(body)
  body.position.set(0, 0.52, 0)
  const ride = {}
  const mkRide = (name, o) => {
    const g = new THREE.Group(); g.visible = false; puppet.add(g); ride[name] = g
    if (o.tex) {
      const t = tex[o.tex]
      const m = new THREE.Mesh(planeBottom(t.w, t.h), cutMaterial(t.map)); m.position.set(o.x ?? 0, o.y ?? 0, o.back ? -0.03 : 0.03); m.renderOrder = o.back ? 62 : 65
      if (o.flip) m.scale.x = -1
      g.add(m)
    }
    g.wheels = (o.wheels ?? []).map(([wx, wy, big]) => {
      const t = tex[big ? 'wheelBig' : 'wheelSmall']
      const w = new THREE.Mesh(new THREE.PlaneGeometry(t.w, t.h), cutMaterial(t.map)); w.position.set(wx, wy, 0.05); w.renderOrder = 66
      g.add(w)
      return w
    })
    g.bodyY = o.bodyY ?? 0.5; g.bodyX = o.bodyX ?? 0; g.scaleB = o.scaleB ?? 1
    return g
  }
  mkRide('sled', { tex: 'sled', x: 0.05, y: 0.16, bodyY: 0.68, scaleB: 0.82 })
  mkRide('horse', { tex: 'horse', x: 0.15, y: 0.12, bodyY: 0.9, bodyX: -0.15, scaleB: 0.72, rocking: true })
  mkRide('walk', { bodyY: 0.34, scaleB: 0.9 })
  mkRide('roof', { tex: 'roofSeat', x: 0, y: -0.02, back: true, bodyY: 0.16, scaleB: 0.8 })
  mkRide('cyclo', { tex: 'cyclo', x: 0.1, y: 0.26, back: true, flip: true, bodyY: 0.86, bodyX: -0.78, scaleB: 0.72, wheels: [[0.72, 0.36, 1], [-0.24, 0.36, 1], [-1.25, 0.36, 1]] })
  let rideNow = 'sled'; ride.sled.visible = true
  let climb = 0
  const RIDES = [[0, 'sled'], [14, 'horse'], [39, 'walk'], [138, 'cyclo'], [158, 'sled']]
  const rideAt = (x) => { let n = RIDES[0][1]; for (const [from, name] of RIDES) if (x >= from) n = name; return n }
  const bubble = { y: 0, v: 0 }

  // ---------- Khung nhìn ----------
  const mobileSelection = { photos: 0, albums: 0, tickets: 0, faq: 0 }
  const familyOf = name => /^photo\d+$/.test(name) ? 'photos' : /^wagon\d+$/.test(name) ? 'albums' : /^ticket\d+$/.test(name) ? 'tickets' : /^faq\d+$/.test(name) ? 'faq' : null
  const mobileLayouts = {
    banner: [0, 4.8, .88], dateCard: [0, 2.5, 1.05], buy: [0, .95, .9], hint: [0, -.3, .85],
    note: [21, 6.4, .8], seasonChild: [21, .7, .88], seasonAdult: [21, .7, .88],
    frameHead: [46, 7, .82], storyHead: [90, 7, .92], ticketHead: [127, 7.4, .72],
    venueHead: [146, 7, .87], hotel: [146, 2, .88], faqHead: [168, 7, .88],
  }
  const mobileHidden = new Set(['twoNote', 'seatCard', 'checkin', 'directions', 'photoEmpty', 'star', 'lantern', 'rope', 'bunting'])
  const placeMobile = it => {
    const family = familyOf(it.name)
    if (family === 'photos') return [46, 6.5, 1.1 / it.s]
    if (family === 'albums') return [90, .65, 1.48 / it.s]
    if (family === 'tickets') return [127, 2.3, 1.48 / it.s]
    if (family === 'faq') return [168, 1.9, 1.37 / it.s]
    return mobileLayouts[it.name] || null
  }
  function layout() {
    const w = innerWidth; const h = innerHeight
    const dpr = Math.min(devicePixelRatio, w < 800 ? 1.5 : 1.75)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    const asp = w / h
    camera.aspect = asp
    const baseH = asp < 1 ? 14.6 : 10
    const minW = asp < 0.8 ? 7.4 : asp < 1.2 ? 11.5 : 0
    view.H = Math.max(baseH, minW / asp)
    view.W = view.H * asp
    view.portrait = asp < 1
    view.cx = view.portrait ? 4.4 : view.H * 0.35
    view.dist = (view.H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.updateProjectionMatrix()
    uniforms.uGlowScale.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    if (snow) { snow.material.uniforms.uSize.value = (h / view.H) * 0.24 * dpr; snow.material.uniforms.uSpan.value.set(view.W + 10, view.H + 6, 5) }
    wall.position.y = 18
    for (const it of items) {
      const mobile = view.portrait ? placeMobile(it) : null
      const m = mobile ? {x: mobile[0], y: mobile[1], s: mobile[2]} : view.portrait && it.m ? it.m : null
      it.px = m?.x ?? it.x
      it.py = m?.y ?? it.y
      let sc = (m?.s ?? 1)
      if (view.portrait && mobile) sc = Math.min(sc, (view.W - 1.3) / it.w)
      if (view.portrait && h < 740 && (/^(seasonChild|seasonAdult|hotel)$/.test(it.name) || familyOf(it.name))) { it.py += .85; sc *= .9 }
      it.group.scale.setScalar(sc)
      it.group.position.y = it.py
      if (view.portrait && /^(tree|treeSmall|giftR|giftG|palm|drum|choir|lamp|teddy|candyCane)$/.test(it.name)) {
        const closest = chapters.reduce((best, c) => Math.abs(wrapDelta(c.x - it.px)) < Math.abs(wrapDelta(best.x - it.px)) ? c : best)
        const delta = wrapDelta(it.px - closest.x)
        if (Math.abs(delta) < 3.6) {
          it.px = closest.x + (delta < 0 ? -4 : 4)
          it.group.scale.setScalar(sc * .7)
        }
      }
    }
  }

  // ---------- Điều khiển ----------
  let pos = chapters[0].x
  let target = pos
  let vel = 0
  let tween = null
  let lastInteraction = 0
  const addTarget = (d) => { tween = null; target += d; lastInteraction = performance.now() }

  addEventListener('wheel', (e) => {
    if (document.querySelector('dialog[open]') || e.target.closest?.('.bar,.chapter-controls,.scene-controls')) return
    e.preventDefault()
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1
    const raw = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit
    addTarget(Math.max(-90, Math.min(90, raw)) * 0.0125)
    moved()
  }, { passive: false })

  // Cảm ứng: kéo dọc hoặc ngang đều đi tiếp; thả tay còn trớn.
  let drag = null; let inertia = 0
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, touch: e.pointerType === 'touch', t: performance.now(), origin: pos, chapter: current }
    inertia = 0
    canvas.setPointerCapture?.(e.pointerId)
  })
  canvas.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1
    pointer.y = (e.clientY / innerHeight) * 2 - 1
    pointer.px = e.clientX; pointer.py = e.clientY; pointer.fine = e.pointerType !== 'touch'
    if (!drag) return
    const dx = e.clientX - drag.lx; const dy = e.clientY - drag.ly
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true
    if (drag.touch && drag.moved) {
      const dom = Math.abs(dy) > Math.abs(dx) ? -dy : -dx
      const d = dom * (view.W / innerWidth) * 1.5
      if (view.portrait) {
        const totalX = e.clientX - drag.x, totalY = e.clientY - drag.y
        const total = Math.abs(totalY) > Math.abs(totalX) ? -totalY : -totalX
        tween = null; target = drag.origin + Math.max(-2.5, Math.min(2.5, total * .012))
      } else addTarget(d)
      const now = performance.now()
      inertia = d / Math.max(1, now - drag.t) * 16
      drag.t = now
      moved()
    }
    drag.lx = e.clientX; drag.ly = e.clientY
  })
  const endDrag = (e) => {
    if (!drag) return
    const was = drag
    drag = null
    if (!was.moved) tapAt(e.clientX, e.clientY)
    else if (view.portrait && was.touch) {
      const dx = e.clientX - was.x, dy = e.clientY - was.y
      const distance = Math.abs(dy) > Math.abs(dx) ? -dy : -dx
      inertia = 0; goTo(mod(was.chapter + (Math.abs(distance) > 35 ? Math.sign(distance) : 0), chapters.length))
    } else lastInteraction = performance.now()
  }
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', () => { drag = null })
  canvas.addEventListener('pointerleave', () => { pointer.fine = false; hoverItem(null) })

  addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return
    if (e.target.closest?.('input,textarea,select,button,a')) return
    const step = { ArrowDown: 2.2, ArrowRight: 2.2, ArrowUp: -2.2, ArrowLeft: -2.2 }[e.key]
    if (step) { e.preventDefault(); addTarget(step); moved(); return }
    if (e.key === 'PageDown' || (e.key === ' ' && !e.target.closest?.('button,a'))) { e.preventDefault(); goTo((current + 1) % chapters.length); return }
    if (e.key === 'PageUp') { e.preventDefault(); goTo(mod(current - 1, chapters.length)) }
    if (e.key === 'Home') { e.preventDefault(); goTo(0) }
    if (e.key === 'End') { e.preventDefault(); goTo(chapters.length - 1) }
  })

  function goToX(x) {
    const d = wrapDelta(x - pos)
    if (reduced) { pos += d; target = pos; return }
    tween = { from: pos, to: pos + d, t: 0, dur: view.portrait ? .75 : Math.min(2.2, 0.8 + Math.abs(d) / 34) }
  }
  const goTo = (i) => { inertia = 0; goToX(chapters[i].x); history.replaceState(null, '', `#${chapters[i].id}`) }

  // Lăn lần đầu thì giấu dòng nhắc; dừng ở chương hiện tại bằng dock.
  function moved() { startMoved = true }
  let startMoved = false

  // ---------- Chạm vào vật thể ----------
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  function pick(px, py) {
    ndc.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const list = hits.filter((m) => m.userData.item.group.visible)
    const r = ray.intersectObjects(list, false)
    return r.length ? r[0].object.userData.item : null
  }
  function puppetHit(px, py) {
    ndc.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    return ray.intersectObject(season ? bodyAdult : bodyChild, false).length > 0
  }
  function tapAt(px, py) {
    if (puppetHit(px, py)) { bubble.v = 5.4; return }
    const it = pick(px, py)
    if (it) { kick(it); it.onTap(it) }
  }
  function kick(it) { it.hv = 3.2 }
  const tip = $('#tip')
  let hovered = null
  function hoverItem(it) {
    hovered = it
    canvas.style.cursor = it ? 'pointer' : ''
    if (!it || !it.label) { tip.hidden = true; return }
    tip.hidden = false
    tip.textContent = it.label
  }

  // ---------- Tấm giấy ----------
  const sheet = $('#sheet')
  const sheetBody = $('#sheet-body')
  function openSheet(html, wide) {
    sheetBody.innerHTML = html
    sheet.classList.toggle('sheet--wide', !!wide)
    sheet.showModal()
  }
  document.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close() })
  })
  const openPhoto = (ph) => openSheet(`<h2 id="sheet-title">${ph.caption}</h2><img src="${a}moments/${ph.src}.webp" alt="${ph.caption}, đêm nhạc Christmas 2025" />`, true)
  const openAlbum = (i) => openSheet(`<h2 id="sheet-title" class="sr-title">Những câu chuyện</h2><img src="${a}${data.albums[i].src}.webp" alt="Bìa album OrcheStars" />`)
  const openSeat = () => openSheet(`<h2 id="sheet-title">Sơ đồ khán phòng</h2><img src="${a}seating-map.svg" alt="Sơ đồ khán phòng với các khu First Class, Premium, Eco và Standing" /><p>Giá niêm yết cho một vé. Sơ đồ để tham khảo vị trí các khu vực; tình trạng ghế được cập nhật tại trang đặt vé.</p><p><a href="${BUY}" target="_blank" rel="noopener">Mua vé</a></p>`, true)
  const openFaq = (f) => openSheet(`<h2 id="sheet-title">${f.q}</h2><p>${f.a}</p><p>Cần thêm hỗ trợ? <a href="tel:+84906502925">0906 502 925</a></p><p><a href="${BUY}" target="_blank" rel="noopener">Xem đầy đủ thông tin và điều khoản sự kiện</a></p>`)
  const openInfo = () => openSheet(`<h2 id="sheet-title">Thông tin liên hệ</h2><p>Công ty Cổ phần Orchestars, 675-677 Đường Điện Biên Phủ, Phường 25, Quận Bình Thạnh, TP.HCM.</p><p>Giấy chứng nhận đăng ký doanh nghiệp số 0318788336, cấp lần đầu ngày 23.12.2024 bởi Sở Kế Hoạch và Đầu Tư TP. Hồ Chí Minh.</p><ul><li><a href="tel:+84906502925">0906 502 925</a></li><li><a href="mailto:info@orchestars.vn">info@orchestars.vn</a></li><li><a href="https://www.orchestars.vn/terms-policies" target="_blank" rel="noopener">Điều khoản và Chính sách</a></li><li><a href="https://www.facebook.com/ochchildrenschoir" target="_blank" rel="noopener">Facebook</a></li><li><a href="https://www.instagram.com/orchestars.vn/" target="_blank" rel="noopener">Instagram</a></li><li><a href="https://www.tiktok.com/@orchestars" target="_blank" rel="noopener">TikTok</a></li><li><a href="https://www.youtube.com/@orchestars_vn" target="_blank" rel="noopener">YouTube</a></li></ul><p>© 2025 Công ty Cổ phần Orchestars. All rights reserved.</p>`)

  // ---------- Mùa ----------
  let season = 0
  const music = createMusic()
  window.addEventListener('scene-lost', () => music.dispose(), {once:true})
  window.addEventListener('pagehide', event => { if (!event.persisted) music.dispose() })
  let wipe = null
  let storyTimer = 0
  const story = $('#season-story')
  function tellSeason(next) {
    clearTimeout(storyTimer)
    story.querySelector('strong').textContent = next ? 'Ngày bé, mong một món quà.' : 'Có những điều chưa từng đổi thay.'
    story.querySelector('p').textContent = next ? 'Lớn lên, mong được bên nhau.' : 'Giáng Sinh vẫn bắt đầu bằng một điều ước.'
    story.classList.remove('is-visible'); void story.offsetWidth; story.classList.add('is-visible')
    storyTimer = setTimeout(() => story.classList.remove('is-visible'), reduced ? 4500 : 5200)
  }
  const seasonLabels = () => {
    ;['#season-btn', '#season-btn-2'].forEach((q) => $(q).setAttribute('aria-checked', String(!!season)))
  }
  function setSeason(next, cx, cy) {
    if (next === season) return
    if (wipe) finishWipe()
    season = next
    const dpr = renderer.getPixelRatio()
    const px = cx ?? innerWidth / 2
    const py = cy ?? innerHeight / 2
    uniforms.uWipeC.value.set(px * dpr, (innerHeight - py) * dpr)
    uniforms.uTo.value = next
    uniforms.uWipeR.value = 0
    const maxR = Math.hypot(innerWidth, innerHeight) * dpr * 1.1
    wipe = reduced ? null : { t: 0, maxR }
    if (reduced) finishWipe()
    root.classList.toggle('night', !!next)
    bodyChild.visible = true; bodyAdult.visible = true
    if (reduced) { bodyChild.visible = !next; bodyAdult.visible = !!next }
    tellSeason(next)
    bubble.v = 4.2
    renderer.setClearColor(next ? 0x131b42 : 0xf6f5ed)
    seasonLabels()
    music.setSeason(next ? 'adult' : 'child')
    updateSceneControls()
  }
  function finishWipe() {
    uniforms.uFrom.value = uniforms.uTo.value; uniforms.uWipeR.value = 0; wipe = null
    bodyChild.visible = !season; bodyAdult.visible = !!season
    bodyChild.material.uniforms.uOpacity.value = 1; bodyAdult.material.uniforms.uOpacity.value = 1
  }
  $('#season-btn').addEventListener('click', (e) => setSeason(season ? 0 : 1, e.clientX || undefined, e.clientY || undefined))
  $('#season-btn-2').addEventListener('click', () => setSeason(season ? 0 : 1))
  const toggleMusic = async () => {
    const on = await music.toggle()
    ;['#music-btn', '#music-btn-2'].forEach((q) => {
      const b = $(q)
      const text = on ? 'Tắt hộp nhạc' : 'Bật hộp nhạc'
      b.querySelector('.chip__text').textContent = text
      b.setAttribute('aria-label', text)
      b.setAttribute('aria-pressed', String(on))
    })
  }
  $('#music-btn').addEventListener('click', toggleMusic)
  $('#music-btn-2').addEventListener('click', toggleMusic)

  // ---------- Khuông nhạc chuyển chương và mục lục ----------
  const dock = $('#dock')
  const dockYs = [8, 0, -8, 4, -4, 8, 0]
  chapters.forEach((c, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('aria-label', `Đến chương ${c.label}`)
    b.style.setProperty('--ny', `${dockYs[i]}px`)
    b.innerHTML = `<span class="dock__label">${c.label}</span>`
    b.addEventListener('click', () => goTo(i))
    dock.append(b)
  })
  const menu = $('#menu')
  const menuBtn = $('#menu-btn')
  chapters.forEach((c, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = c.label
    b.addEventListener('click', () => { menu.close(); goTo(i) })
    $('#menu-list').append(b)
  })
  const infoBtn = document.createElement('button')
  infoBtn.type = 'button'; infoBtn.textContent = 'Thông tin liên hệ'
  infoBtn.addEventListener('click', () => { menu.close(); openInfo() })
  $('#menu-list').append(infoBtn)
  menuBtn.addEventListener('click', () => { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true') })
  menu.addEventListener('close', () => menuBtn.setAttribute('aria-expanded', 'false'))
  $('.bar__name').addEventListener('click', (e) => { e.preventDefault(); goTo(0) })
  // Lớp chữ chỉ để đọc; đường đi bằng phím nằm ở thanh công cụ, các nút vật thể và khuông nhạc.
  document.querySelectorAll('.doc a').forEach((l) => l.setAttribute('tabindex', '-1'))
  // Bàn phím và trình đọc màn hình: mỗi vật chạm được có một nút thật, focus tới đâu camera đi tới đó.
  const sayOf = (it) => {
    const n = it.name
    const idx = Number(n.replace(/\D/g, ''))
    if (n.startsWith('photo') && n !== 'photoEmpty') return `Xem ảnh: ${data.photos[idx].caption}`
    if (n === 'photoEmpty') return 'Khung hình tiếp theo có bạn. Mua vé'
    if (n.startsWith('ticket') && data.tickets[idx]) return `Mua vé ${data.tickets[idx].name}, ${data.tickets[idx].price}`
    if (n.startsWith('faq')) return data.faq[idx].q
    if (n.startsWith('wagon')) return `Xem bìa album ${idx + 1}`
    return it.label
  }
  const hot = $('#hot')
  items.filter((it) => it.onTap).sort((p, q) => mod(p.x, LOOP) - mod(q.x, LOOP)).forEach((it) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = sayOf(it)
    b.addEventListener('focus', () => { const family = familyOf(it.name); if (view.portrait && family) { mobileSelection[family] = Number(it.name.replace(/\D/g, '')); updateSceneControls(); layout() } hovered = it; goToX(it.px ?? it.x) })
    b.addEventListener('blur', () => { if (hovered === it) hovered = null })
    b.addEventListener('click', () => { kick(it); it.onTap(it) })
    hot.append(b)
  })

  const sceneControls = $('#scene-controls')
  const chapterTitle = $('#chapter-title')
  $('#chapter-prev').addEventListener('click', () => goTo(mod(current - 1, chapters.length)))
  $('#chapter-next').addEventListener('click', () => goTo(mod(current + 1, chapters.length)))
  const activeFamily = () => ({2:'photos',3:'albums',4:'tickets',6:'faq'}[current])
  function updateSceneControls() {
    sceneControls.replaceChildren()
    const family = activeFamily()
    if (family) {
      const list = data[family], index = mobileSelection[family]
      const desired = family === 'photos' ? `photo${index}` : family === 'albums' ? `album${index}` : null
      if (desired) pendingImages.sort((a, b) => Number(b[0] === desired) - Number(a[0] === desired))
      const prev = document.createElement('button'), next = document.createElement('button'), label = document.createElement('span')
      prev.type = next.type = 'button'; prev.textContent = '‹'; next.textContent = '›'
      prev.setAttribute('aria-label', 'Mục trước'); next.setAttribute('aria-label', 'Mục tiếp theo')
      label.textContent = `${index + 1} / ${list.length}`; label.setAttribute('aria-live','polite')
      const change = direction => { mobileSelection[family] = mod(index + direction, list.length); updateSceneControls(); layout(); sceneControls.querySelectorAll('button')[direction > 0 ? 1 : 0].focus({preventScroll:true}) }
      prev.addEventListener('click', () => change(-1)); next.addEventListener('click', () => change(1))
      sceneControls.append(prev, label, next)
    }
    const action = document.createElement('button'); action.type = 'button'; action.className = 'scene-controls__action'
    if (current === 1) { action.textContent = season ? 'Về mùa thơ bé' : 'Bước sang mùa trưởng thành'; action.addEventListener('click', () => setSeason(season ? 0 : 1)) }
    else if (current === 2) { action.textContent = 'Xem ảnh lớn'; action.addEventListener('click', () => openPhoto(data.photos[mobileSelection.photos])) }
    else if (current === 3) { action.textContent = 'Xem album'; action.addEventListener('click', () => openAlbum(mobileSelection.albums)) }
    else if (current === 4) { action.textContent = 'Sơ đồ khán phòng'; action.addEventListener('click', openSeat) }
    else if (current === 5) { action.textContent = 'Giờ check-in'; action.addEventListener('click', () => openSheet(`<h2 id="sheet-title">Giờ check-in</h2><p>${data.faq[2].a}</p><p><a href="${MAP}" target="_blank" rel="noopener">Mở chỉ đường</a></p>`)) }
    else if (current === 6) { action.textContent = 'Xem câu trả lời'; action.addEventListener('click', () => openFaq(data.faq[mobileSelection.faq])) }
    if (action.textContent) sceneControls.append(action)
    sceneControls.hidden = !sceneControls.children.length
  }

  let current = -1
  function chapterAt(x) {
    const v = mod(x, LOOP)
    let best = chapters.length - 1
    chapters.forEach((c, i) => { if (v >= c.from) best = i })
    return v < chapters[0].to ? 0 : best
  }

  // ---------- Vòng vẽ ----------
  const pointer = { x: 0, y: 0, px: 0, py: 0, fine: false }
  const camS = { x: 0, y: 0 }
  let last = performance.now()
  let intro = 0
  let wheelAngle = 0
  layout()
  addEventListener('resize', layout)

  function frame(now) {
    if (document.hidden) { last = now; requestAnimationFrame(frame); return }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const time = now / 1000
    uniforms.uTime.value = reduced ? 0 : time
    intro += dt

    // Vị trí camera trên hành trình
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur)
      target = tween.from + (tween.to - tween.from) * smooth(tween.t)
      if (tween.t >= 1) tween = null
    }
    if (inertia && !drag) { target += inertia; inertia *= Math.pow(0.05, dt); if (Math.abs(inertia) < 0.002) inertia = 0 }
    // Let a mobile swipe settle on a readable chapter, with no endless half-cards.
    if (view.portrait && lastInteraction && now - lastInteraction > 350 && !drag && !tween && Math.abs(inertia) < .06) {
      const nearest = chapters.reduce((best, c) => Math.abs(wrapDelta(c.x - target)) < Math.abs(wrapDelta(best.x - target)) ? c : best)
      if (Math.abs(wrapDelta(nearest.x - target)) < 7) { goToX(nearest.x); inertia = 0 }
      lastInteraction = 0
    }
    const prev = pos
    pos += (target - pos) * (reduced ? 1 : 1 - Math.pow(0.0012, dt))
    vel = pos - prev
    if (pos >= LOOP) { pos -= LOOP; target -= LOOP; if (tween) { tween.from -= LOOP; tween.to -= LOOP } }
    if (pos < 0) { pos += LOOP; target += LOOP; if (tween) { tween.from += LOOP; tween.to += LOOP } }

    camS.x += (pointer.x - camS.x) * Math.min(1, dt * 3)
    camS.y += (pointer.y - camS.y) * Math.min(1, dt * 3)
    const parX = pointer.fine && !reduced ? camS.x * 0.35 : 0
    const parY = pointer.fine && !reduced ? camS.y * 0.16 : 0
    const camX = pos
    camera.position.set(camX + parX, view.cx + 1.25 - parY, view.dist + 1.2)
    camera.lookAt(camX + parX * 0.25, view.cx, 0)
    wall.position.x = camX; floor.position.x = camX
    if (snow) snow.material.uniforms.uCam.value.set(camX, 0, 0)

    // Vật thể: đặt theo vòng lặp, bật dậy khi tới gần
    const half = view.W / 2 + 3
    for (const it of items) {
      const dx = wrapDelta((it.px ?? it.x) - camX)
      const ax = camX + dx
      const near = Math.abs(dx) < half + 6
      const family = familyOf(it.name)
      const index = Number(it.name.replace(/\D/g, ''))
      const mobileOmit = view.portrait && (mobileHidden.has(it.name) || (family && mobileSelection[family] !== index) || (it.name === 'seasonChild' && season) || (it.name === 'seasonAdult' && !season))
      it.group.visible = near && !mobileOmit
      if (!near || mobileOmit) { if (it.mode !== 'none' && !reduced) { it.sp = 0; it.v = 0 } continue }
      it.group.position.x = ax
      const want = Math.abs(dx) < half - 0.6 && intro > 0.15 + Math.max(0, dx + 6) * 0.05 ? 1 : 0
      if (reduced) it.sp = 1
      else {
        it.v += ((want - it.sp) * 75 - it.v * 11) * dt
        it.sp += it.v * dt
      }
      const s = it.sp
      it.hv += ((0 - it.hover) * 90 - it.hv * 9) * dt
      it.hover += it.hv * dt
      const lift = it === hovered ? 1 : 0
      it.lift = (it.lift ?? 0) + (lift - (it.lift ?? 0)) * Math.min(1, dt * 12)
      const p = it.pivot
      const bobY = reduced ? 0 : it.bob * Math.sin(time * 1.8 + it.phase)
      p.position.y = bobY + it.lift * 0.07
      p.rotation.set(0, 0, it.hover * 0.14 - (it.lift * 0.018))
      if (it.mode === 'up') p.rotation.x = (1 - s) * 1.48
      else if (it.mode === 'peel' || it.mode === 'peelTop') { p.rotation.y = (1 - s) * 1.45; if (it.tilt) p.rotation.z += it.tilt }
      else if (it.mode === 'hang') {
        p.position.y += (1 - s) * 7
        p.rotation.z += reduced ? 0 : Math.sin(time * 0.9 + it.phase) * 0.018 + (it.swing ? vel * 0.4 : 0)
      }
      it.mesh.material.uniforms.uLift.value = it.lift
      if (it.smoke !== undefined) {
        const t = reduced ? it.smoke : (time * 0.28 + it.smoke) % 1
        p.position.set(-t * 2.4, t * 2.8, 0)
        const sc = 0.4 + t * 1.2
        it.mesh.scale.set(sc, sc, 1)
        it.mesh.material.uniforms.uOpacity.value = Math.sin(Math.PI * t) * 0.95
      }
    }
    arm.rotation.z = reduced ? 0.2 : 0.25 + Math.sin(time * 3.4) * 0.42

    // Rối giấy
    const pxOff = view.portrait ? -view.W * 0.3 : -view.W * 0.3
    puppet.position.set(camX + pxOff + (reduced ? 0 : Math.sin(time * 0.6) * 0.05), 0, 3)
    puppet.scale.setScalar(view.portrait ? 0.8 : 0.92)
    const c = chapterAt(camX)
    if (c !== current) {
      current = c
      chapterTitle.textContent = chapters[c].label
      $('#chapter-count').textContent = `${c + 1} / ${chapters.length}`
      updateSceneControls()
      ;[...dock.children].forEach((b, i) => b.setAttribute('aria-current', String(i === c)))
    }
    const puppetX = mod(puppet.position.x, LOOP)
    const onTrain = puppetX > ROOF.from && puppetX < ROOF.to
    const nextRide = onTrain ? 'roof' : rideAt(puppetX)
    if (nextRide !== rideNow) {
      ride[rideNow].visible = false
      ride[nextRide].visible = true
      rideNow = nextRide
      if (!onTrain) bubble.v = Math.max(bubble.v, 3.6)
    }
    climb += ((onTrain ? 1 : 0) - climb) * (reduced ? 1 : Math.min(1, dt * 7))
    const r = ride[rideNow]
    const speed = Math.abs(vel)
    bubble.v -= 15 * dt
    bubble.y = Math.max(0, bubble.y + bubble.v * dt)
    if (bubble.y === 0) bubble.v = Math.max(0, bubble.v)
    const walkHop = rideNow === 'walk' ? Math.abs(Math.sin(pos * 3.2)) * Math.min(0.32, speed * 5 + 0.0) : 0
    const idle = reduced ? 0 : Math.sin(time * 2.1) * 0.035
    body.position.set(r.bodyX, r.bodyY + idle + walkHop, 0)
    body.scale.setScalar(r.scaleB)
    stick.position.set(r.bodyX, r.bodyY + 0.2 + idle + walkHop, -0.02)
    const lean = Math.max(-0.2, Math.min(0.2, -vel * 1.5))
    puppet.position.y = bubble.y + climb * (view.portrait ? 5.6 : ROOF.y)
    puppet.position.z = 3 + (ROOF.z - 3) * climb
    stick.visible = rideNow !== 'roof'
    puppet.rotation.z = lean * (rideNow === 'walk' ? 0.8 : 0.5) + (reduced ? 0 : (rideNow === 'horse' ? Math.sin(pos * 2.2 + time * 2) * 0.06 : Math.sin(time * 1.5) * 0.012))
    wheelAngle -= vel * 1.9
    for (const w of r.wheels) w.rotation.z = wheelAngle
    for (const w of spinners) w.rotation.z = wheelAngle * 1.3
    r.position.y = reduced ? 0 : (rideNow === 'cyclo' ? Math.abs(Math.sin(pos * 4)) * 0.03 : 0)

    // Mùa
    if (wipe) {
      wipe.t += dt / 2.2
      const blend = smooth(Math.min(1, wipe.t))
      bodyChild.material.uniforms.uOpacity.value = season ? 1 - blend : blend
      bodyAdult.material.uniforms.uOpacity.value = season ? blend : 1 - blend
      uniforms.uWipeR.value = wipe.maxR * Math.pow(Math.min(1, wipe.t), 1.6)
      if (wipe.t >= 1) finishWipe()
    }

    // Trỏ chuột
    if (pointer.fine && !drag) {
      const it = pick(pointer.px, pointer.py)
      const ph = !it && puppetHit(pointer.px, pointer.py)
      if (it !== hovered) hoverItem(it)
      if (ph) canvas.style.cursor = 'pointer'
      if (it?.label) tip.style.transform = `translate(${Math.min(innerWidth - 190, pointer.px + 16)}px, ${pointer.py + 18}px)`
    }

    const glowOn = uniforms.uFrom.value > 0 || uniforms.uTo.value > 0
    for (const g of glows) g.visible = glowOn
    for (const g of beams) g.visible = glowOn
    beams.forEach((g, i) => { g.rotation.z = (i === 0 ? -0.34 : i === 1 ? 0.34 : 0) + (reduced ? 0 : Math.sin(time * 0.7 + i * 2) * 0.24) })
    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }

  seasonLabels()
  setLoad(1)
  // Compile only the opening frame; offscreen props compile when visited.
  items.forEach(it => { it.group.visible = Math.abs(wrapDelta((it.px ?? it.x) - pos)) < view.W / 2 + 9 })
  renderer.compile(scene, camera)
  requestAnimationFrame((t) => { last = t; frame(t) })
  $('#loader').classList.add('is-done')
  setTimeout(() => $('#loader')?.remove(), 500)
  root.dataset.ready = 'true'
  performance.mark('scene-ready')
  setTimeout(() => { hydrateImages(); hydrateImages() }, 550)
  const entry = chapters.findIndex(c => `#${c.id}` === location.hash)
  if (entry > 0) goTo(entry)
  void startMoved
  // Điểm vào cho kiểm thử tự động, chỉ có khi chạy dev.
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('qa')) window.__ttc = { goTo, setSeason, jump(x) { tween = null; target = x; pos = x }, get pos() { return pos }, get season() { return season }, get hydrated() { return hydrated.size }, get metrics() { return {calls:renderer.info.render.calls,textures:renderer.info.memory.textures} }, get mobileSelection() { return {...mobileSelection} } }
}
