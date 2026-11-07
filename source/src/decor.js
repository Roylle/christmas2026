// Đồ trang trí thêm cho các cảnh. `lights` là các bóng đèn tính theo tọa độ vẽ: [x, y, màu, cỡ], chỉ sáng ban đêm.
import { C, INK } from './art.js'

const W = 0xffd98a // vàng ấm
const R = 0xff6a5a
const G = 0x7dffb0
const B = 0x8ab8ff
const palette = [W, R, G, B]

// Dây đèn võng: dùng chung công thức cho nét vẽ và vị trí bóng.
const sag = (t) => 12 + 84 * (1 - (2 * t - 1) ** 2)

export function decorProps(P) {
  Object.assign(P, {
    garland: {
      w: 1200, h: 130, plain: 1,
      lights: Array.from({ length: 13 }, (_, i) => [(i + 0.5) * (1200 / 13), sag((i + 0.5) / 13) + 14, palette[i % 4], 0.5]),
      draw: (d) => {
        d.curve('M0 12 C300 124 900 124 1200 12', { sw: 2.2, ink: '#3b5d3f' })
        for (let i = 0; i < 13; i++) {
          const x = (i + 0.5) * (1200 / 13); const y = sag((i + 0.5) / 13)
          d.box(x - 3, y, 6, 6, INK, { hatch: false, stroke: false })
          d.oval(x, y + 15, 7, 10, ['#ffd76a', '#e8484c', '#49b77c', '#6d9de8'][i % 4], { hatch: false, sw: 1.4 })
        }
      },
    },
    bunting: {
      w: 900, h: 110, plain: 1,
      draw: (d) => {
        d.curve('M0 8 C220 56 680 56 900 8', { sw: 2, ink: C.brown })
        for (let i = 0; i < 12; i++) {
          const x = 38 + i * 72; const t = x / 900; const y = 8 + 36 * (1 - (2 * t - 1) ** 2) * 1.05
          d.shape(`M${x - 22} ${y} L${x + 22} ${y} L${x} ${y + 44} Z`, [C.red, C.gold, C.pine, C.sky][i % 4], { sw: 1.6, gap: 5 })
        }
      },
    },
    clef: {
      w: 130, h: 260, plain: 1,
      draw: (d) => {
        d.curve('M78 214 C100 240 58 256 46 230 C40 214 62 206 68 220', { sw: 4 })
        d.curve('M72 8 C52 40 54 70 66 130 L80 214', { sw: 4 })
        d.curve('M72 8 C92 30 88 66 50 100 C14 132 22 182 66 186 C108 188 118 136 80 122 C50 112 36 150 62 164', { sw: 4 })
      },
    },
    wallNotes: {
      w: 300, h: 130, plain: 1,
      draw: (d) => {
        d.ctx.save()
        const n = (x, y) => { d.oval(x, y, 12, 8.5, INK, { hatch: false, sw: 1 }); d.line(x + 11, y, x + 11, y - 56, { sw: 2.6 }) }
        n(26, 104); n(90, 78); n(170, 90); n(232, 52)
        d.curve('M90 22 L170 34', { sw: 6 }); d.line(101, 22, 181, 34, { sw: 0.1 })
        d.ctx.restore()
      },
    },
    bird: {
      w: 110, h: 86,
      draw: (d) => {
        d.line(52, 70, 50, 84, { sw: 2 }); d.line(64, 70, 66, 84, { sw: 2 })
        d.shape('M16 44 C14 16 62 8 76 32 C86 34 96 38 106 42 L82 50 C78 68 34 78 16 44 Z', C.red, { gap: 5 })
        d.shape('M28 42 C40 30 60 40 58 56 C46 60 34 56 28 42 Z', C.paper, { hatch: false, sw: 1.6 })
        d.dot(68, 30, 3)
      },
    },
    doodleHeart: { w: 90, h: 86, plain: 1, draw: (d) => { d.curve('M45 76 C2 44 8 8 30 10 C40 11 44 20 45 28 C47 20 52 11 62 10 C84 8 88 44 45 76 Z', { sw: 2.6, ink: C.red }); d.curve('M60 18 C70 22 72 34 66 44', { sw: 1.6, ink: C.red }) } },
    doodleStar: { w: 90, h: 90, plain: 1, draw: (d) => { d.curve('M45 6 L58 34 L86 38 L64 58 L72 86 L45 70 L18 86 L26 58 L4 38 L32 34 Z', { sw: 2.6, ink: C.blue }) } },
    moon: {
      w: 230, h: 230, night: 1,
      lights: [[115, 115, W, 3.6]],
      draw: (d) => { d.shape('M150 14 C74 8 14 62 18 128 C22 190 86 226 148 212 C94 192 74 150 80 108 C86 66 116 34 150 14 Z', '#ffe9a8', { gap: 9, dark: 0.93 }) },
    },
    sleigh: {
      w: 760, h: 230,
      draw: (d) => {
        // Xe trượt bay với hai chú tuần lộc
        const deer = (x, y) => {
          d.line(x + 18, y + 64, x + 8, y + 104, { sw: 5 }); d.line(x + 34, y + 66, x + 30, y + 106, { sw: 5 }); d.line(x + 84, y + 62, x + 96, y + 102, { sw: 5 }); d.line(x + 96, y + 58, x + 118, y + 92, { sw: 5 })
          d.shape(`M${x + 6} ${y + 38} C${x + 20} ${y + 22} ${x + 86} ${y + 22} ${x + 104} ${y + 28} C${x + 112} ${y + 14} ${x + 116} ${y + 4} ${x + 122} ${y - 6} C${x + 142} ${y - 8} ${x + 158} ${y + 2} ${x + 160} ${y + 14} L${x + 134} ${y + 22} C${x + 130} ${y + 48} ${x + 112} ${y + 70} ${x + 88} ${y + 70} L${x + 30} ${y + 70} C${x + 10} ${y + 68} ${x} ${y + 52} ${x + 6} ${y + 38} Z`, C.tan, { gap: 6 })
          d.dot(x + 136, y + 6, 3)
          d.oval(x + 160, y + 14, 6, 6, C.red, { hatch: false, sw: 1.4 })
          d.curve(`M${x + 122} ${y - 6} L${x + 112} ${y - 32} M${x + 116} ${y - 20} L${x + 100} ${y - 28} M${x + 128} ${y - 8} L${x + 134} ${y - 34} M${x + 131} ${y - 22} L${x + 146} ${y - 30}`, { sw: 3, ink: C.brown })
        }
        deer(560, 70); deer(350, 92)
        d.curve('M300 110 L350 128 M512 124 L560 106', { sw: 2.2, ink: C.brown })
        d.curve('M8 150 C10 212 60 216 100 216 L286 216 C310 216 318 200 314 186', { sw: 7, ink: C.brown })
        d.line(90, 180, 90, 214, { sw: 5 }); d.line(234, 180, 234, 214, { sw: 5 })
        d.shape('M26 80 C20 130 26 176 54 184 L270 184 C296 176 306 136 310 104 L120 104 C96 104 84 88 80 74 C66 66 40 66 26 80 Z', C.red)
        d.line(40, 150, 296, 150, { ink: C.warm, sw: 5 })
        d.shape('M104 104 L128 42 L196 42 L212 104 Z', C.pine, { gap: 7 })
        d.shape('M186 104 L204 62 L262 62 L270 104 Z', C.gold, { gap: 7 })
        d.line(160, 42, 160, 104, { ink: C.warm, sw: 5 })
      },
    },
    wreath: {
      w: 190, h: 200,
      lights: [[50, 70, W, 0.42], [140, 62, R, 0.42], [150, 130, W, 0.42], [40, 130, G, 0.42], [95, 30, W, 0.42]],
      draw: (d) => {
        for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283; const x = 95 + Math.cos(a) * 62; const y = 92 + Math.sin(a) * 62; d.oval(x, y, 24, 22, i % 2 ? C.pine : C.leaf, { gap: 5, sw: 1.6 }) }
        for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283 + 0.3; d.oval(95 + Math.cos(a) * 62, 92 + Math.sin(a) * 62, 7, 7, C.red, { hatch: false, sw: 1.2 }) }
        d.shape('M95 160 C60 132 46 168 62 178 C74 184 88 172 95 160 C102 172 116 184 128 178 C144 168 130 132 95 160 Z', C.red, { gap: 5 })
      },
    },
    gingerHouse: {
      w: 330, h: 300,
      lights: [[86, 196, W, 1.3], [246, 196, W, 1.3]],
      draw: (d) => {
        d.box(40, 138, 250, 156, '#b77a45', { gap: 8 })
        d.shape('M12 148 L165 22 L318 148 Z', '#8a5a33', { gap: 8 })
        d.curve('M14 148 C30 170 46 170 60 148 C76 170 92 170 108 148 C124 170 140 170 156 148 C172 170 188 170 204 148 C220 170 236 170 252 148 C268 170 284 170 316 148', { ink: C.paper, sw: 8 })
        d.box(62, 170, 48, 50, C.warm, { hatch: false }); d.box(222, 170, 48, 50, C.warm, { hatch: false })
        d.shape('M140 294 L140 214 C140 188 192 188 192 214 L192 294 Z', C.red)
        for (const [x, y, c] of [[165, 76, C.red], [110, 118, C.leaf], [222, 116, C.gold], [165, 124, C.sky]]) d.oval(x, y, 11, 11, c, { hatch: false, sw: 1.4 })
      },
    },
    candyCane: {
      w: 110, h: 250,
      draw: (d) => {
        d.shape('M34 246 L34 62 C34 2 104 2 104 62 L104 84 L74 84 L74 62 C74 44 62 44 62 62 L62 246 Z', C.paper, { hatch: false })
        for (const y of [214, 172, 130, 88]) d.shape(`M34 ${y + 26} L62 ${y} L62 ${y + 18} L34 ${y + 44} Z`, C.red, { hatch: false, sw: 1 })
        d.shape('M42 38 L58 30 L68 44 L50 54 Z', C.red, { hatch: false, sw: 1 }); d.shape('M78 26 L96 36 L90 54 L74 44 Z', C.red, { hatch: false, sw: 1 })
      },
    },
    teddy: {
      w: 170, h: 190,
      draw: (d) => {
        d.oval(38, 30, 19, 19, C.brown); d.oval(132, 30, 19, 19, C.brown)
        d.oval(44, 150, 26, 28, C.brown); d.oval(126, 150, 26, 28, C.brown)
        d.oval(85, 128, 50, 54, C.brown, { gap: 6 }); d.oval(85, 128, 28, 30, C.tan, { hatch: false, sw: 1.4 })
        d.oval(26, 104, 18, 26, C.brown); d.oval(144, 104, 18, 26, C.brown)
        d.oval(85, 52, 52, 46, C.brown, { gap: 6 }); d.oval(85, 66, 22, 17, C.tan, { hatch: false, sw: 1.4 })
        d.dot(66, 44, 4.5); d.dot(104, 44, 4.5); d.dot(85, 60, 5); d.curve('M76 72 C80 78 90 78 94 72', { sw: 2 })
        d.shape('M85 94 L58 80 L58 108 Z', C.red, { hatch: false, sw: 1.6 }); d.shape('M85 94 L112 80 L112 108 Z', C.red, { hatch: false, sw: 1.6 })
      },
    },
    drum: {
      w: 150, h: 160,
      draw: (d) => {
        d.box(14, 56, 122, 92, C.red); d.oval(75, 54, 61, 20, C.paper, { hatch: false })
        d.curve('M16 62 L44 146 L74 62 L104 146 L134 62', { ink: C.warm, sw: 4 })
        d.line(46, 28, 86, 46, { sw: 5, ink: C.brown }); d.line(112, 22, 74, 44, { sw: 5, ink: C.brown })
      },
    },
    piano: {
      w: 340, h: 200,
      draw: (d) => {
        d.shape('M18 74 C20 30 90 16 150 42 C196 60 230 20 300 40 C330 50 330 84 310 92 L18 92 Z', INK, { hatch: false })
        d.line(82, 60, 150, 8, { sw: 3 })
        d.box(18, 90, 292, 34, '#30323e', { hatch: false })
        for (let x = 26; x < 296; x += 18) { d.ctx.fillStyle = '#fff'; d.ctx.fillRect(x, 96, 15, 22) }
        for (let x = 36; x < 296; x += 36) { d.ctx.fillStyle = INK; d.ctx.fillRect(x, 96, 8, 13) }
        d.line(52, 124, 44, 196, { sw: 7 }); d.line(280, 124, 288, 196, { sw: 7 })
      },
    },
    lamp: {
      w: 130, h: 420,
      lights: [[65, 56, W, 2.8]],
      draw: (d) => {
        d.box(56, 86, 18, 320, INK, { hatch: false, sw: 1 })
        d.shape('M34 412 L96 412 L84 386 L46 386 Z', INK, { hatch: false })
        d.shape('M34 84 L96 84 L106 34 L24 34 Z', C.warm, { hatch: false })
        d.shape('M16 34 L114 34 L65 4 Z', INK, { hatch: false })
        d.line(65, 34, 65, 84, { sw: 2 })
        d.shape('M56 136 L76 136 L66 120 Z', C.pine, { hatch: false, sw: 1.2 })
      },
    },
    lantern: {
      // Đèn ông sao
      w: 170, h: 190,
      lights: [[85, 86, R, 2.4]],
      draw: (d) => {
        d.shape('M85 8 L106 62 L164 66 L120 102 L134 158 L85 128 L36 158 L50 102 L6 66 L64 62 Z', C.red, { gap: 7, dark: 0.82 })
        d.curve('M85 8 L85 128 M6 66 L120 102 M164 66 L50 102 M36 158 L106 62 M134 158 L64 62', { sw: 1.5 })
        d.oval(85, 86, 14, 14, C.warm, { hatch: false, sw: 1.2 })
        d.curve('M36 158 C32 172 30 178 26 188 M134 158 C138 172 140 178 144 188', { ink: C.gold, sw: 3 })
      },
    },
    cathedral: {
      // Nhà thờ Đức Bà Sài Gòn, gạch đỏ hai tháp chuông
      w: 500, h: 620,
      lights: [[250, 300, W, 2.4], [116, 230, W, 1.0], [384, 230, W, 1.0], [250, 450, W, 1.2]],
      draw: (d) => {
        const brick = '#cf7355'
        d.shape('M64 620 L64 150 L92 150 L116 26 L140 150 L168 150 L168 620 Z', brick, { gap: 9 })
        d.shape('M332 620 L332 150 L360 150 L384 26 L408 150 L436 150 L436 620 Z', brick, { gap: 9 })
        d.shape('M92 150 L116 26 L140 150 Z', '#5f7f92', { gap: 5 }); d.shape('M360 150 L384 26 L408 150 Z', '#5f7f92', { gap: 5 })
        d.line(116, 26, 116, 2, { sw: 3 }); d.line(106, 12, 126, 12, { sw: 3 }); d.line(384, 26, 384, 2, { sw: 3 }); d.line(374, 12, 394, 12, { sw: 3 })
        d.shape('M168 620 L168 270 L250 196 L332 270 L332 620 Z', brick, { gap: 9 })
        d.line(250, 196, 250, 170, { sw: 3 }); d.line(240, 180, 260, 180, { sw: 3 })
        d.oval(250, 300, 40, 40, C.warm, { hatch: false }); d.curve('M210 300 L290 300 M250 260 L250 340 M222 272 L278 328 M278 272 L222 328', { sw: 1.4 })
        for (const x of [116, 384]) { d.shape(`M${x - 18} 260 L${x - 18} 210 C${x - 18} 190 ${x + 18} 190 ${x + 18} 210 L${x + 18} 260 Z`, C.warm, { hatch: false }); d.shape(`M${x - 18} 420 L${x - 18} 350 C${x - 18} 330 ${x + 18} 330 ${x + 18} 350 L${x + 18} 420 Z`, C.warm, { hatch: false }) }
        d.shape('M206 620 L206 490 C206 440 294 440 294 490 L294 620 Z', C.warm, { hatch: false })
        d.line(250, 450, 250, 620, { sw: 2 })
        d.curve('M64 170 L168 170 M332 170 L436 170 M64 300 L168 300 M332 300 L436 300', { sw: 1.8 })
      },
    },
    scooter: {
      w: 320, h: 200,
      draw: (d) => {
        d.shape('M60 150 C60 110 110 104 150 112 L214 112 L244 40 L264 40 L238 150 L170 150 C170 170 80 170 60 150 Z', C.sky, { gap: 7 })
        d.shape('M64 112 C70 92 140 92 158 110 L150 122 L72 124 Z', INK, { hatch: false })
        d.line(240, 40, 214, 28, { sw: 5 }); d.oval(260, 68, 11, 11, C.warm, { hatch: false })
        d.oval(84, 164, 30, 30, null, { sw: 6 }); d.oval(84, 164, 8, 8, C.grey, { hatch: false })
        d.oval(244, 164, 30, 30, null, { sw: 6 }); d.oval(244, 164, 8, 8, C.grey, { hatch: false })
        d.box(10, 88, 58, 44, C.red); d.line(39, 88, 39, 132, { ink: C.warm, sw: 4 }); d.line(10, 110, 68, 110, { ink: C.warm, sw: 4 })
      },
    },
    cart: {
      // Xe bánh mì Sài Gòn
      w: 330, h: 330,
      lights: [[165, 112, W, 1.5]],
      draw: (d) => {
        d.line(32, 76, 32, 210, { sw: 4 }); d.line(298, 76, 298, 210, { sw: 4 })
        d.shape('M6 80 L324 80 L296 26 L34 26 Z', C.red, { gap: 8 }); d.curve('M6 80 C30 100 50 100 70 80 C90 100 110 100 134 80 C154 100 174 100 196 80 C216 100 238 100 260 80 C280 100 304 100 324 80', { sw: 2 })
        d.box(24, 196, 282, 86, C.paper, { hatch: false }); d.text('Bánh mì', 165, 252, { size: 44, align: 'center', weight: 700, color: C.deep })
        d.box(60, 100, 210, 96, 'rgba(255,241,190,.9)', { hatch: false, sw: 1.6 })
        for (const x of [100, 165, 230]) d.shape(`M${x - 28} 172 C${x - 18} 150 ${x + 18} 150 ${x + 28} 172 Z`, C.tan, { gap: 4, sw: 1.6 })
        d.oval(70, 304, 20, 20, null, { sw: 5 }); d.oval(260, 304, 20, 20, null, { sw: 5 })
      },
    },
    mountain: {
      w: 900, h: 330, wall: 1,
      draw: (d) => {
        d.shape('M4 326 L190 90 L300 210 L470 14 L660 230 L760 130 L896 326 Z', '#a9c1d6', { gap: 10, dark: 0.9 })
        d.shape('M470 14 L526 78 L490 62 L462 92 L430 60 L410 84 Z', C.paper, { hatch: false, sw: 1.6 })
        d.shape('M190 90 L226 130 L196 118 L176 132 L152 138 Z', C.paper, { hatch: false, sw: 1.6 })
      },
    },
    signal: {
      w: 100, h: 330,
      lights: [[50, 38, R, 1.2], [50, 86, G, 1.2]],
      draw: (d) => {
        d.box(42, 110, 16, 214, INK, { hatch: false, sw: 1 }); d.round(16, 6, 68, 110, 16, INK, { hatch: false })
        d.oval(50, 38, 15, 15, C.red, { hatch: false, ink: C.paper, sw: 1.4 }); d.oval(50, 86, 15, 15, C.leaf, { hatch: false, ink: C.paper, sw: 1.4 })
      },
    },
    nutcracker: {
      w: 150, h: 370,
      draw: (d) => {
        d.box(46, 262, 24, 96, INK, { hatch: false, sw: 1 }); d.box(80, 262, 24, 96, INK, { hatch: false, sw: 1 })
        d.shape('M32 358 L72 358 L72 340 L40 340 Z', INK, { hatch: false, sw: 1 }); d.shape('M118 358 L78 358 L78 340 L110 340 Z', INK, { hatch: false, sw: 1 })
        d.shape('M42 150 L108 150 L114 268 L36 268 Z', C.red)
        d.box(68, 150, 14, 118, C.gold, { hatch: false, sw: 1.4 }); d.box(36, 240, 78, 16, INK, { hatch: false, sw: 1 })
        d.box(14, 156, 26, 92, C.red); d.box(110, 156, 26, 92, C.red); d.oval(27, 254, 12, 12, C.paper, { hatch: false })
        d.oval(123, 254, 12, 12, C.paper, { hatch: false })
        d.line(123, 262, 123, 180, { ink: C.gold, sw: 5 })
        d.box(42, 80, 66, 70, C.skin, { hatch: false })
        d.dot(62, 102, 4); d.dot(88, 102, 4); d.oval(75, 114, 6, 7, C.pink, { hatch: false, sw: 1.2 })
        d.shape('M42 124 L108 124 L100 158 L50 158 Z', C.paper, { hatch: false }); d.curve('M60 134 L90 134', { sw: 3 })
        d.shape('M40 80 L110 80 L102 10 L48 10 Z', INK, { hatch: false }); d.box(40, 66, 70, 14, C.gold, { hatch: false, sw: 1.2 }); d.oval(75, 8, 9, 8, C.red, { hatch: false, sw: 1.2 })
      },
    },
    horn: {
      w: 200, h: 170,
      draw: (d) => {
        d.oval(100, 92, 58, 58, null, { sw: 9, ink: C.gold })
        d.shape('M144 42 C160 24 186 12 196 10 L196 88 C176 86 160 74 148 60 Z', C.gold, { gap: 5 })
        d.line(44, 96, 8, 112, { sw: 7, ink: C.gold }); d.oval(100, 92, 30, 30, null, { sw: 4, ink: '#d99a20' })
      },
    },
    mug: {
      w: 170, h: 170,
      draw: (d) => {
        d.curve('M58 40 C48 26 66 20 56 6 M92 40 C82 26 100 20 90 6', { sw: 2.4, ink: '#8fa4c2' })
        d.shape('M122 80 C162 72 162 136 118 130 L118 114 C140 118 140 94 122 96 Z', C.red, { hatch: false })
        d.round(20, 48, 106, 112, 16, C.red); d.oval(73, 54, 50, 12, '#7a4a2c', { hatch: false })
        d.oval(58, 52, 13, 8, C.paper, { hatch: false, sw: 1.2 }); d.oval(88, 54, 13, 8, C.paper, { hatch: false, sw: 1.2 })
      },
    },
    pencil: {
      w: 620, h: 80,
      draw: (d) => {
        d.box(70, 14, 440, 54, C.gold, { gap: 6, angle: 0 })
        d.curve('M70 32 L510 32 M70 50 L510 50', { sw: 1.4 })
        d.shape('M510 14 L600 40 L510 68 Z', C.tan, { hatch: false }); d.shape('M574 32 L600 40 L574 48 Z', INK, { hatch: false })
        d.box(44, 14, 26, 54, C.grey, { gap: 4, angle: 90 }); d.round(6, 14, 40, 54, 12, C.pink, { hatch: false })
      },
    },
    clip: { w: 70, h: 170, plain: 1, draw: (d) => { d.curve('M20 40 L20 134 C20 166 56 166 56 134 L56 28 C56 4 12 4 12 28 L12 124', { sw: 4, ink: '#6d7482' }) } },
    fgMound: { w: 520, h: 150, draw: (d) => { d.shape('M6 146 C30 80 110 70 160 96 C200 30 320 30 356 88 C400 66 490 80 514 146 Z', C.snow, { hatch: false }) } },
    fgCandy: { w: 280, h: 210, draw: (d) => {
      d.shape('M12 206 C10 130 60 120 74 150 C90 96 160 92 180 144 C200 120 266 130 268 206 Z', C.snow, { hatch: false })
      d.box(30, 72, 104, 92, C.red); d.box(70, 72, 24, 92, C.warm, { hatch: false }); d.curve('M82 72 C54 40 38 54 82 72 C110 40 126 54 82 72', { sw: 3 })
    } },
    roofSeat: { w: 150, h: 50, draw: (d) => { d.round(6, 8, 138, 36, 14, C.red, { gap: 5 }); d.curve('M20 26 L130 26', { ink: C.warm, sw: 3 }) } },
    connector: { w: 80, h: 28, plain: 1, draw: (d) => { d.box(2, 6, 76, 14, INK, { hatch: false, sw: 1 }) } },
  })
  // Thêm bóng đèn cho vật đã có sẵn.
  P.tree.lights = [[100, 100, R, 0.42], [150, 160, W, 0.42], [90, 176, B, 0.42], [66, 262, R, 0.42], [124, 240, W, 0.42], [186, 262, G, 0.42], [120, 12, W, 1.5], [132, 72, W, 0.34], [70, 226, W, 0.34], [168, 214, B, 0.34]]
  P.treeSmall.lights = [[75, 44, W, 0.36], [60, 92, R, 0.36], [96, 104, G, 0.36], [50, 150, B, 0.36], [110, 156, W, 0.36], [78, 130, W, 0.36]]
  P.star.lights = [[60, 62, W, 1.8]]
  P.bauble.lights = [[55, 78, R, 1.0]]
  P.seasonChild.lights = [[191, 361, W, 1.4]]
  P.seasonAdult.lights = [[82, 330, W, 1.1], [160, 280, W, 1.1], [244, 350, W, 1.1], [330, 310, W, 1.1], [425, 345, W, 1.1]]
  P.stageBack.lights = Array.from({ length: 26 }, (_, i) => [70 + i * 46, 130 + Math.sin(i * 0.9) * 26, i % 3 ? W : R, 0.5])
  P.skyline.lights = [[50, 250, W, 1.3], [138, 190, W, 1.3], [336, 110, W, 1.5], [336, 2, R, 0.6], [500, 170, W, 1.3], [686, 130, W, 1.3], [790, 260, W, 1.3], [410, 240, W, 1.1], [600, 300, W, 1.1]]
  P.engine.lights = [[392, 200, W, 2.6]]
  P.boat.lights = [[172, 76, W, 1.0]]
  P.rope.lights = [[40, 14, W, 0.45], [120, 16, R, 0.45], [200, 16, W, 0.45], [280, 14, G, 0.45]]
}
