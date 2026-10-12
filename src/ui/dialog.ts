import { type KeyboardEvent, type RefObject, useCallback, useEffect } from 'react'

// Shared modal behaviour: initial focus, Tab trap, focus restore on close.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** Opener may have unmounted (menus swap while a dialog is open); pick a sensible target. */
function restore(opener: Element | null) {
  if (opener instanceof HTMLElement && opener.isConnected) {
    opener.focus()
    return
  }
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(
      '[role="dialog"] [data-autofocus], [role="dialog"] button, main [data-primary], .hud button',
    )
    target?.focus()
  })
}

export function useDialog(
  root: RefObject<HTMLElement | null>,
  initial?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const opener = document.activeElement
    const first = initial?.current ?? root.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    return () => restore(opener)
  }, [root, initial])

  return useCallback(
    (e: KeyboardEvent) => {
      const el = root.current
      if (e.key !== 'Tab' || !el) return
      const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = f[0]
      const last = f[f.length - 1]
      if (!first || !last) return
      const cur = document.activeElement
      if (e.shiftKey && (cur === first || !el.contains(cur))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (cur === last || !el.contains(cur))) {
        e.preventDefault()
        first.focus()
      }
    },
    [root],
  )
}
