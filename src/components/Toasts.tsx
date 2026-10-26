import { useToasts } from '../store'
import { Icon } from './Icon'

export function Toasts() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-rise pointer-events-auto flex max-w-[min(520px,calc(100vw-32px))] items-center gap-3 rounded-[4px] bg-ink py-2 pr-2 pl-3.5 text-[13px] text-bg shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)]"
        >
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
              className="cursor-pointer rounded-[3px] px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-accent uppercase hover:bg-white/10"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="grid size-6 cursor-pointer place-items-center rounded-[3px] opacity-60 hover:opacity-100">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
