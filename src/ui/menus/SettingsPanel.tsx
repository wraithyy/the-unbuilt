import { useRef } from 'react'
import { useUi } from '../../app/store'
import { t } from '../../i18n'
import { useDialog } from '../dialog'
import { LangThemeSwitch } from './LangThemeSwitch'

export function SettingsPanel() {
  const root = useRef<HTMLDivElement>(null)
  const backBtn = useRef<HTMLButtonElement>(null)
  const trap = useDialog(root, backBtn)
  const s = useUi((st) => st.settings)
  const update = useUi((st) => st.updateSettings)
  const close = () => useUi.getState().set({ settingsOpen: false })
  const lang = s.lang

  return (
    <div
      ref={root}
      onKeyDown={trap}
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="modal-card">
        <h2 id="settings-title" className="title">
          {t('settings', lang)}
        </h2>
        <div className="settings">
          <label>
            <span>{t('sensitivity', lang)}</span>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={s.sensitivity}
              onChange={(e) => update({ sensitivity: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>{t('joystick', lang)}</span>
            <input
              type="range"
              min={0.7}
              max={1.5}
              step={0.1}
              value={s.joystickSize}
              onChange={(e) => update({ joystickSize: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>{t('volume', lang)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              onChange={(e) => update({ volume: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>{t('music', lang)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.music}
              onChange={(e) => update({ music: Number(e.target.value) })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.invertY}
              onChange={(e) => update({ invertY: e.target.checked })}
            />
            <span>{t('invertY', lang)}</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.reducedMotion}
              onChange={(e) => update({ reducedMotion: e.target.checked })}
            />
            <span>{t('reducedMotion', lang)}</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.eyesToggle}
              onChange={(e) => update({ eyesToggle: e.target.checked })}
            />
            <span>{t('eyesToggle', lang)}</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={s.subtitles}
              onChange={(e) => update({ subtitles: e.target.checked })}
            />
            <span>{t('subtitles', lang)}</span>
          </label>
          <fieldset>
            <legend>{t('quality', lang)}</legend>
            {(['low', 'medium', 'high'] as const).map((q) => (
              <label key={q} className="check">
                <input
                  type="radio"
                  name="quality"
                  checked={s.quality === q}
                  onChange={() => update({ quality: q })}
                />
                <span>{t(q, lang)}</span>
              </label>
            ))}
          </fieldset>
          <LangThemeSwitch />
        </div>
        <div className="menu-actions">
          <button ref={backBtn} type="button" className="btn" data-primary onClick={close}>
            {t('back', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
