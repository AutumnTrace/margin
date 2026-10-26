import { useEffect } from 'react'
import { keyLabel } from '../lib/keys'
import { Icon } from './Icon'

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: 'App',
    keys: [
      ['Mod+K', 'Command palette'],
      ['Alt+N', 'New document'],
      ['Mod+O', 'Open files'],
      ['Mod+S', 'Save to disk'],
      ['Mod+\\', 'Toggle the library'],
      ['?', 'This sheet'],
    ],
  },
  {
    title: 'View',
    keys: [
      ['Alt+1', 'Write only'],
      ['Alt+2', 'Split'],
      ['Alt+3', 'Read only'],
      ['Mod+.', 'Focus mode'],
      ['Esc', 'Leave focus mode'],
    ],
  },
  {
    title: 'Formatting',
    keys: [
      ['Mod+B', 'Bold'],
      ['Mod+I', 'Italic'],
      ['Mod+E', 'Inline code'],
      ['Mod+Shift+X', 'Strikethrough'],
      ['Mod+Shift+K', 'Link'],
      ['Mod+Alt+1', 'Heading 1 (2, 3 likewise)'],
      ['Mod+Shift+7', 'Numbered list'],
      ['Mod+Shift+8', 'Bulleted list'],
      ['Mod+Shift+9', 'Task list'],
      ['Mod+F', 'Find and replace'],
    ],
  },
]

/** Every shortcut on one sheet, with the platform's own modifier names. */
export function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-[10vh]">
      <button type="button" tabIndex={-1} aria-label="Close keyboard shortcuts" onClick={onClose} className="animate-fade fixed inset-0 cursor-default bg-[rgb(0_0_0/0.35)] backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="animate-rise relative w-full max-w-[720px] rounded-[6px] border border-line-2 bg-raised shadow-[0_32px_80px_-24px_rgb(0_0_0/0.55)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <Icon name="command" className="text-accent-ink" />
          <h2 id="shortcuts-title" className="text-[15px] font-semibold">
            Keyboard shortcuts
          </h2>
          <button type="button" autoFocus onClick={onClose} className="tool ml-auto" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title} className={group.title === 'Formatting' ? 'sm:col-start-2 sm:row-span-2 sm:row-start-1' : undefined}>
              <h3 className="ui-label mb-2">{group.title}</h3>
              <dl>
                {group.keys.map(([combo, what]) => (
                  <div key={combo} className="flex items-center justify-between gap-4 border-b border-line py-[7px] text-[13px] last:border-b-0">
                    <dt className="text-ink-2">{what}</dt>
                    <dd>
                      <kbd className="kbd">{keyLabel(combo)}</kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
