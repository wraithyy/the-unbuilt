import { resetInput } from '../engine/input/state'
import { clearSave, loadSave, writeSave } from '../engine/save'
import { Game, type Game as GameT } from '../gameplay/game'
import { SIGILS } from '../gameplay/progression'
import { t } from '../i18n'
import { areas } from '../world/areas'
import { useUi } from './store'

// Owns the single Game instance and wires sim events to persistence and UI.

let game: GameT | null = null
const listeners = new Set<(e: Parameters<Parameters<GameT['on']>[0]>[0]) => void>()

let attract: GameT | null = null

/** A throwaway world for the menu backdrop; never saved. */
export function getAttractGame() {
  if (!attract) {
    attract = new Game(areas)
    attract.warp([0, 0.85, -18], 0)
  }
  return attract
}

export function getGame() {
  return game
}

/** Lets other modules (audio, renderer) observe events of whichever game is running. */
export function onGameEvent(fn: (e: Parameters<Parameters<GameT['on']>[0]>[0]) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Checks storage at boot; an unreadable save is dropped and the player is told. */
export function hasSave() {
  const r = loadSave()
  if (r.status === 'corrupt') {
    const ui = useUi.getState()
    ui.setNotice(t('corruptSave', ui.settings.lang))
  }
  return r.status === 'ok'
}

export function startGame(fresh: boolean) {
  const ui = useUi.getState()
  if (fresh) clearSave()
  const loaded = loadSave()
  if (loaded.status === 'corrupt') ui.setNotice(t('corruptSave', ui.settings.lang))
  const save = loaded.status === 'ok' ? loaded.save : undefined
  game = new Game(areas, save, { reducedMotion: ui.settings.reducedMotion })
  const g = game
  const persist = () => writeSave(g.snapshot())
  g.on((e) => {
    if (e.name === 'checkpoint' || (e.name === 'flag' && e.persist)) persist()
    if (e.name === 'flag')
      useUi.getState().set({ progress: SIGILS.filter((s) => g.flags.all.has(s)).length })
    if (e.name === 'ending') {
      persist()
      document.exitPointerLock?.()
      useUi.getState().setScreen('ending')
    }
    if (e.name === 'custom' && e.id.startsWith('read:')) {
      const section = e.id.slice(5)
      const ui = useUi.getState()
      ui.set({ discovered: [...new Set([...ui.discovered, section])], discovery: section })
      setTimeout(() => {
        if (useUi.getState().discovery === section) useUi.getState().set({ discovery: null })
      }, 7000)
    }
    if (e.name === 'eyes') useUi.getState().set({ eyesClosed: e.closed, eyeHint: false })
    if (e.name === 'flag' && e.flag === 'arrival:door') useUi.getState().set({ eyeHint: false })
    if (e.name === 'gravity' && e.instant) {
      useUi.getState().set({ fade: 1 })
      setTimeout(() => useUi.getState().set({ fade: 0 }), 200)
    }
    for (const l of listeners) l(e)
  })
  persist()
  resetInput()
  // The starting area never "changes", so announce it for the ambience.
  for (const l of listeners) l({ name: 'area', id: g.area })
  useUi.getState().set({
    progress: SIGILS.filter((s) => g.flags.all.has(s)).length,
    hasSave: true,
  })
  const discovered = [...g.flags.persistent]
    .filter((f) => f.startsWith('read:mon-'))
    .map((f) => f.slice('read:mon-'.length))
  useUi.getState().set({ eyesClosed: false, eyeHint: false, discovered, discovery: null })
  // Nudge toward the eye control if the first room has the player stuck for a while.
  setTimeout(() => {
    if (getGame() === g && g.area === 'arrival' && !g.flags.all.has('arrival:door'))
      useUi.getState().set({ eyeHint: true })
  }, 25_000)
  useUi.getState().setScreen('playing')
  if (new URLSearchParams(location.search).has('debug')) {
    Object.assign(window, { __unbuilt: g })
  }
  return g
}
