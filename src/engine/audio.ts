import { onGameEvent } from '../app/session'
import { useUi } from '../app/store'
import {
  COOLDOWN,
  type CueName,
  createThrottle,
  cueFor,
  DEFAULT_COOLDOWN,
  SUBTITLE_COOLDOWN,
  SUBTITLES,
} from './cues'

// Everything is synthesized; no assets. Failures are swallowed so the game and
// subtitles keep working without sound.

interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let started = false
let drone: { gain: GainNode; stop: () => void } | null = null
let areaId = ''
let pendingArea = ''
const gate = createThrottle()
const subtitledGhosts = new Set<string>()

const now = () => performance.now()

function env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

function tone(
  freq: number,
  t: number,
  dur: number,
  peak: number,
  opts: { type?: OscillatorType; to?: number; attack?: number; detune?: number } = {},
) {
  if (!ctx || !master) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur)
  if (opts.detune) o.detune.value = opts.detune
  env(g, t, peak, opts.attack ?? 0.01, dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
  o.onended = () => {
    o.disconnect()
    g.disconnect()
  }
}

let noiseBuf: AudioBuffer | null = null
function noise(
  t: number,
  dur: number,
  peak: number,
  freq: number,
  type: BiquadFilterType = 'lowpass',
  attack = 0.01,
) {
  if (!ctx || !master) return
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  s.loop = true
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = ctx.createGain()
  env(g, t, peak, attack, dur)
  s.connect(f).connect(g).connect(master)
  s.start(t)
  s.stop(t + dur + 0.05)
  s.onended = () => {
    s.disconnect()
    f.disconnect()
    g.disconnect()
  }
}

const CUES: Record<CueName, (t: number) => void> = {
  ghostOn: (t) => {
    tone(880, t, 0.5, 0.05, { detune: -6 })
    tone(1318.5, t, 0.5, 0.035, { detune: 7 })
  },
  ghostOff: (t) => {
    tone(1318.5, t, 0.4, 0.035, { to: 1200, detune: 7 })
    tone(880, t, 0.4, 0.05, { to: 800, detune: -6 })
  },
  teleport: (t) => noise(t, 0.6, 0.03, 400, 'lowpass', 0.25),
  plateOn: (t) => {
    noise(t, 0.04, 0.08, 2500, 'bandpass', 0.002)
    tone(330, t, 0.25, 0.05)
  },
  plateOff: (t) => {
    noise(t, 0.03, 0.05, 1800, 'bandpass', 0.002)
    tone(247, t, 0.2, 0.035)
  },
  door: (t) => {
    noise(t, 1.2, 0.12, 180, 'lowpass', 0.3)
    tone(55, t, 1.2, 0.08, { attack: 0.3 })
  },
  grab: (t) => noise(t, 0.03, 0.05, 3000, 'bandpass', 0.002),
  drop: (t) => noise(t, 0.04, 0.06, 1500, 'bandpass', 0.002),
  blocked: (t) => {
    tone(90, t, 0.18, 0.12, { to: 55, attack: 0.005 })
    noise(t, 0.08, 0.04, 400, 'lowpass', 0.003)
  },
  gravity: (t) => {
    tone(160, t, 1.6, 0.07, { to: 55, attack: 0.4 })
    noise(t, 1.6, 0.025, 500, 'lowpass', 0.5)
  },
  checkpoint: (t) => {
    tone(1046.5, t, 1.4, 0.03)
    tone(1568, t + 0.12, 1.4, 0.02)
  },
  solve: (t) => {
    for (const [i, f] of [392, 493.9, 587.3].entries())
      tone(f, t + i * 0.09, 1.8, 0.04, { attack: 0.05 })
  },
  secret: (t) => {
    for (const [i, f] of [330, 392, 494, 587, 784].entries())
      tone(f, t + i * 0.11, 1.2, 0.035, { attack: 0.02 })
  },
  respawn: (t) => tone(440, t, 1.1, 0.05, { to: 110, attack: 0.05 }),
  eyesClose: (t) => noise(t, 0.35, 0.04, 260, 'lowpass', 0.08),
  eyesOpen: (t) => noise(t, 0.25, 0.03, 900, 'lowpass', 0.04),
}

// Drone: [freqs, gain]. Arrival is near-silent, unknown areas are silent.
const DRONES: Record<string, [number[], number]> = {
  arrival: [[55], 0.004],
  atrium: [[65.4, 98], 0.018],
  loop: [[73.4, 110.2], 0.018],
  perspective: [[82.4, 123.5], 0.018],
  inversion: [[61.7, 92.5, 185], 0.018],
  convergence: [[55, 82.4, 110], 0.02],
  ending: [[130.8, 196], 0.012],
}

function setDrone(id: string) {
  if (!ctx || !master || id === areaId) return
  areaId = id
  const t = ctx.currentTime
  const old = drone
  drone = null
  if (old) {
    old.gain.gain.cancelScheduledValues(t)
    old.gain.gain.setValueAtTime(old.gain.gain.value, t)
    old.gain.gain.linearRampToValueAtTime(0, t + 2)
    setTimeout(old.stop, 2200)
  }
  const spec = DRONES[id]
  if (!spec) return
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(spec[1], t + 2)
  g.connect(master)
  const oscs = spec[0].map((f, i) => {
    const o = ctx!.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    o.detune.value = i * 4
    o.connect(g)
    o.start(t)
    return o
  })
  drone = {
    gain: g,
    stop: () => {
      for (const o of oscs) {
        o.stop()
        o.disconnect()
      }
      g.disconnect()
    },
  }
}

function sync() {
  if (!ctx || !master) return
  const { screen, settings } = useUi.getState()
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, settings.volume)), ctx.currentTime, 0.05)
  const active = screen === 'playing' && !document.hidden
  if (active && ctx.state !== 'running') void ctx.resume().catch(() => {})
  else if (!active && ctx.state === 'running') void ctx.suspend().catch(() => {})
}

function handle(e: Parameters<typeof cueFor>[0]) {
  if (e.name === 'area') {
    pendingArea = e.id
    setDrone(e.id)
    return
  }
  const c = cueFor(e)
  if (!c) return
  const t = now()
  // A ghost's change is news once; after that the subtitle would only be noise.
  const repeatGhost = e.name === 'ghost' && subtitledGhosts.has(e.id)
  if (e.name === 'ghost') subtitledGhosts.add(e.id)
  if (c.sub && !repeatGhost && gate(`sub:${c.sub}`, t, SUBTITLE_COOLDOWN)) {
    const { settings, pushSubtitle } = useUi.getState()
    pushSubtitle(SUBTITLES[c.sub][settings.lang])
  }
  if (ctx?.state !== 'running' || !gate(c.cue, t, COOLDOWN[c.cue] ?? DEFAULT_COOLDOWN)) return
  try {
    CUES[c.cue](ctx.currentTime)
  } catch {
    // audio must never break gameplay
  }
}

export function initAudio() {
  if (started) {
    // Repeat gestures re-resume (iOS may re-suspend).
    sync()
    return
  }
  started = true
  // Subscribe even without WebAudio so subtitles still work.
  onGameEvent(handle)
  try {
    const Ctor = window.AudioContext ?? (window as unknown as WebkitWindow).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = useUi.getState().settings.volume
    // Cheap feedback delay as a small room.
    const dly = ctx.createDelay(0.5)
    dly.delayTime.value = 0.23
    const fb = ctx.createGain()
    fb.gain.value = 0.3
    const wet = ctx.createGain()
    wet.gain.value = 0.25
    master.connect(dly)
    dly.connect(fb).connect(dly)
    dly.connect(wet).connect(ctx.destination)
    master.connect(ctx.destination)
    useUi.subscribe(sync)
    document.addEventListener('visibilitychange', sync)
    void ctx.resume().catch(() => {})
    sync()
    if (pendingArea) setDrone(pendingArea)
  } catch {
    ctx = null
    master = null
  }
}
