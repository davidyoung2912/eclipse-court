/** The options last used on a setup screen, so coming back to it repeats the same setup. */
const PREFIX = 'eclipse-court:last:'

export function loadChoices(name: string): Record<string, unknown> {
  try {
    const o = JSON.parse(localStorage.getItem(PREFIX + name) ?? 'null')
    if (o && typeof o === 'object' && !Array.isArray(o)) return o as Record<string, unknown>
  } catch {
    // Fall through to nothing remembered.
  }
  return {}
}

export function saveChoices(name: string, choices: Record<string, unknown>): void {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(choices))
  } catch {
    // Storage may be full or blocked; the choices are just not remembered.
  }
}

/** `value` if it is one of `allowed`, else `fallback`. */
export function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function list<T>(value: unknown, allowed: readonly T[]): T[] | undefined {
  return Array.isArray(value) && value.every((v) => allowed.includes(v as T)) ? (value as T[]) : undefined
}
