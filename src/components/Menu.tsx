import clsx from 'clsx'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export interface MenuItem {
  label: string
  icon?: IconName
  hint?: string
  run: () => void
}

/** A small dropdown: opens on click, closes on outside click or Escape, arrow keys move focus. */
export function Menu({ label, trigger, items, align = 'right' }: { label: string; trigger: ReactNode; items: MenuItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', close)
    root.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  function onKeyDown(e: React.KeyboardEvent) {
    const buttons = [...(root.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
    const at = buttons.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      setOpen(false)
      root.current?.querySelector<HTMLElement>('button')?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      buttons[(at + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }
  }

  return (
    <div ref={root} className="relative">
      <button type="button" className="tool gap-1.5" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          tabIndex={-1}
          aria-label={label}
          onKeyDown={onKeyDown}
          className={clsx(
            'animate-rise absolute top-[calc(100%+6px)] z-40 min-w-[220px] rounded-[4px] border border-line-2 bg-raised p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[3px] px-2.5 py-[7px] text-left text-[13px] text-ink-2 outline-none hover:bg-line hover:text-ink focus:bg-line focus:text-ink"
              onClick={() => {
                setOpen(false)
                item.run()
              }}
            >
              {item.icon && <Icon name={item.icon} size={15} />}
              <span className="flex-1">{item.label}</span>
              {item.hint && <span className="font-mono text-[10.5px] text-ink-3">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
