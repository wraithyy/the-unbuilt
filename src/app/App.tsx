import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react'
import { initAudio } from '../engine/audio'
import { t } from '../i18n'
import { Hud } from '../ui/hud/Hud'
import { EndingScreen } from '../ui/menus/EndingScreen'
import { MainMenu } from '../ui/menus/MainMenu'
import { PauseMenu } from '../ui/menus/PauseMenu'
import { SettingsPanel } from '../ui/menus/SettingsPanel'
import { Overlay } from '../ui/Overlay'
import { getAttractGame, getGame, hasSave } from './session'
import { useUi } from './store'
import './app.css'

// The renderer (three + R3F) is most of the bundle; the menu is plain DOM and shows first.
const GameView = lazy(() => import('./GameView').then((m) => ({ default: m.GameView })))

const portraitQuery = '(orientation: portrait)'
const subscribePortrait = (cb: () => void) => {
  const m = matchMedia(portraitQuery)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

export function App() {
  const screen = useUi((s) => s.screen)
  const overlay = useUi((s) => s.overlay)
  const settingsOpen = useUi((s) => s.settingsOpen)
  const theme = useUi((s) => s.settings.theme)
  const lang = useUi((s) => s.settings.lang)
  const touch = useUi((s) => s.touch)
  const portrait = useSyncExternalStore(subscribePortrait, () => matchMedia(portraitQuery).matches)
  const game = getGame()

  const reducedMotion = useUi((s) => s.settings.reducedMotion)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.lang = lang
    if (reducedMotion) root.dataset.reducedMotion = ''
    else delete root.dataset.reducedMotion
  }, [theme, lang, reducedMotion])

  useEffect(() => {
    const ui = useUi.getState()
    ui.set({ hasSave: hasSave(), touch: matchMedia('(pointer: coarse)').matches })
    const onPointer = (e: PointerEvent) => {
      const isTouch = e.pointerType === 'touch'
      if (isTouch !== useUi.getState().touch) useUi.getState().set({ touch: isTouch })
    }
    const onVisibility = () => {
      if (document.hidden && useUi.getState().screen === 'playing')
        useUi.getState().setScreen('paused')
    }
    const onKey = (e: KeyboardEvent) => {
      const s = useUi.getState()
      if (
        (e.key === 'm' || e.key === 'M') &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement)
      ) {
        s.updateSettings({ muted: !s.settings.muted })
        return
      }
      if (e.key !== 'Escape') return
      if (s.overlay) s.set({ overlay: false })
      else if (s.settingsOpen) s.set({ settingsOpen: false })
      else if (s.screen === 'paused') s.set({ screen: 'playing' })
    }
    const unlockAudio = () => initAudio()
    window.addEventListener('pointerdown', onPointer, { capture: true })
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pointerdown', onPointer, { capture: true })
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const inGame = game && (screen === 'playing' || screen === 'paused')

  return (
    <div className="app">
      <Suspense fallback={null}>
        {inGame && <GameView game={game} />}
        {screen === 'menu' && <GameView game={getAttractGame()} attract />}
      </Suspense>
      {screen === 'playing' && !overlay && <Hud />}
      {screen === 'menu' && <MainMenu />}
      {screen === 'paused' && !overlay && !settingsOpen && <PauseMenu />}
      {screen === 'ending' && <EndingScreen />}
      {settingsOpen && <SettingsPanel />}
      {overlay && <Overlay />}
      {inGame && touch && portrait && screen === 'playing' && (
        <div className="rotate-hint label" role="status">
          {t('rotate', lang)}
        </div>
      )}
      <Notice />
    </div>
  )
}

function Notice() {
  const notice = useUi((s) => s.notice)
  const set = useUi((s) => s.set)
  if (!notice) return null
  return (
    <div className="notice label" role="alert">
      {notice}
      <button
        type="button"
        className="btn-ghost"
        aria-label={t('close', useUi.getState().settings.lang)}
        onClick={() => set({ notice: null })}
      >
        ×
      </button>
    </div>
  )
}
