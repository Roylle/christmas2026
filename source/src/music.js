// Hộp nhạc tổng hợp bằng WebAudio, chơi hai giai điệu dân gian đã thuộc phạm vi công cộng.
// Mỗi nốt là [cao độ MIDI, độ dài tính theo đơn vị].
const n = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77 }

const JINGLE = {
  unit: 0.17,
  melody: [
    [n.E4,2],[n.E4,2],[n.E4,4], [n.E4,2],[n.E4,2],[n.E4,4], [n.E4,2],[n.G4,2],[n.C4,3],[n.D4,1], [n.E4,8],
    [n.F4,2],[n.F4,2],[n.F4,3],[n.F4,1], [n.F4,2],[n.E4,2],[n.E4,2],[n.E4,1],[n.E4,1], [n.E4,2],[n.D4,2],[n.D4,2],[n.E4,2], [n.D4,4],[n.G4,4],
    [n.E4,2],[n.E4,2],[n.E4,4], [n.E4,2],[n.E4,2],[n.E4,4], [n.E4,2],[n.G4,2],[n.C4,3],[n.D4,1], [n.E4,8],
    [n.F4,2],[n.F4,2],[n.F4,3],[n.F4,1], [n.F4,2],[n.E4,2],[n.E4,2],[n.E4,1],[n.E4,1], [n.G4,2],[n.G4,2],[n.F4,2],[n.D4,2], [n.C4,8],
  ],
  barLength: 8,
  roots: [48, 48, 48, 48, 53, 48, 50, 43, 48, 48, 48, 48, 53, 48, 43, 48],
}

const SILENT = {
  unit: 0.3,
  melody: [
    [n.G4,3],[n.A4,1],[n.G4,2],[n.E4,6], [n.G4,3],[n.A4,1],[n.G4,2],[n.E4,6],
    [n.D5,4],[n.D5,2],[n.B4,6], [n.C5,4],[n.C5,2],[n.G4,6],
    [n.A4,4],[n.A4,2],[n.C5,3],[n.B4,1],[n.A4,2], [n.G4,3],[n.A4,1],[n.G4,2],[n.E4,6],
    [n.A4,4],[n.A4,2],[n.C5,3],[n.B4,1],[n.A4,2], [n.G4,3],[n.A4,1],[n.G4,2],[n.E4,6],
    [n.D5,4],[n.D5,2],[n.F5,3],[n.D5,1],[n.B4,2], [n.C5,6],[n.E5,6],
    [n.C5,3],[n.G4,1],[n.E4,2],[n.G4,3],[n.F4,1],[n.D4,2], [n.C4,12],
  ],
  barLength: 12,
  roots: [48, 48, 43, 48, 53, 48, 53, 48, 43, 48, 43, 48],
}

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)

export function createMusic() {
  let ctx, master, toneBus, delay, feedback
  let playing = false
  let song = JINGLE
  let timer = 0
  let nextTime = 0
  let noteIndex = 0
  let position = 0
  const voices = new Set()
  let disposed = false

  const bell = (midi, time, gain) => {
    const f = hz(midi)
    ;[[1, 1, 1.5], [3.01, 0.32, 0.5], [5.4, 0.1, 0.22]].forEach(([ratio, level, decay]) => {
      const osc = ctx.createOscillator()
      const amp = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f * ratio
      amp.gain.setValueAtTime(0, time)
      amp.gain.linearRampToValueAtTime(gain * level, time + 0.004)
      amp.gain.exponentialRampToValueAtTime(0.0001, time + decay)
      osc.connect(amp).connect(toneBus)
      voices.add(osc)
      osc.onended = () => { voices.delete(osc); osc.disconnect(); amp.disconnect() }
      osc.start(time)
      osc.stop(time + decay + 0.05)
    })
  }

  const schedule = () => {
    if (disposed || !playing || document.hidden) return
    while (nextTime < ctx.currentTime + 0.3) {
      const [pitch, length] = song.melody[noteIndex]
      bell(pitch + 12, nextTime, 0.3)
      if (position % song.barLength === 0) {
        bell(song.roots[Math.floor(position / song.barLength) % song.roots.length], nextTime, 0.13)
      }
      nextTime += length * song.unit
      position += length
      noteIndex += 1
      if (noteIndex >= song.melody.length) {
        noteIndex = 0
        position = 0
        nextTime += song.unit * 4
      }
    }
    timer = setTimeout(schedule, 100)
  }

  const init = () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.55
    toneBus = ctx.createGain(); toneBus.gain.value = 1; toneBus.connect(master)
    delay = ctx.createDelay()
    delay.delayTime.value = 0.23
    feedback = ctx.createGain()
    feedback.gain.value = 0.26
    master.connect(ctx.destination)
    toneBus.connect(delay)
    delay.connect(feedback).connect(delay)
    delay.connect(master)
  }

  const fade = (value, duration = .25) => {
    if (!ctx) return
    toneBus.gain.cancelScheduledValues(ctx.currentTime)
    toneBus.gain.setValueAtTime(toneBus.gain.value, ctx.currentTime)
    toneBus.gain.linearRampToValueAtTime(value, ctx.currentTime + duration)
  }
  const stopVoices = () => { for (const voice of voices) { try { voice.stop() } catch {} } }
  const visibility = () => {
    if (!ctx || !playing) return
    clearTimeout(timer)
    if (document.hidden) { ctx.suspend(); stopVoices() }
    else ctx.resume().then(() => { if (!playing || disposed) return; nextTime = ctx.currentTime + .12; schedule() }).catch(() => {})
  }
  document.addEventListener('visibilitychange', visibility)
  return {
    get playing() { return playing },
    async toggle() {
      if (disposed) return false
      try {
        if (!ctx) init()
        playing = !playing
        clearTimeout(timer)
        if (playing) {
          await ctx.resume()
          fade(1, .45)
          nextTime = ctx.currentTime + .08
          schedule()
        } else {
          fade(0)
          stopVoices()
        }
      } catch { playing = false }
      return playing
    },
    setSeason(season) {
      song = season === 'adult' ? SILENT : JINGLE
      noteIndex = 0; position = 0
      if (playing && ctx) {
        clearTimeout(timer)
        fade(0, .25)
        // Finish the old phrase before the new season softly enters.
        timer = setTimeout(() => {
          if (!playing || disposed) return
          stopVoices(); nextTime = ctx.currentTime + .08
          fade(1, 1.4); schedule()
        }, 300)
      }
    },
    dispose() {
      disposed = true; playing = false; clearTimeout(timer)
      document.removeEventListener('visibilitychange', visibility)
      stopVoices(); ctx?.close()
    },
  }
}
