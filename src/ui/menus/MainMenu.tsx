import { useEffect, useRef, useState } from 'react'
import { startGame } from '../../app/session'
import { useUi } from '../../app/store'
import { t } from '../../i18n'
import { LangThemeSwitch } from './LangThemeSwitch'

// iPhone Safari has no Fullscreen API; only the home-screen app hides its bars.
// iPadOS reports itself as a Mac, hence the touch-point check.
const iosBrowser =
  typeof navigator !== 'undefined' &&
  (/iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)) &&
  !('standalone' in navigator && navigator.standalone === true) &&
  !matchMedia('(display-mode: standalone)').matches

export function MainMenu() {
  const lang = useUi((s) => s.settings.lang)
  const hasSave = useUi((s) => s.hasSave)
  const touch = useUi((s) => s.touch)
  const set = useUi((s) => s.set)
  const [confirm, setConfirm] = useState(false)
  const keepBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (confirm) keepBtn.current?.focus()
  }, [confirm])

  return (
    <main className="menu">
      <div className="menu-inner">
        <p className="label">fig. 00 — {lang === 'cs' ? 'vstup' : 'entrance'}</p>
        <h1 className="display">The Unbuilt</h1>
        <p className="menu-tagline">{t('tagline', lang)}</p>
        {confirm ? (
          <div className="menu-actions">
            <p className="label">{t('confirmNew', lang)}</p>
            <button type="button" className="btn" data-primary onClick={() => startGame(true)}>
              {t('yes', lang)}
            </button>
            <button ref={keepBtn} type="button" className="btn" onClick={() => setConfirm(false)}>
              {t('no', lang)}
            </button>
          </div>
        ) : (
          <div className="menu-actions">
            <button type="button" className="btn" data-primary onClick={() => startGame(false)}>
              {hasSave ? t('continue', lang) : t('begin', lang)}
            </button>
            {hasSave && (
              <button type="button" className="btn" onClick={() => setConfirm(true)}>
                {t('newGame', lang)}
              </button>
            )}
            <button type="button" className="btn" onClick={() => set({ overlay: true })}>
              {t('portfolio', lang)}
            </button>
            <button type="button" className="btn" onClick={() => set({ settingsOpen: true })}>
              {t('settings', lang)}
            </button>
          </div>
        )}
        {iosBrowser && <p className="menu-install">{t('installIos', lang)}</p>}
        <p className="label menu-controls">
          {touch ? t('controlsTouch', lang) : t('controlsDesktop', lang)}
        </p>
        <LangThemeSwitch />
      </div>
      <footer className="menu-foot label">Josef Kvapil · jkvapil.cz</footer>
    </main>
  )
}
