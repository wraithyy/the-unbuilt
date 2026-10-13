import { useUi } from '../app/store'
import { t } from '../i18n'

export function MuteButton() {
  const muted = useUi((s) => s.settings.muted)
  const lang = useUi((s) => s.settings.lang)
  const update = useUi((s) => s.updateSettings)
  return (
    <button
      type="button"
      className="btn-ghost"
      aria-label={t('mute', lang)}
      aria-pressed={muted}
      title={`${t('mute', lang)} (M)`}
      onClick={() => update({ muted: !muted })}
    >
      <svg viewBox="0 0 24 24" aria-hidden width="18" height="18">
        <path d="M4 9h4l5-4v14l-5-4H4Z" fill="currentColor" />
        {muted ? (
          <path d="m16 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.8" fill="none" />
        ) : (
          <path
            d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  )
}
