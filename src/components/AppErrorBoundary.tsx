/**
 * AppErrorBoundary — the last line of defence around the whole application
 * (P0, QUALITY_PLAN §1 item 2, AUDIT §2.2).
 *
 * Every major surface already carries its own `PanelErrorBoundary`
 * (Header, 3D viewer, Plates, live section, Syndromes, InfoPanel, tree,
 * references modal), so this one only ever sees a throw that happened OUTSIDE
 * all of them: the app shell itself, a panel's own boundary, or a component
 * added later without its own boundary. Without it, React unmounts the entire
 * tree and the page goes blank — the exact failure mode the audit recorded
 * (`DataCloneError` from a rejected `postMessage` transfer list emptied the
 * page).
 *
 * It is deliberately a full-page card, not a panel card: if this boundary is
 * showing, nothing else in the app is guaranteed to be usable, so it offers the
 * two honest actions — re-mount the app (Retry) or reload the page — plus the
 * error message and a note that the console holds the stack.
 *
 * LIMITATION (React's, stated so it is never implied away): boundaries catch
 * render/lifecycle/constructor throws of their subtree. They do NOT catch
 * throws from event handlers, promises, `setTimeout`/`rAF` bodies, or errors
 * thrown inside a boundary itself. `window.onerror`/`unhandledrejection` are
 * outside this component's contract.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
  /** Test/QA hook: called with every caught error (never used in production). */
  onError?: (error: Error) => void
  /** Replaces the built-in page card entirely. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[app] the application shell failed', error, info.componentStack)
    this.props.onError?.(error)
  }

  private reset = (): void => {
    // Re-mounting the shell is the honest recovery: the boundary does not know
    // what state the failed subtree left behind.
    this.setState({ error: null })
  }

  private reload = (): void => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div
        className="app-error"
        role="alert"
        data-app-error="true"
        style={{
          // Inline by design: this card must render even when a stylesheet,
          // a CSS custom property or the layout itself is what failed.
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          background: '#0b1120',
          color: '#e2e8f0',
          font: '14px/1.5 system-ui, sans-serif',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.1rem' }}>NeuroAxis hit an unexpected error</h1>
        <p style={{ margin: 0, maxWidth: 520, color: '#cbd5e1' }}>
          Something failed outside every panel guard, so the interface was re-built from a safe
          state instead of leaving a blank page. The full stack is in the browser console.
        </p>
        <p
          style={{
            margin: 0,
            maxWidth: 520,
            padding: '6px 10px',
            border: '1px solid rgba(248, 113, 113, 0.45)',
            borderRadius: 4,
            background: 'rgba(69, 10, 10, 0.35)',
            color: '#fecaca',
            font: '12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
            wordBreak: 'break-word',
          }}
        >
          {error.message.length > 0 ? error.message : error.name}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" className="btn app-error-retry" onClick={this.reset}>
            Retry
          </button>
          <button type="button" className="btn" onClick={this.reload}>
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
