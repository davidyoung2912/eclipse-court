/** Hands a blob to the person as a download; false where the browser has no way to. */
export function saveBlob(blob: Blob, name: string): boolean {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
