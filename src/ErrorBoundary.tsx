import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** The key under which the time of the last automatic reload is kept, so a page that still fails does not reload forever. */
const RELOADED = 'eclipse-court:reloaded'
const RELOAD_GAP_MS = 60_000

/** True for the failure of a lazily loaded screen, which happens when an installed copy of the app points at files a newer version replaced. */
const staleFiles = (e: Error) => /dynamically imported module|importing a module script|failed to fetch|loading chunk|loading css chunk/i.test(`${e.name} ${e.message}`)

function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED) ?? 0)
    if (Date.now() - last < RELOAD_GAP_MS) return false
    sessionStorage.setItem(RELOADED, String(Date.now()))
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Keeps a failure in one screen from blanking the whole app: a stale copy reloads itself once, anything else shows what went wrong. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (staleFiles(error)) reloadOnce()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <main className="app menu" role="alert">
        <h2>Something went wrong</h2>
        <p className="tagline">{staleFiles(error) ? 'A newer version of the game is available.' : 'The game hit an unexpected problem.'} Reloading usually fixes it, and your progress is kept.</p>
        <pre className="setup-card">{`${error.name}: ${error.message}`}</pre>
        <div className="menu-buttons stacked">
          <button className="primary" onClick={() => location.reload()}>Reload</button>
          <button onClick={() => this.setState({ error: null })}>Try Again</button>
        </div>
      </main>
    )
  }
}
