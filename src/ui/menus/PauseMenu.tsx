import { useRef, useState } from 'react'
import { getGame } from '../../app/session'
import { useUi } from '../../app/store'
import { t, worldText } from '../../i18n'
import { useDialog } from '../dialog'

const hintProgress = new Map<string, number>()

export function PauseMenu() {
  const root = useRef<HTMLDivElement>(null)
  const trap = useDialog(root)
  const lang = useUi((s) => s.settings.lang)
  const set = useUi((s) => s.set)
  const [hint, setHint] = useState<string | null>(null)
  const game = getGame()

  const resume = () => set({ screen: 'playing' })

  const nextHint = () => {
    const area = game?.getArea()
    const hints = area?.hints ?? []
    if (!area || hints.length === 0) return setHint(t('noHint', lang))
    const i = hintProgress.get(area.id) ?? 0
    setHint(worldText(hints[Math.min(i, hints.length - 1)], lang))
    hintProgress.set(area.id, i + 1)
  }

  return (
    <div
      ref={root}
      onKeyDown={trap}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="modal-card">
        <p className="label">fig. {t('paused', lang).toLowerCase()}</p>
        <h2 id="pause-title" className="title">
          {t('paused', lang)}
        </h2>
        {hint && (
          <p className="hint" role="status">
            {hint}
          </p>
        )}
        <div className="menu-actions">
          <button type="button" className="btn" data-primary data-autofocus onClick={resume}>
            {t('resume', lang)}
          </button>
          <button type="button" className="btn" onClick={nextHint}>
            {t('hint', lang)}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              game?.resetArea()
              resume()
            }}
          >
            {t('resetPuzzle', lang)}
          </button>
          <button type="button" className="btn" onClick={() => set({ settingsOpen: true })}>
            {t('settings', lang)}
          </button>
          <button type="button" className="btn" onClick={() => set({ overlay: true })}>
            {t('portfolio', lang)}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => set({ screen: 'menu', hasSave: true })}
          >
            {t('mainMenu', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
