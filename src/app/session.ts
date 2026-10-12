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
  useUi.getState().setScreen('playing')
  if (new URLSearchParams(location.search).has('debug')) {
    Object.assign(window, { __unbuilt: g })
  }
  return g
}
