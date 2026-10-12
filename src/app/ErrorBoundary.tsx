import { Component, type ReactNode } from 'react'
import { links } from '../portfolio/data'

// Last resort: never leave a blank page. Offers a clean restart and the portfolio link.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="menu">
        <div className="menu-inner">
          <p className="label">fig. — error</p>
          <h1 className="title">Something in the architecture gave way.</h1>
          <div className="menu-actions">
            <button
              type="button"
              className="btn"
              data-primary
              onClick={() => {
                try {
                  localStorage.removeItem('unbuilt.settings')
                } catch {
                  // ignore
                }
                location.reload()
              }}
            >
              Restart
            </button>
            <a className="btn" href={links.site.href}>
              {links.site.label} ↗
            </a>
          </div>
        </div>
      </main>
    )
  }
}
