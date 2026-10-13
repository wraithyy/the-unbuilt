import { useUi } from '../../app/store'
import { t } from '../../i18n'
import { links, portfolio } from '../../portfolio/data'

export function EndingScreen() {
  const lang = useUi((s) => s.settings.lang)
  const set = useUi((s) => s.set)
  const p = portfolio[lang]
  return (
    <main className="menu ending">
      <div className="menu-inner">
        <p className="label">fig. ∞ — {lang === 'cs' ? 'nepostaveno' : 'unbuilt'}</p>
        <h1 className="display">{p.name}</h1>
        <p className="menu-tagline">{p.role}</p>
        <p>{p.lede}</p>
        <div className="menu-actions">
          <button type="button" className="btn" data-primary onClick={() => set({ overlay: true })}>
            {t('portfolio', lang)}
          </button>
          <a className="btn" href={links.site.href} target="_blank" rel="noreferrer">
            {links.site.label} ↗
          </a>
          <a className="btn" href={links.github.href} target="_blank" rel="noreferrer">
            GitHub {links.github.label} ↗
          </a>
          <a className="btn" href={links.email.href}>
            {links.email.label} ↗
          </a>
          <button
            type="button"
            className="btn"
            onClick={() => set({ screen: 'menu', hasSave: true })}
          >
            {t('mainMenu', lang)}
          </button>
        </div>
      </div>
    </main>
  )
}
