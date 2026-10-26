/** Small line icons for the title screen buttons; they inherit the button's text colour. */
const PATHS = {
  swords: 'M5 4l9 9M19 4l-9 9M4 20l4-4M20 20l-4-4M3.5 3.5l3 .5.5 3M20.5 3.5l-3 .5-.5 3M9 14l-2 2M15 14l2 2',
  banner: 'M6 21V4M6 5h12l-3 4 3 4H6',
  book: 'M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13.5',
  speakerOn: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 010 6M18 6.500a8 8 0 010 11',
  speakerOff: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9.5l5 5M21 9.5l-5 5',
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
