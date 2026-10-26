/** Blend from Umbral indigo (-2) to Solari cream (+2). */
export const lumColor = (lum: number) =>
  `color-mix(in srgb, var(--solari-cream) ${((lum + 2) / 4) * 100}%, var(--umbral-indigo))`
