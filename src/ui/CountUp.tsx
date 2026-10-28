import { useCountUp } from '../hooks/useCountUp'

/** A whole number that counts up (or down) to its new value when it changes. */
export function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value)}</>
}
