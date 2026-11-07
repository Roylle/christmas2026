const kSafe = ctx => Math.max(.1, Math.hypot(ctx.getTransform().a, ctx.getTransform().b))
// Mọi hình vẽ của trang: vẽ tay bằng rough.js lên canvas, cắt viền giấy trắng, tạo sẵn bóng mờ.
// Tọa độ vẽ dùng đơn vị 100 = 1 đơn vị thế giới.
import rough from 'roughjs'
import { decorProps } from './decor.js'

export const INK = '#23252f'
export const C = {
  red: '#c9202c', deep: '#8e1219', pine: '#2c7a55', leaf: '#4aa36f', gold: '#f0b93a', warm: '#ffd76a',
  sky: '#8fb7e6', navy: '#25336f', wood: '#d98a3d', tan: '#e6bd86', paper: '#fffdf6', snow: '#f4f7fb',
  pink: '#f2a7a7', blue: '#3d6fb5', grey: '#8d93a3', skin: '#fbd9bd', brown: '#8a5a33', river: '#6fb3d6',
}

const hash = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 99991; return h + 1 }

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

function pen(canvas, ctx, name) {
  const rc = rough.canvas(canvas)
  let seed = hash(name)
  const base = () => ({ seed: seed++, roughness: 1.1, bowing: 1.2, stroke: INK, strokeWidth: 2.4 })
  const d = {
    ctx,
    // Một mảng tô sáp màu: nền đặc, nét sáp đậm hơn đè lên, rồi viền bút chì.
    shape(path, color, o = {}) {
      const p = new Path2D(path)
      if (color) {
        ctx.fillStyle = color
        ctx.fill(p)
        if (o.hatch !== false) {
          rc.path(path, { ...base(), stroke: 'none', fill: shade(color, o.dark ?? 0.84), fillStyle: 'hachure', hachureGap: o.gap ?? 7, fillWeight: o.weight ?? 2.2, hachureAngle: o.angle ?? -48 })
        }
      }
      if (o.stroke !== false) rc.path(path, { ...base(), strokeWidth: o.sw ?? 2.4, stroke: o.ink ?? INK })
    },
    box(x, y, w, h, color, o) { d.shape(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, color, o) },
    round(x, y, w, h, r, color, o) { d.shape(`M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`, color, o) },
    oval(cx, cy, rx, ry, color, o) { d.shape(`M${cx - rx} ${cy} C${cx - rx} ${cy - ry * 1.33} ${cx + rx} ${cy - ry * 1.33} ${cx + rx} ${cy} C${cx + rx} ${cy + ry * 1.33} ${cx - rx} ${cy + ry * 1.33} ${cx - rx} ${cy} Z`, color, o) },
    line(x1, y1, x2, y2, o = {}) { rc.line(x1, y1, x2, y2, { ...base(), stroke: o.ink ?? INK, strokeWidth: o.sw ?? 2.4 }) },
    curve(path, o = {}) { rc.path(path, { ...base(), stroke: o.ink ?? INK, strokeWidth: o.sw ?? 2.4 }) },
    dot(x, y, r = 3, color = INK) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill() },
    // Chữ viết tay, tự xuống dòng; mỗi từ hơi lệch như viết thật.
    text(str, x, y, o = {}) {
      let size = o.size ?? 30
      const available = o.w || (o.align === 'center' ? Math.max(40, x * 2 - 32) : o.align === 'right' ? x - 16 : canvas.width / kSafe(ctx) - x - 16)
      if (!o.w) {
        ctx.font = `${o.weight ?? 600} ${size}px Mali, sans-serif`
        const measured = ctx.measureText(String(str)).width
        if (measured > available) size *= available / measured
      }
      ctx.font = `${o.weight ?? 600} ${size}px Mali, sans-serif`
      ctx.fillStyle = o.color ?? INK
      ctx.textBaseline = 'alphabetic'
      const lh = size * (o.lh ?? 1.32)
      const lines = []
      for (const para of String(str).split('\n')) {
        let cur = ''
        for (const word of para.split(' ')) {
          const test = cur ? `${cur} ${word}` : word
          if (o.w && ctx.measureText(test).width > o.w && cur) { lines.push(cur); cur = word } else cur = test
        }
        lines.push(cur)
      }
      let wobble = hash(str)
      lines.forEach((l, i) => {
        const total = ctx.measureText(l).width
        let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x
        for (const word of l.split(' ')) {
          wobble = (wobble * 73 + 11) % 997
          const a = ((wobble % 7) - 3) * 0.0035
          const dy = ((wobble % 5) - 2) * size * 0.012
          ctx.save()
          ctx.translate(cx, y + i * lh + dy)
          ctx.rotate(a)
          ctx.fillText(word, 0, 0)
          ctx.restore()
          cx += ctx.measureText(`${word} `).width
        }
      })
      return lines.length * lh
    },
    tape(x, y, w, a, color = 'rgba(240,200,110,.72)') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = color; ctx.fillRect(-w / 2, -12, w, 24); ctx.restore()
    },
    image(img, x, y, w, h) {
      const s = Math.max(w / img.width, h / img.height)
      const sw = w / s; const sh = h / s
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
    },
  }
  return d
}

// ---------- Nhân vật và phương tiện ----------

function childBody(d) {
  // Em bé mũ len đỏ, khăn xanh. Tâm x=90.
  d.line(68, 168, 62, 214, { sw: 7 }); d.line(112, 168, 118, 214, { sw: 7 })
  d.shape('M52 118 C52 96 128 96 128 118 L136 176 C110 186 70 186 44 176 Z', C.blue)
  d.line(90, 112, 90, 178, { sw: 1.6 }); d.dot(98, 136); d.dot(98, 156)
  d.curve('M126 124 C142 118 150 106 156 92', { sw: 7 }); d.oval(157, 88, 7, 7, C.skin)
  d.line(158, 90, 174, 60, { sw: 2.2 })
  d.curve('M54 124 C40 134 36 148 38 158', { sw: 7 })
  d.oval(90, 66, 44, 40, C.skin, { hatch: false })
  d.dot(74, 66, 4); d.dot(106, 66, 4)
  d.curve('M80 84 C86 90 96 90 102 84', { sw: 2.2 })
  d.oval(62, 80, 8, 5, C.pink, { stroke: false, hatch: false }); d.oval(118, 80, 8, 5, C.pink, { stroke: false, hatch: false })
  d.shape('M46 56 C44 8 136 8 134 56 C110 44 70 44 46 56 Z', C.red)
  d.round(42, 48, 96, 15, 7, C.paper)
  d.oval(90, 12, 13, 12, C.paper)
  d.shape('M50 100 C70 112 110 112 130 100 L132 116 C108 126 72 126 48 116 Z', C.pine)
  d.shape('M108 116 L128 116 L132 156 L112 152 Z', C.pine)
}

function adultBody(d) {
  // Em bé đã lớn: cùng chiếc khăn xanh, áo khoác dài, cầm hộp quà.
  d.line(72, 176, 66, 216, { sw: 7 }); d.line(108, 176, 114, 216, { sw: 7 })
  d.shape('M56 82 C60 66 120 66 124 82 L136 186 C110 194 70 194 44 186 Z', '#3a4358')
  d.line(90, 80, 90, 190, { sw: 1.6 }); d.dot(100, 118); d.dot(100, 148)
  d.curve('M122 92 C140 104 146 118 146 132', { sw: 8 })
  d.curve('M58 92 C42 104 38 118 42 134', { sw: 8 })
  d.box(26, 126, 34, 30, C.red); d.line(43, 126, 43, 156, { ink: C.warm, sw: 4 }); d.line(26, 141, 60, 141, { ink: C.warm, sw: 4 })
  d.oval(90, 38, 30, 32, C.skin, { hatch: false })
  d.shape('M58 38 C50 -2 130 -6 122 36 C112 22 92 20 78 24 C68 26 62 30 58 38 Z', C.brown)
  d.dot(79, 42, 3.5); d.dot(101, 42, 3.5)
  d.curve('M82 56 C86 60 94 60 98 56', { sw: 2.2 })
  d.shape('M58 68 C74 78 106 78 122 68 L126 84 C106 94 74 94 54 84 Z', C.pine)
  d.shape('M104 84 L122 84 L128 128 L108 124 Z', C.pine)
}

function wheel(d, size) {
  const c = size / 2
  d.oval(c, c, c - 3, c - 3, null, { sw: 4 })
  d.oval(c, c, c - 10, c - 10, null, { sw: 1.5 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    d.line(c, c, c + Math.cos(a) * (c - 9), c + Math.sin(a) * (c - 9), { sw: 1.5 })
  }
  d.oval(c, c, 7, 7, C.gold, { hatch: false })
}

function cyclo(d) {
  // Xích lô Sài Gòn: ghế khách phía trước, người lái phía sau.
  d.shape('M44 54 C52 8 166 8 174 54 L178 62 L40 62 Z', C.red)
  d.line(52, 62, 62, 128, { sw: 3 }); d.line(166, 62, 156, 128, { sw: 3 })
  d.shape('M44 128 L174 128 L164 168 L66 168 Z', C.gold)
  d.round(60, 92, 96, 40, 8, C.red)
  d.line(164, 168, 270, 190, { sw: 6 }); d.line(66, 168, 58, 190, { sw: 5 })
  d.line(270, 190, 262, 110, { sw: 5 }); d.line(262, 110, 240, 104, { sw: 5 })
  d.line(180, 180, 216, 196, { sw: 5 }); d.oval(218, 198, 10, 10, null, { sw: 3 })
}

const LOGO_BANNER = (imgs) => (d) => {
  d.shape('M12 18 L708 8 L716 322 L8 330 Z', C.red, { dark: 0.88, gap: 10 })
  d.ctx.drawImage(imgs.logo, 86, 28, 548, 548 * (515 / 1627))
  d.text('Giáng Sinh bên nhau.', 360, 262, { size: 46, align: 'center', color: C.paper, weight: 700 })
}

// ---------- Danh sách đạo cụ ----------

export function buildProps(imgs, data) {
  const P = {
    child: { w: 180, h: 222, draw: childBody },
    adult: { w: 180, h: 222, draw: adultBody },
    wheelBig: { w: 76, h: 76, draw: (d) => wheel(d, 76) },
    wheelSmall: { w: 50, h: 50, draw: (d) => wheel(d, 50) },
    sled: { w: 240, h: 96, draw: (d) => {
      d.curve('M8 30 C14 84 40 88 70 88 L216 88 C232 88 236 74 232 64', { sw: 7, ink: C.brown })
      d.line(62, 54, 62, 86, { sw: 5 }); d.line(176, 54, 176, 86, { sw: 5 })
      d.shape('M26 12 L216 12 L200 56 L44 56 Z', C.red)
      d.line(30, 34, 208, 34, { ink: C.warm, sw: 4 })
    } },
    horse: { w: 240, h: 170, draw: (d) => {
      d.curve('M22 136 C70 172 170 172 222 136', { sw: 8, ink: C.brown })
      d.line(76, 96, 66, 152, { sw: 8, ink: C.brown }); d.line(166, 96, 176, 152, { sw: 8, ink: C.brown })
      d.shape('M54 70 C70 56 150 58 176 62 C184 44 186 28 194 14 C214 12 232 26 234 42 L206 50 C206 76 196 102 170 106 L72 106 C52 102 46 84 54 70 Z', C.tan)
      d.shape('M186 8 C172 22 168 42 168 60 L184 48 C190 34 196 22 200 12 Z', C.red)
      d.dot(212, 30, 3.5)
      d.shape('M54 72 C36 78 28 96 30 114 C42 106 50 96 58 86 Z', C.red)
      d.box(92, 56, 56, 16, C.pine)
    } },
    cyclo: { w: 290, h: 210, draw: cyclo },
    camera: { w: 130, h: 200, draw: (d) => {
      d.line(62, 86, 24, 196, { sw: 4 }); d.line(66, 86, 66, 198, { sw: 4 }); d.line(70, 86, 110, 196, { sw: 4 })
      d.round(12, 22, 106, 66, 8, C.grey); d.box(40, 8, 34, 16, C.grey)
      d.oval(65, 54, 24, 24, INK, { hatch: false }); d.oval(65, 54, 11, 11, C.sky, { hatch: false })
    } },
    tree: { w: 240, h: 330, sway: 1, draw: (d) => {
      d.box(102, 278, 36, 48, C.brown)
      d.shape('M120 8 L180 110 L150 106 L210 200 L170 196 L232 288 L8 288 L70 196 L30 200 L90 106 L60 110 Z', C.pine, { gap: 9 })
      d.curve('M84 122 C110 142 140 140 164 122', { ink: C.paper, sw: 3 }); d.curve('M58 214 C100 244 150 240 192 212', { ink: C.paper, sw: 3 })
      for (const [x, y, c] of [[100, 100, C.red], [150, 160, C.gold], [90, 176, C.sky], [66, 262, C.red], [124, 240, C.gold], [186, 262, C.paper]]) d.oval(x, y, 9, 9, c, { hatch: false })
      d.shape('M120 -2 L126 14 L142 14 L129 24 L134 40 L120 30 L106 40 L111 24 L98 14 L114 14 Z', C.gold, { hatch: false })
    } },
    treeSmall: { w: 150, h: 210, sway: 1, draw: (d) => {
      d.box(64, 176, 22, 30, C.brown)
      d.shape('M75 6 L112 76 L92 74 L140 180 L10 180 L58 74 L38 76 Z', C.leaf, { gap: 8 })
      d.curve('M50 130 C70 146 90 146 108 128', { ink: C.paper, sw: 3 })
    } },
    snowman: { w: 180, h: 240, draw: (d) => {
      d.oval(90, 170, 66, 62, C.snow); d.oval(90, 76, 46, 44, C.snow)
      d.dot(74, 66, 4); d.dot(106, 66, 4)
      d.shape('M90 76 L128 84 L90 90 Z', '#f0883a', { hatch: false })
      d.shape('M54 40 L126 40 L120 32 L112 2 L68 2 L60 32 Z', INK, { hatch: false })
      d.shape('M48 110 C70 122 110 122 132 110 L134 126 C110 136 70 136 46 126 Z', C.red)
      d.dot(90, 150); d.dot(90, 178); d.dot(90, 206)
      d.curve('M38 150 C22 136 12 122 6 104', { ink: C.brown, sw: 4 }); d.curve('M142 150 C158 136 168 122 174 104', { ink: C.brown, sw: 4 })
    } },
    giftR: { w: 120, h: 112, draw: (d) => { d.box(10, 32, 100, 76, C.red); d.box(48, 32, 24, 76, C.warm, { hatch: false }); d.curve('M60 32 C32 2 16 18 60 32 C88 2 104 18 60 32', { sw: 3 }) } },
    giftG: { w: 94, h: 90, draw: (d) => { d.box(8, 26, 78, 60, C.leaf); d.box(38, 26, 18, 60, C.paper, { hatch: false }); d.curve('M47 26 C24 2 12 14 47 26 C70 2 82 14 47 26', { sw: 3 }) } },
    tuft: { w: 90, h: 50, draw: (d) => { d.shape('M6 48 C10 28 24 26 32 34 C36 10 58 10 62 30 C72 24 84 32 84 48 Z', C.snow, { hatch: false }) } },
    cloud: { w: 300, h: 150, wall: 1, draw: (d) => { d.shape('M50 132 C8 132 4 76 48 72 C50 26 118 16 138 54 C168 20 232 34 228 78 C276 76 290 132 244 132 Z', C.paper, { hatch: false }) } },
    star: { w: 120, h: 120, draw: (d) => { d.shape('M60 6 L76 44 L116 46 L84 72 L96 112 L60 90 L24 112 L36 72 L4 46 L44 44 Z', C.gold) } },
    bauble: { w: 110, h: 140, draw: (d) => { d.box(44, 4, 22, 18, C.gold, { hatch: false }); d.oval(55, 78, 48, 52, C.red); d.curve('M12 66 C36 84 74 84 98 66', { ink: C.paper, sw: 4 }); d.curve('M12 92 C36 108 74 108 98 92', { ink: C.warm, sw: 4 }) } },
    stick: { w: 16, h: 500, plain: 1, draw: (d) => { d.ctx.fillStyle = C.wood; d.ctx.fillRect(3, 0, 10, 500); d.line(4, 0, 5, 500, { sw: 1.4 }); d.line(12, 0, 12, 500, { sw: 1.4 }) } },
    string: { w: 8, h: 700, plain: 1, draw: (d) => { d.line(4, 0, 4, 700, { sw: 2.2, ink: C.red }) } },
    rope: { w: 320, h: 16, plain: 1, draw: (d) => { d.curve('M0 8 C80 14 240 14 320 8', { sw: 3, ink: C.brown }) } },
    banner: { w: 724, h: 340, draw: LOGO_BANNER(imgs) },
    dateCard: { w: 400, h: 208, draw: (d) => {
      d.shape('M8 10 L390 4 L394 200 L4 204 Z', C.paper, { hatch: false })
      d.text('19—20.12.2026', 200, 58, { size: 46, align: 'center', color: C.red, weight: 700 })
      d.text('Renaissance Riverside Sài Gòn', 200, 104, { size: 25, align: 'center' })
      d.text('Suất 18:00 và 20:30 mỗi ngày', 200, 144, { size: 25, align: 'center' })
    } },
    buy: { w: 270, h: 116, draw: (d) => {
      d.shape('M8 8 L262 8 L262 44 C250 48 250 68 262 72 L262 108 L8 108 L8 72 C20 68 20 48 8 44 Z', C.gold, { dark: 0.9 })
      d.text('Mua vé', 135, 72, { size: 50, align: 'center', weight: 700 })
    } },
    hint: { w: 370, h: 90, draw: (d) => {
      d.text('Cuộn để đi tiếp', 8, 54, { size: 34 })
      d.curve('M292 44 C310 42 334 42 356 44', { sw: 3.4 }); d.curve('M340 30 L358 44 L340 58', { sw: 3.4 })
    } },
    note: { w: 640, h: 410, draw: (d) => {
      d.shape('M8 12 L630 4 L634 402 L4 406 Z', C.paper, { hatch: false })
      d.text('Giáng Sinh đẹp nhất, khi ta ở bên nhau.', 44, 84, { size: 45, w: 560, weight: 700, color: C.red })
      d.text('Hãy cùng OrcheStars bước vào một hành trình âm nhạc qua những mùa Giáng Sinh, từ niềm háo hức chờ quà thời thơ bé đến những cảm xúc khi trưởng thành.', 44, 228, { size: 29, w: 560 })
      d.tape(320, 6, 110, -0.03)
    } },
    seasonChild: { w: 560, h: 500, draw: (d) => {
      d.shape('M6 8 L554 4 L556 494 L4 496 Z', C.paper, { hatch: false })
      d.text('Mùa thơ bé', 34, 62, { size: 46, weight: 700, color: C.red })
      d.text('Niềm háo hức chờ quà, sắc đỏ rộn ràng và những giọng ca trong trẻo.', 34, 108, { size: 27, w: 490 })
      d.shape('M90 300 L250 208 L410 300 Z', C.red)
      d.box(122, 300, 256, 142, C.tan)
      d.box(322, 214, 34, 66, C.brown)
      d.box(160, 330, 62, 62, C.warm, { hatch: false }); d.line(191, 330, 191, 392); d.line(160, 361, 222, 361)
      d.box(276, 340, 60, 102, C.pine)
      d.line(40, 442, 520, 442, { sw: 3 })
      d.text('Mở mùa này', 280, 482, { size: 26, align: 'center', color: C.blue, weight: 700 })
    } },
    seasonAdult: { w: 560, h: 500, draw: (d) => {
      d.shape('M6 4 L554 8 L552 496 L8 494 Z', '#27376f', { hatch: false })
      d.text('Mùa trưởng thành', 34, 62, { size: 44, weight: 700, color: C.warm })
      d.text('Những cảm xúc khi đã lớn, khi giai điệu kinh điển gặp nhịp điệu đương đại.', 34, 108, { size: 27, w: 490, color: C.paper })
      for (const [x, w, h] of [[50, 74, 150], [132, 60, 216], [200, 90, 130], [298, 66, 186], [372, 110, 142]]) {
        d.box(x, 442 - h, w, h, '#3f4e8e', { ink: C.paper, gap: 11 })
        for (let yy = 442 - h + 16; yy < 420; yy += 34) for (let xx = x + 12; xx < x + w - 14; xx += 22) if ((xx * 7 + yy * 3) % 5 > 1) { d.ctx.fillStyle = C.warm; d.ctx.fillRect(xx, yy, 11, 15) }
      }
      d.line(40, 442, 520, 442, { sw: 3, ink: C.paper })
      d.text('Mở mùa này', 280, 482, { size: 26, align: 'center', color: C.warm, weight: 700 })
    } },
    twoNote: { w: 560, h: 136, draw: (d) => {
      d.shape('M6 8 L554 4 L550 130 L8 132 Z', C.warm, { dark: 0.92 })
      d.text('Giao hưởng truyền thống và nhạc kịch Broadway kể hai sắc màu của cùng một mùa lễ hội.', 280, 54, { size: 27, w: 500, align: 'center' })
    } },
    frameHead: { w: 640, h: 300, draw: (d) => {
      d.shape('M8 8 L632 4 L634 294 L4 296 Z', C.paper, { hatch: false })
      d.text('Qua những khung hình.', 40, 84, { size: 50, weight: 700, color: C.red, w: 570 })
      d.text('Những nụ cười, những tràng vỗ tay. Những khoảnh khắc từ đêm nhạc Christmas 2025 của OrcheStars.', 40, 150, { size: 28, w: 560 })
      d.tape(90, 8, 100, -0.3); d.tape(560, 8, 100, 0.3)
    } },
    storyHead: { w: 560, h: 210, draw: (d) => {
      d.shape('M8 8 L552 6 L554 204 L6 202 Z', C.paper, { hatch: false })
      d.text('Những câu chuyện.', 36, 82, { size: 50, weight: 700, color: C.pine })
      d.text('Những sắc màu trong thế giới âm nhạc OrcheStars.', 36, 136, { size: 27, w: 490 })
      d.tape(280, 6, 100, 0.04)
    } },
    rail: { w: 300, h: 40, plain: 1, draw: (d) => {
      for (let x = 12; x < 300; x += 44) d.box(x, 14, 18, 24, C.brown, { hatch: false, sw: 1.6 })
      d.line(0, 18, 300, 18, { sw: 5 })
    } },
    engine: { w: 430, h: 300, draw: (d) => {
      d.box(20, 56, 120, 180, C.red); d.box(42, 84, 74, 66, C.warm, { hatch: false }); d.box(6, 32, 150, 26, C.deep)
      d.round(136, 118, 240, 118, 50, C.pine)
      d.box(286, 46, 48, 76, C.grey); d.shape('M274 24 L346 24 L334 48 L288 48 Z', INK, { hatch: false })
      d.oval(182, 110, 20, 20, C.gold)
      d.shape('M376 234 L426 288 L346 288 L346 234 Z', C.gold)
      d.box(10, 234, 346, 32, INK, { hatch: false })
    } },
    smoke: { w: 130, h: 110, wall: 1, draw: (d) => { d.shape('M26 92 C-4 88 6 44 36 50 C42 12 92 12 96 48 C126 46 130 92 100 94 Z', C.paper, { hatch: false }) } },
    seatCard: { w: 600, h: 500, draw: (d) => {
      d.shape('M8 8 L592 4 L594 494 L4 496 Z', C.paper, { hatch: false })
      d.ctx.drawImage(imgs.seat, 110, 20, 380, 380 * (imgs.seat.height / imgs.seat.width))
      d.text('Giá niêm yết cho một vé. Sơ đồ để tham khảo vị trí các khu vực. Chạm để xem lớn hơn.', 300, 404, { size: 24, w: 530, align: 'center' })
      d.tape(120, 8, 100, -0.2); d.tape(480, 8, 100, 0.2)
    } },
    ticketHead: { w: 780, h: 130, wall: 1, draw: (d) => { d.text('Một góc nhìn. Một buổi hẹn.', 390, 82, { size: 50, weight: 700, align: 'center', color: C.deep }) } },
    conductor: { w: 170, h: 280, draw: (d) => {
      d.line(70, 196, 66, 274, { sw: 9 }); d.line(100, 196, 104, 274, { sw: 9 })
      d.shape('M50 92 C56 76 114 76 120 92 L128 206 L42 206 Z', INK, { hatch: false })
      d.shape('M74 84 L96 84 L85 130 Z', C.paper, { hatch: false })
      d.oval(85, 48, 32, 34, C.skin, { hatch: false })
      d.shape('M53 44 C50 8 120 8 117 44 C100 28 72 28 53 44 Z', C.grey)
      d.dot(74, 52, 3.5); d.dot(96, 52, 3.5)
    } },
    arm: { w: 130, h: 40, plain: 1, draw: (d) => { d.line(4, 22, 74, 20, { sw: 10 }); d.oval(78, 20, 8, 8, C.skin, { hatch: false }); d.line(84, 20, 126, 10, { sw: 2.2 }) } },
    violin: { w: 150, h: 200, draw: (d) => {
      d.line(60, 150, 56, 196, { sw: 7 }); d.line(88, 150, 92, 196, { sw: 7 })
      d.shape('M42 66 C48 52 100 52 106 66 L112 156 L36 156 Z', INK, { hatch: false })
      d.oval(74, 32, 25, 27, C.skin, { hatch: false }); d.dot(66, 34, 3); d.dot(84, 34, 3)
      d.shape('M78 66 C110 56 134 62 130 78 C128 92 96 96 78 82 Z', C.wood)
      d.line(98, 96, 146, 40, { sw: 2.2 })
      d.line(44, 70, 86, 88, { sw: 7 })
    } },
    choir: { w: 110, h: 170, draw: (d) => {
      d.shape('M26 64 C32 54 78 54 84 64 L94 166 L16 166 Z', C.red)
      d.shape('M42 56 L68 56 L55 82 Z', C.paper, { hatch: false })
      d.oval(55, 34, 26, 26, C.skin, { hatch: false }); d.dot(46, 32, 3); d.dot(64, 32, 3); d.oval(55, 46, 5, 6, C.deep, { hatch: false })
      d.shape('M28 30 C24 2 86 2 82 30 C68 18 42 18 28 30 Z', C.brown)
    } },
    curtain: { w: 330, h: 660, wave: 1, draw: (d) => {
      d.shape('M6 6 L320 6 C318 240 240 440 300 654 L6 654 Z', C.red, { dark: 0.72, gap: 16, weight: 5, angle: -86 })
      d.shape('M20 330 C110 400 230 376 282 330 L276 372 C210 420 100 430 20 374 Z', C.gold)
    } },
    valance: { w: 1300, h: 150, wave: 1, draw: (d) => {
      let p = 'M4 4 L1296 4 L1296 90'
      for (let x = 1296; x > 4; x -= 108) p += ` C${x - 20} 150 ${x - 88} 150 ${x - 108} 90`
      d.shape(`${p} Z`, C.deep, { dark: 0.8, gap: 14, weight: 4, angle: -88 })
      d.line(10, 12, 1290, 12, { ink: C.gold, sw: 7 })
    } },
    stageBack: { w: 1300, h: 520, wall: 1, plain: 1, draw: (d) => {
      d.ctx.fillStyle = '#4b1016'; d.ctx.fillRect(0, 0, 1300, 520)
      for (let i = 0; i < 26; i++) { d.ctx.fillStyle = 'rgba(255,214,110,.92)'; d.ctx.beginPath(); d.ctx.arc(70 + i * 46, 130 + Math.sin(i * 0.9) * 26, 5, 0, 7); d.ctx.fill() }
    } },
    stageFloor: { w: 1300, h: 70, draw: (d) => { d.box(4, 6, 1292, 58, C.wood, { dark: 0.8, gap: 12, weight: 3, angle: 0 }) } },
    musicNote: { w: 70, h: 90, draw: (d) => { d.line(50, 12, 50, 66, { sw: 5 }); d.oval(36, 70, 16, 12, INK, { hatch: false }); d.curve('M50 12 C56 26 66 26 64 42', { sw: 5 }) } },
    skyline: { w: 900, h: 360, wall: 1, draw: (d) => {
      for (const [x, w, h, c] of [[10, 90, 150, '#d8dfe9'], [104, 70, 220, '#c5d3e6'], [180, 110, 120, '#e0d8c8'], [296, 80, 320, '#a9bedd'], [380, 60, 180, '#d8dfe9'], [448, 100, 240, '#c5d3e6'], [556, 90, 120, '#e0d8c8'], [650, 70, 280, '#a9bedd'], [726, 130, 160, '#d8dfe9']]) {
        d.box(x, 356 - h, w, h, c, { gap: 10 })
        for (let yy = 372 - h; yy < 340; yy += 36) for (let xx = x + 12; xx < x + w - 12; xx += 24) { d.ctx.fillStyle = (xx + yy) % 3 ? '#ffe28a' : '#7f8ea8'; d.ctx.fillRect(xx, yy, 11, 16) }
      }
      d.line(336, 36, 336, 2, { sw: 3 })
    } },
    palm: { w: 220, h: 340, sway: 1, draw: (d) => {
      d.shape('M100 334 C106 240 108 160 116 92 L128 92 C122 160 124 240 130 334 Z', C.brown)
      for (const p of ['M122 96 C90 58 50 56 6 94 C50 84 86 92 122 96', 'M122 96 C154 54 192 58 216 96 C184 84 154 92 122 96', 'M122 96 C100 46 88 26 56 8 C100 18 122 50 122 96', 'M122 96 C138 46 160 26 190 10 C156 24 132 56 122 96', 'M122 96 C94 106 58 128 40 168 C74 138 102 118 122 96', 'M122 96 C150 110 182 130 194 168 C166 138 144 118 122 96']) d.shape(p, C.leaf, { gap: 5 })
    } },
    boat: { w: 340, h: 170, draw: (d) => {
      d.shape('M8 96 C60 116 280 116 332 92 C318 148 280 164 250 164 L90 164 C50 164 24 142 8 96 Z', C.brown)
      d.shape('M104 100 C110 48 230 48 238 100 Z', C.tan)
      d.oval(44, 118, 8, 8, C.paper, { hatch: false }); d.dot(44, 118, 3)
      d.line(170, 54, 170, 8, { sw: 3 }); d.shape('M170 8 L208 20 L170 32 Z', C.red, { hatch: false })
    } },
    venueHead: { w: 620, h: 250, draw: (d) => {
      d.shape('M8 8 L612 4 L614 244 L4 246 Z', C.paper, { hatch: false })
      d.text('Giữa lòng Sài Gòn.', 36, 84, { size: 50, weight: 700, color: C.blue })
      d.text('Renaissance Riverside Sài Gòn, 8–15 Tôn Đức Thắng, Phường Sài Gòn, TP. Hồ Chí Minh.', 36, 142, { size: 27, w: 545 })
      d.tape(310, 6, 110, -0.02)
    } },
    hotel: { w: 560, h: 420, draw: (d) => {
      d.shape('M6 6 L554 4 L556 414 L4 416 Z', C.paper, { hatch: false })
      d.image(imgs.hotel, 24, 24, 512, 320)
      d.text('Ảnh: Marriott', 536, 384, { size: 20, align: 'right', color: '#5a6072' })
      d.tape(90, 8, 90, -0.3); d.tape(470, 8, 90, 0.3)
    } },
    checkin: { w: 500, h: 400, draw: (d) => {
      d.shape('M6 6 L494 4 L496 394 L4 396 Z', C.warm, { dark: 0.93 })
      d.text('Giờ check-in', 34, 58, { size: 38, weight: 700 })
      d.text('17:15', 34, 124, { size: 54, weight: 700, color: C.deep }); d.text('cho suất 18:00', 200, 120, { size: 28 })
      d.text('19:45', 34, 194, { size: 54, weight: 700, color: C.deep }); d.text('cho suất 20:30', 200, 190, { size: 28 })
      d.text('Áp dụng cho cả hai ngày 19 và 20.12.2026. Bạn nên có mặt trước giờ diễn ít nhất 30 phút.', 34, 252, { size: 26, w: 435 })
    } },
    directions: { w: 330, h: 116, draw: (d) => {
      d.shape('M8 10 L270 8 L322 58 L270 108 L8 106 Z', C.pine, { dark: 0.86 })
      d.text('Mở chỉ đường', 22, 70, { size: 36, weight: 700, color: C.paper })
    } },
    faqHead: { w: 620, h: 200, draw: (d) => {
      d.shape('M8 8 L612 4 L614 194 L4 196 Z', C.paper, { hatch: false })
      d.text('Câu hỏi thường gặp.', 36, 80, { size: 50, weight: 700, color: C.deep })
      d.text('Thông tin để cả nhà yên tâm tận hưởng đêm nhạc.', 36, 136, { size: 27, w: 545 })
      d.tape(310, 6, 110, 0.03)
    } },
    endBanner: { w: 724, h: 340, draw: (d) => {
      d.shape('M12 18 L708 8 L716 322 L8 330 Z', C.red, { dark: 0.88, gap: 10 })
      d.ctx.drawImage(imgs.logo, 86, 28, 548, 548 * (515 / 1627))
      d.text('19—20.12.2026, Renaissance Riverside Sài Gòn.', 360, 262, { size: 27, align: 'center', color: C.paper, weight: 700 })
    } },
    info: { w: 330, h: 112, draw: (d) => {
      d.shape('M8 8 L322 6 L324 106 L6 104 Z', C.paper, { hatch: false })
      d.text('Thông tin liên hệ', 165, 68, { size: 32, align: 'center', weight: 700, color: C.blue })
    } },
    orchestars: { w: 340, h: 110, draw: (d) => {
      d.shape('M6 8 L334 6 L332 104 L8 106 Z', INK, { hatch: false })
      d.ctx.drawImage(imgs.brand, 44, 26, 252, 252 * (imgs.brand.height / imgs.brand.width))
    } },
  }

  // Ảnh polaroid, album, vé, ghi chú hỏi đáp sinh theo dữ liệu.
  data.photos.forEach((ph, i) => {
    const wide = imgs[`photo${i}`].width > imgs[`photo${i}`].height
    const fw = wide ? 420 : 280
    // Ảnh nhỏ bỏ chú thích để khỏi có chữ tí hon; chạm vào vẫn thấy tên ảnh.
    const small = ph.s < 0.7
    const fh = wide ? (small ? 300 : 340) : 400
    P[`photo${i}`] = { w: fw, h: fh, keep: 1, draw: (d) => {
      d.shape(`M6 6 L${fw - 6} 4 L${fw - 4} ${fh - 6} L4 ${fh - 4} Z`, C.paper, { hatch: false })
      d.image(imgs[`photo${i}`], 20, 20, fw - 40, small ? fh - 40 : fh - 88)
      if (!small) d.text(ph.caption, fw / 2, fh - 26, { size: 27, align: 'center' })
      if (ph.tape) { d.tape(fw / 2, 6, 110, ph.tape) }
    } }
  })
  P.photoEmpty = { w: 280, h: 330, draw: (d) => {
    d.shape('M6 6 L274 4 L276 324 L4 326 Z', C.paper, { hatch: false })
    d.box(22, 22, 236, 236, '#e5e8f0', { hatch: false, sw: 1.5 })
    d.text('Khung hình tiếp theo có bạn.', 140, 110, { size: 34, w: 200, align: 'center', weight: 700, color: C.red })
    d.text('Mua vé', 140, 300, { size: 28, align: 'center', weight: 700, color: C.blue })
  } }
  data.albums.forEach((al, i) => {
    P[`wagon${i}`] = { w: 360, h: 350, keep: 1, lights: [[50, 18, 0xffd98a, 0.5], [130, 10, 0xff6a5a, 0.5], [230, 10, 0xffd98a, 0.5], [310, 18, 0x7dffb0, 0.5]], draw: (d) => {
      const c = [C.gold, C.leaf, C.sky, C.pink][i]
      d.shape('M4 44 C60 4 300 4 356 44 L356 56 L4 56 Z', C.deep, { gap: 7 })
      d.box(12, 52, 336, 256, c)
      d.ctx.fillStyle = '#fff'; d.ctx.fillRect(62, 62, 236, 236)
      d.image(imgs[`album${i}`], 66, 66, 228, 228)
      d.box(0, 304, 360, 30, INK, { hatch: false })
    } }
  })
  data.tickets.forEach((t, i) => {
    const color = [C.red, C.gold, C.blue, C.leaf][i]
    P[`ticket${i}`] = { w: 320, h: 220, draw: (d) => {
      d.shape('M8 8 L312 8 L312 86 C298 92 298 124 312 130 L312 212 L8 212 L8 130 C22 124 22 92 8 86 Z', C.paper, { hatch: false })
      d.box(8, 8, 62, 204, color, { dark: 0.86 })
      d.ctx.save(); d.ctx.translate(48, 150); d.ctx.rotate(-Math.PI / 2); d.text(t.kind, 0, 0, { size: 26, weight: 700, color: i === 1 ? INK : C.paper }); d.ctx.restore()
      d.text(t.name, 90, 66, { size: 39, weight: 700 })
      d.text(t.price, 90, 122, { size: 28, weight: 700, color: C.deep })
      d.text('Mua vé', 90, 182, { size: 28, weight: 700, color: C.blue })
    } }
  })
  data.faq.forEach((f, i) => {
    const color = ['#fff1a6', '#ffd5d5', '#cfeeda', '#d4e5fb', '#fff1a6', '#e9dbff'][i]
    P[`faq${i}`] = { w: 330, h: 300, draw: (d) => {
      d.shape('M8 8 L322 4 L324 292 L4 296 Z', color, { hatch: false })
      d.text(f.q, 28, 58, { size: 31, w: 276, weight: 600 })
      d.text('Xem câu trả lời', 28, 270, { size: 22, color: C.blue, weight: 700 })
      d.tape(165, 6, 90, (i % 2 ? 1 : -1) * 0.06)
    } }
  })
  decorProps(P)
  return P
}

// ---------- Vẽ một đạo cụ ra canvas có viền giấy và bóng ----------

export function renderProp(name, prop, k) {
  const pad = prop.plain ? 0 : 8
  const w = Math.ceil((prop.w + pad * 2) * k)
  const h = Math.ceil((prop.h + pad * 2) * k)
  const a = document.createElement('canvas')
  a.width = w; a.height = h
  const ctx = a.getContext('2d')
  ctx.scale(k, k); ctx.translate(pad, pad)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  prop.draw(pen(a, ctx, name))
  if (prop.plain) return { canvas: a, shadow: null, pad: 0 }

  // Viền giấy trắng quanh hình, như được cắt bằng kéo.
  const sil = document.createElement('canvas')
  sil.width = w; sil.height = h
  const s = sil.getContext('2d')
  s.drawImage(a, 0, 0)
  s.globalCompositeOperation = 'source-in'
  s.fillStyle = C.paper
  s.fillRect(0, 0, w, h)
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  const o = out.getContext('2d')
  const r = 4.2 * k
  for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2; o.drawImage(sil, Math.cos(t) * r, Math.sin(t) * r) }
  o.drawImage(a, 0, 0)

  // Bóng mềm: thu nhỏ rồi phóng to vài lần, chạy được cả trên Safari.
  const shadow = document.createElement('canvas')
  const sw = Math.max(8, Math.round((w / k) / 7)); const sh = Math.max(8, Math.round((h / k) / 7))
  shadow.width = sw + 8; shadow.height = sh + 8
  const b = shadow.getContext('2d')
  b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high'
  b.drawImage(out, 4, 4, sw, sh)
  b.globalCompositeOperation = 'source-in'
  b.fillStyle = '#2b3a6b'
  b.fillRect(0, 0, shadow.width, shadow.height)
  b.globalCompositeOperation = 'source-over'
  const tmp = document.createElement('canvas')
  tmp.width = shadow.width; tmp.height = shadow.height
  const t = tmp.getContext('2d')
  t.imageSmoothingQuality = 'high'
  for (let i = 0; i < 2; i++) {
    t.clearRect(0, 0, tmp.width, tmp.height)
    t.drawImage(shadow, 0, 0, tmp.width / 2, tmp.height / 2)
    b.clearRect(0, 0, shadow.width, shadow.height)
    b.drawImage(tmp, 0, 0, tmp.width / 2, tmp.height / 2, 0, 0, shadow.width, shadow.height)
  }
  return { canvas: out, shadow, pad }
}
