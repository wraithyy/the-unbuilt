import { create } from 'zustand'
import type { Prompt } from '../gameplay/game'
import { detectLang } from '../i18n'
import type { Lang } from '../portfolio/data'

// UI-facing state only. The simulation never reads React state per frame; it reads
// `useUi.getState()` where it needs settings.

export type Screen = 'menu' | 'playing' | 'paused' | 'ending'
export type Quality = 'low' | 'medium' | 'high'

export interface Settings {
  lang: Lang
  sensitivity: number
  invertY: boolean
  reducedMotion: boolean
  quality: Quality
  joystickSize: number
  subtitles: boolean
  volume: number
  theme: 'light' | 'dark'
  /** Close-eyes control toggles instead of being held (motor accessibility). */
  eyesToggle: boolean
}

const SETTINGS_KEY = 'unbuilt.settings'

function defaultSettings(): Settings {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const dark =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  return {
    lang: detectLang(),
    sensitivity: 1,
    invertY: false,
    reducedMotion: reduce,
    quality: coarse ? 'low' : 'medium',
    joystickSize: 1,
    subtitles: true,
    volume: 0.7,
    theme: dark ? 'dark' : 'light',
    eyesToggle: false,
  }
}

export function loadSettings(): Settings {
  const base = defaultSettings()
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return base
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return base
    const r = parsed as Record<string, unknown>
    const num = (v: unknown, min: number, max: number, d: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d
    const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
    const pick = <T extends string>(v: unknown, options: readonly T[], d: T): T =>
      options.find((o) => o === v) ?? d
    const out: Settings = {
      lang: pick(r.lang, ['en', 'cs'], base.lang),
      sensitivity: num(r.sensitivity, 0.3, 2.5, base.sensitivity),
      invertY: bool(r.invertY, base.invertY),
      reducedMotion: bool(r.reducedMotion, base.reducedMotion),
      quality: pick(r.quality, ['low', 'medium', 'high'], base.quality),
      joystickSize: num(r.joystickSize, 0.7, 1.5, base.joystickSize),
      subtitles: bool(r.subtitles, base.subtitles),
      volume: num(r.volume, 0, 1, base.volume),
      theme: pick(r.theme, ['light', 'dark'], base.theme),
      eyesToggle: bool(r.eyesToggle, base.eyesToggle),
    }
    return out
  } catch {
    return base
  }
}

export interface Subtitle {
  id: number
  text: string
}

interface UiState {
  screen: Screen
  overlay: boolean
  settingsOpen: boolean
  settings: Settings
  prompt: Prompt
  subtitles: Subtitle[]
  notice: string | null
  hasSave: boolean
  progress: number
  touch: boolean
  pointerLocked: boolean
  fade: number
  eyesClosed: boolean
  /** Pulse the eye control until the player has discovered it. */
  eyeHint: boolean
  /** Portfolio sections the player has read in the world. */
  discovered: string[]
  /** Section just discovered (toast). */
  discovery: string | null
  /** Section the overlay should open at. */
  overlaySection: string | null
  setScreen: (s: Screen) => void
  setOverlay: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  updateSettings: (patch: Partial<Settings>) => void
  setPrompt: (p: Prompt) => void
  pushSubtitle: (text: string) => void
  setNotice: (n: string | null) => void
  set: (patch: Partial<UiState>) => void
}

let subId = 0

export const useUi = create<UiState>((set, get) => ({
  screen: 'menu',
  overlay: false,
  settingsOpen: false,
  settings: loadSettings(),
  prompt: null,
  subtitles: [],
  notice: null,
  hasSave: false,
  progress: 0,
  touch: false,
  pointerLocked: false,
  fade: 0,
  eyesClosed: false,
  eyeHint: false,
  discovered: [],
  discovery: null,
  overlaySection: null,
  setScreen: (screen) => set({ screen }),
  setOverlay: (overlay) => set({ overlay }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Settings just won't persist.
    }
  },
  setPrompt: (prompt) => {
    if (get().prompt !== prompt) set({ prompt })
  },
  pushSubtitle: (text) => {
    if (!get().settings.subtitles) return
    const id = ++subId
    set({ subtitles: [...get().subtitles.slice(-2), { id, text }] })
    setTimeout(() => set({ subtitles: get().subtitles.filter((s) => s.id !== id) }), 3200)
  },
  setNotice: (notice) => set({ notice }),
  set: (patch) => set(patch),
}))
