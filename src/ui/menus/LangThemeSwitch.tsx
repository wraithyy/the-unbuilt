import { useUi } from '../../app/store'
import { t } from '../../i18n'
import { MuteButton } from '../MuteButton'

export function LangThemeSwitch() {
  const settings = useUi((s) => s.settings)
  const update = useUi((s) => s.updateSettings)
  return (
    <div className="switches">
      <MuteButton />
      <button
        type="button"
        className="btn-ghost"
        onClick={() => update({ lang: settings.lang === 'cs' ? 'en' : 'cs' })}
        lang={settings.lang === 'cs' ? 'en' : 'cs'}
      >
        {settings.lang === 'cs' ? 'English' : 'Česky'}
      </button>
      <button
        type="button"
        className="btn-ghost"
        title={t('theme', settings.lang)}
        onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      >
        {settings.theme === 'dark' ? t('light', settings.lang) : t('dark', settings.lang)}
      </button>
    </div>
  )
}
