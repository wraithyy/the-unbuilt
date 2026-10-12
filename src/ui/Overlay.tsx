import { type ReactNode, useEffect, useRef } from 'react'
import { useUi } from '../app/store'
import { t } from '../i18n'
import { type Lang, links, portfolio } from '../portfolio/data'
import { useDialog } from './dialog'
import './overlay.css'

const UI: Record<
  Lang,
  { nav: string; sections: string[]; cv: string; lang: string; email: string }
> = {
  en: {
    nav: 'Sections',
    sections: ['About', 'Capabilities', 'Stack', 'Experience', 'Contact'],
    cv: 'CV (PDF)',
    lang: 'Language',
    email: 'Email',
  },
  cs: {
    nav: 'Sekce',
    sections: ['O mně', 'Schopnosti', 'Stack', 'Praxe', 'Kontakt'],
    cv: 'CV (PDF)',
    lang: 'Jazyk',
    email: 'E-mail',
  },
}
const IDS = ['about', 'capabilities', 'stack', 'experience', 'contact']

function Ext({ href, children }: { href: string; children: ReactNode }) {
  const mail = href.startsWith('mailto:')
  return (
    <a href={href} {...(mail ? {} : { target: '_blank', rel: 'noreferrer' })}>
      {children}
      {!mail && <span aria-hidden="true"> ↗</span>}
      {!mail && <span className="sr-only"> (new tab)</span>}
    </a>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  const found = useUi((s) => s.discovered.includes(IDS[n] ?? ''))
  const lang = useUi((s) => s.settings.lang)
  return (
    <section id={`ov-${IDS[n]}`} className="ov-sec" aria-labelledby={`ov-h-${IDS[n]}`}>
      <p className="label" id={`ov-h-${IDS[n]}`}>
        {String(n + 1).padStart(2, '0')} — {title}
        {found && (
          <span className="ov-found">
            {' · '}
            {lang === 'cs' ? 'nalezeno ve světě' : 'found in the world'}
          </span>
        )}
      </p>
      {children}
    </section>
  )
}

export function Overlay() {
  const lang = useUi((s) => s.settings.lang)
  const p = portfolio[lang]
  const ui = UI[lang]
  const root = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  const trap = useDialog(root, closeBtn)

  useEffect(() => {
    const section = useUi.getState().overlaySection
    if (!section) return
    document.getElementById(`ov-${section}`)?.scrollIntoView({ block: 'start' })
    useUi.getState().set({ overlaySection: null })
  }, [])

  const go = (id: string) => {
    const el = document.getElementById(`ov-${id}`)
    el?.scrollIntoView({
      behavior: useUi.getState().settings.reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <div
      ref={root}
      className="ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ov-title"
      lang={lang}
      onKeyDown={trap}
    >
      <header className="ov-bar">
        <nav aria-label={ui.nav} className="ov-nav">
          {IDS.map((id, i) => (
            <button key={id} type="button" className="ov-link" onClick={() => go(id)}>
              <span className="label">{String(i + 1).padStart(2, '0')}</span> {ui.sections[i]}
            </button>
          ))}
        </nav>
        <div className="ov-tools">
          <fieldset className="ov-lang">
            <legend className="sr-only">{ui.lang}</legend>
            {(['en', 'cs'] as const).map((l) => (
              <button
                key={l}
                type="button"
                className="btn-ghost"
                lang={l}
                aria-pressed={l === lang}
                onClick={() => useUi.getState().updateSettings({ lang: l })}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </fieldset>
          <button
            ref={closeBtn}
            type="button"
            className="btn-ghost ov-close"
            aria-label={t('close', lang)}
            onClick={() => useUi.getState().set({ overlay: false })}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </header>

      <div className="ov-scroll">
        <main className="ov-main">
          <Section n={0} title={ui.sections[0] ?? ''}>
            <h1 className="display" id="ov-title">
              {p.name}
            </h1>
            <p className="label">{p.role}</p>
            <p className="ov-lede">{p.lede}</p>
            <p className="label">{p.summary}</p>
            <h2 className="title">{p.aboutTitle}</h2>
            <p>{p.about}</p>
            <p>
              <strong>{p.aboutRule}</strong>
            </p>
          </Section>

          <Section n={1} title={ui.sections[1] ?? ''}>
            <h2 className="title">{p.capabilitiesTitle}</h2>
            <ol className="ov-list">
              {p.capabilities.map((c) => (
                <li key={c.title}>
                  <h3 className="ov-h3">{c.title}</h3>
                  <p>
                    <span className="label">delivered — </span>
                    {c.delivered}
                  </p>
                </li>
              ))}
            </ol>
            <p className="label">{p.capabilitiesNote}</p>
          </Section>

          <Section n={2} title={ui.sections[2] ?? ''}>
            <dl className="ov-stack">
              {p.stack.map((s) => (
                <div key={s.label}>
                  <dt className="label">{s.label}</dt>
                  <dd>{s.items}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section n={3} title={ui.sections[3] ?? ''}>
            <h2 className="title">{p.historyTitle}</h2>
            <ul className="ov-list">
              {p.history.map((j) => (
                <li key={j.years + j.company} className="ov-job">
                  <span className="label">{j.years}</span>
                  <div>
                    <h3 className="ov-h3">{j.company}</h3>
                    <p>{j.role}</p>
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="ov-h3">{p.recordTitle}</h3>
            <p>{p.record}</p>
          </Section>

          <Section n={4} title={ui.sections[4] ?? ''}>
            <h2 className="title">{p.contactTitle}</h2>
            <p>{p.contact}</p>
            <ul className="ov-contact">
              <li>
                <span className="label">GitHub</span>{' '}
                <Ext href={links.github.href}>{links.github.label}</Ext>
              </li>
              <li>
                <span className="label">{ui.email}</span>{' '}
                <Ext href={links.email.href}>{links.email.label}</Ext>
              </li>
              <li>
                <span className="label">LinkedIn</span>{' '}
                <Ext href={links.linkedin.href}>{links.linkedin.label}</Ext>
              </li>
              <li>
                <span className="label">CV</span> <Ext href={links.cv.href}>{ui.cv}</Ext>
              </li>
            </ul>
            <p className="label">{p.availability}</p>
            <p>
              <Ext href={links.site.href}>{links.site.label}</Ext>
            </p>
          </Section>
        </main>
      </div>
    </div>
  )
}
