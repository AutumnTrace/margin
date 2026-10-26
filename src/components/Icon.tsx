import clsx from 'clsx'

/** 24×24 outline icons, drawn with a 1.6 stroke to sit next to IBM Plex. */
const PATHS = {
  sidebar: 'M4 4h16v16H4zM9.5 4v16',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  file: 'M14 3H6v18h12V7zM14 3v4h4',
  files: 'M15 3H8v14h11V7zM15 3v4h4M5 7v14h11',
  outline: 'M4 6h16M8 12h12M12 18h8',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  share: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  monitor: 'M3 4h18v13H3zM8 21h8M12 17v4',
  command: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
  bold: 'M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z',
  italic: 'M14 4h-4M14 20h-4M15 4 9 20',
  strike: 'M5 12h14M16 6.5C15.3 5 13.8 4 12 4c-2.5 0-4 1.4-4 3.2 0 1.3.8 2.2 2 2.8M8 17.5c.7 1.5 2.2 2.5 4 2.5 2.5 0 4-1.4 4-3.2 0-.6-.2-1.2-.5-1.8',
  code: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  quote: 'M5 11h4v6H5v-6zm0 0c0-3 1-5 4-6M15 11h4v6h-4v-6zm0 0c0-3 1-5 4-6',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  ordered: 'M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M3.5 14.5c.3-.6.9-1 1.5-1 .8 0 1.5.6 1.5 1.4 0 1.1-3 2.4-3 3.1h3',
  task: 'M4 5h5v5H4zM5.5 7.5l1 1 2-2M12 7.5h8M4 14h5v5H4zM12 16.5h8',
  table: 'M4 4h16v16H4zM4 10h16M4 15h16M10 4v16',
  rule: 'M4 12h16M4 7h.01M4 17h.01M20 7h.01M20 17h.01',
  sigma: 'M18 5H6l6 7-6 7h12',
  diagram: 'M3 4h7v6H3zM14 14h7v6h-7zM6.5 10v4a3 3 0 0 0 3 3H14',
  heading: 'M6 4v16M18 4v16M6 12h12',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  split: 'M4 4h16v16H4zM12 4v16',
  focus: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  sync: 'M7 4v16M17 4v16M4 8l3-4 3 4M14 16l3 4 3-4',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  type: 'M5 7V5h14v2M12 5v14M9 19h6',
  arrow: 'M7 17 17 7M8 7h9v9',
  github: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.3-2.5-1-3.5.3-1.2.3-2.4 0-3.5 0 0-1 0-3 1.5a10.4 10.4 0 0 0-8 0C6 2 5 2 5 2c-.3 1.2-.3 2.4 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.4.5-.7 1-.9 1.7-.2.6-.2 1.2-.1 1.8v4M9 18c-4.5 2-5-2-7-2',
  restore: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className, size = 16 }: { name: IconName; className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={clsx('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/** The Margin mark: a page with a lime margin rule. */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0">
      <rect x="3.5" y="2.5" width="17" height="19" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="7" y="2.5" width="2.4" height="19" fill="var(--accent)" />
      <path d="M12 8h5M12 12h5M12 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
