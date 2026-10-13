import { useUi } from '../../app/store'
import { input } from '../../engine/input/state'
import { t } from '../../i18n'
import { TouchControls } from '../controls/TouchControls'
import { MuteButton } from '../MuteButton'
import { Subtitles } from './Subtitles'
import './hud.css'

export function Hud() {
  const prompt = useUi((s) => s.prompt)
  const lang = useUi((s) => s.settings.lang)
  const touch = useUi((s) => s.touch)
  const locked = useUi((s) => s.pointerLocked)
  const progress = useUi((s) => s.progress)
  const fade = useUi((s) => s.fade)
  const eyesClosed = useUi((s) => s.eyesClosed)
  const eyeHint = useUi((s) => s.eyeHint)
  const eyesToggle = useUi((s) => s.settings.eyesToggle)
  const discovery = useUi((s) => s.discovery)
  const set = useUi((s) => s.set)
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
          <MuteButton />
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
      {eyesClosed && (
        <div className="eyes-closed label" role="status">
          {t('eyesClosed', lang)}
        </div>
      )}
      <button
        type="button"
        className="eye-btn"
        data-closed={eyesClosed ? '' : undefined}
        data-hint={eyeHint ? '' : undefined}
        aria-label={t('closeEyes', lang)}
        aria-pressed={eyesClosed}
        onPointerDown={(e) => {
          e.stopPropagation()
          // Touch holds by default; mouse and the toggle setting flip.
          if (e.pointerType === 'touch' && !eyesToggle) input.eyes = true
          else input.eyes = !input.eyes
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'touch' && !eyesToggle) input.eyes = false
        }}
        onPointerCancel={() => {
          if (!eyesToggle) input.eyes = false
        }}
        onClick={(e) => {
          if (e.detail === 0) input.eyes = !input.eyes
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden width="26" height="26">
          {eyesClosed ? (
            <path
              d="M3 12c2.5 3 5.5 4.5 9 4.5s6.5-1.5 9-4.5M7 15.5 5.5 18M12 16.5V19M17 15.5l1.5 2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path
                d="M3 12c2.5-4 5.5-6 9-6s6.5 2 9 6c-2.5 4-5.5 6-9 6s-6.5-2-9-6Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </>
          )}
        </svg>
      </button>
      {discovery && (
        <div className="discovery" role="status">
          <span className="label">{lang === 'cs' ? 'zapsáno do archivu' : 'recorded'}</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              document.exitPointerLock?.()
              set({ overlay: true, overlaySection: discovery, discovery: null })
            }}
          >
            {t('portfolio', lang)} — {discovery} ↗
          </button>
        </div>
      )}
      <Subtitles />
      <div className="fade" style={{ opacity: fade }} aria-hidden />
    </div>
  )
}
