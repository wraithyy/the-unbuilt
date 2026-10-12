import { useUi } from '../../app/store'
import { t } from '../../i18n'
import { TouchControls } from '../controls/TouchControls'
import { Subtitles } from './Subtitles'
import './hud.css'

export function Hud() {
  const prompt = useUi((s) => s.prompt)
  const lang = useUi((s) => s.settings.lang)
  const touch = useUi((s) => s.touch)
  const locked = useUi((s) => s.pointerLocked)
  const progress = useUi((s) => s.progress)
  const fade = useUi((s) => s.fade)
  const setScreen = useUi((s) => s.setScreen)
  const setOverlay = useUi((s) => s.setOverlay)

  return (
    <div className="hud">
      {touch && <TouchControls />}
      <div className="reticle" data-state={prompt ?? 'none'} aria-hidden />
      {prompt && (
        <div className="prompt label" role="status">
          {touch ? t(prompt, lang) : `${t(prompt, lang)} · E`}
        </div>
      )}
      {!touch && !locked && (
        <div className="click-to-look label" aria-hidden>
          {t('clickToLook', lang)}
        </div>
      )}
      <div className="hud-top">
        <span className="label">
          <span aria-hidden>
            {'■'.repeat(progress)}
            {'□'.repeat(3 - progress)}
          </span>
          <span className="sr-only">{`${progress} / 3 ${t('progress', lang)}`}</span>
        </span>
        <div className="hud-actions">
          <button
            type="button"
            className="btn-ghost"
            aria-label={t('portfolio', lang)}
            onClick={() => {
              document.exitPointerLock?.()
              setOverlay(true)
            }}
          >
            JK
          </button>
          <button
            type="button"
            className="btn-ghost"
            aria-label={t('pause', lang)}
            onClick={() => {
              document.exitPointerLock?.()
              setScreen('paused')
            }}
          >
            II
          </button>
        </div>
      </div>
      <Subtitles />
      <div className="fade" style={{ opacity: fade }} aria-hidden />
    </div>
  )
}
