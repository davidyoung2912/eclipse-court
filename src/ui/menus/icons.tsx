/** Small line icons for buttons; they inherit the button's text colour. */
const PATHS = {
  swords: 'M5 4l9 9M19 4l-9 9M4 20l4-4M20 20l-4-4M3.5 3.5l3 .5.5 3M20.5 3.5l-3 .5-.5 3M9 14l-2 2M15 14l2 2',
  banner: 'M6 21V4M6 5h12l-3 4 3 4H6',
  book: 'M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5',
  speakerOn: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 010 6M18 6.5a8 8 0 010 11',
  speakerOff: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5',
  play: 'M7 4.5v15l12-7.5z',
  back: 'M10 6l-6 6 6 6M4 12h16',
  next: 'M14 6l6 6-6 6M20 12H4',
  undo: 'M9 6L4 11l5 5M4 11h10a5 5 0 010 10h-3',
  hourglass: 'M7 3h10M7 21h10M8 3v4l4 5-4 5v4M16 3v4l-4 5 4 5v4',
  exit: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  skip: 'M5 6l7 6-7 6zM13 6l7 6-7 6z',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19',
  moon: 'M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z',
  leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8',
  shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z',
  flame: 'M12 3c1 4 5 6 5 11a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2 2.2.8-2.2.8L18 22l-.8-2.2-2.2-.8 2.2-.8z',
  plus: 'M12 5v14M5 12h14',
  cycle: 'M20 12a8 8 0 01-14 5.3M4 12a8 8 0 0114-5.3M18 3v4h-4M6 21v-4h4',
  swap: 'M4 8h15l-4-4M20 16H5l4 4',
  star: 'M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.2L12 17.2 6.4 20.2l1.2-6.2L3 9.6l6.3-.8z',
  rise: 'M12 19V7M7 12l5-5 5 5M5 21h14',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  chain: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1.5 1.5M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.5-1.5',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  )
}
