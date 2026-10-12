import { useUi } from '../../app/store'

export function Subtitles() {
  const subs = useUi((s) => s.subtitles)
  return (
    <div className="subtitles" aria-live="polite">
      {subs.map((s) => (
        <p key={s.id} className="label">
          [{s.text}]
        </p>
      ))}
    </div>
  )
}
