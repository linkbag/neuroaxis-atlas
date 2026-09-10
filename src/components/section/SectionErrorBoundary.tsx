/**
 * SectionErrorBoundary — keeps a failure inside the live-section canvas from
 * unmounting the whole app.
 *
 * Why this exists: SectionCanvas runs a worker, a rAF draw loop and several
 * async loaders. An uncaught throw inside it (e.g. the DataCloneError from a
 * rejected `postMessage` transfer list) propagates to the nearest error
 * boundary; with none present React unmounts the entire tree and the page goes
 * blank — which reads as "the app crashed". This boundary contains the damage:
 * the rest of the app keeps working and the panel explains what happened.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Rendered instead of the children after a failure (defaults to a note). */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the stack in the console for field diagnosis; the UI stays readable.
    console.error('[section] live section failed', error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div className="section-overlay-note is-error" role="alert">
        Live section failed: {error.message}{' '}
        <button type="button" className="section-retry" onClick={this.reset}>
          Retry
        </button>
      </div>
    )
  }
}
