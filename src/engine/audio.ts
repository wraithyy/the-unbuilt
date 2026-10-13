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
import { createMusic } from './music'

// Everything is synthesized; no assets. Failures are swallowed so the game and
// subtitles keep working without sound.

interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext
}

let ctx: AudioContext | null = null
/** Sound effects bus. */
let master: GainNode | null = null
/** Overall volume, after effects, music and the shared reverb. */
let out: GainNode | null = null
let musicGain: GainNode | null = null
let muffle: BiquadFilterNode | null = null
let music: ReturnType<typeof createMusic> | null = null
let started = false
let areaId = ''
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
  // Soft paper-and-concrete footfall; the random pitch keeps steps from sounding looped.
  step: (t) => {
    noise(t, 0.07, 0.022, 700 + Math.random() * 500, 'bandpass', 0.004)
    tone(70 + Math.random() * 12, t, 0.09, 0.03, { to: 45, attack: 0.004 })
  },
  land: (t) => {
    noise(t, 0.18, 0.06, 500, 'lowpass', 0.003)
    tone(60, t, 0.25, 0.09, { to: 35, attack: 0.004 })
  },
  eyesOpen: (t) => noise(t, 0.25, 0.03, 900, 'lowpass', 0.04),
}

/** Generated room: decaying stereo noise, long enough for the pads to bloom. */
function impulse(c: AudioContext, seconds: number) {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  }
  return buf
}

/** Menu and ending have their own score; in play the area decides. */
function themeFor(screen: string) {
  if (screen === 'menu') return 'atrium'
  if (screen === 'ending') return 'ending'
  return areaId
}

function sync() {
  if (!ctx || !out || !musicGain || !muffle) return
  const { screen, settings, overlay, settingsOpen, eyesClosed } = useUi.getState()
  const t = ctx.currentTime
  out.gain.setTargetAtTime(settings.muted ? 0 : Math.max(0, Math.min(1, settings.volume)), t, 0.05)
  // Menus duck the score instead of stopping it, so it never restarts from silence.
  const blind = eyesClosed && screen === 'playing'
  const duck = screen === 'paused' || overlay || settingsOpen ? 0.35 : blind ? 0.7 : 1
  musicGain.gain.setTargetAtTime(Math.max(0, Math.min(1, settings.music)) * duck, t, 0.3)
  // Closed eyes hear the world through a wall.
  muffle.frequency.setTargetAtTime(blind ? 420 : 18000, t, 0.12)
  music?.setTheme(themeFor(screen))
  const active = !document.hidden
  if (active && ctx.state !== 'running') void ctx.resume().catch(() => {})
  else if (!active && ctx.state === 'running') void ctx.suspend().catch(() => {})
}

function handle(e: Parameters<typeof cueFor>[0]) {
  if (e.name === 'area') {
    areaId = e.id
    sync()
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
    const c = new Ctor()
    ctx = c
    out = c.createGain()
    out.gain.value = useUi.getState().settings.volume
    // Safety net: stacked pads, bells and effects never clip on small speakers.
    const limiter = c.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.ratio.value = 12
    limiter.attack.value = 0.003
    limiter.release.value = 0.25
    out.connect(limiter).connect(c.destination)
    const reverb = c.createConvolver()
    reverb.buffer = impulse(c, 3.5)
    reverb.connect(out)
    const send = (from: AudioNode, amount: number) => {
      const g = c.createGain()
      g.gain.value = amount
      from.connect(g).connect(reverb)
    }
    master = c.createGain()
    // Cue envelopes were tuned quiet; the bus brings them level with the score.
    master.gain.value = 2.5
    master.connect(out)
    send(master, 0.3)
    musicGain = c.createGain()
    musicGain.gain.value = 0
    muffle = c.createBiquadFilter()
    muffle.type = 'lowpass'
    muffle.frequency.value = 18000
    musicGain.connect(muffle)
    const dry = c.createGain()
    dry.gain.value = 0.55
    muffle.connect(dry).connect(out)
    send(muffle, 0.9)
    music = createMusic(c, musicGain)
    useUi.subscribe(sync)
    document.addEventListener('visibilitychange', sync)
    void c.resume().catch(() => {})
    sync()
  } catch {
    ctx = null
    master = null
  }
}
