/**
 * PanelErrorBoundary (historic file name: SectionErrorBoundary.tsx) — a
 * reusable error boundary that keeps ONE failed surface from taking the whole
 * app down.
 *
 * Why this exists (docs/QUALITY_PLAN.md §1 item 2, AUDIT §2.2): the app used to
 * carry exactly one boundary, around the live-section canvas inside PlatesTab.
 * A throw in Viewer3D, Header, InfoPanel, TaxonomyTree, SyndromeBrowser or
 * PlateRenderer propagated to the root and React unmounted the entire tree —
 * a blank page that reads as "the app crashed" (this is exactly what the
 * earlier `DataCloneError` from a rejected `postMessage` transfer list did).
 *
 * USAGE
 *   <PanelErrorBoundary name="3D viewer"><Viewer3D /></PanelErrorBoundary>
 *
 * `<SectionErrorBoundary>` (the default export) is a thin re-export of
 * `PanelErrorBoundary`, so the historic
 * `./section/SectionErrorBoundary` import path keeps working; new call sites
 * should import the named `PanelErrorBoundary` from here.
 *
 * DELIBERATE LIMITATION (state it, never imply otherwise): React error
 * boundaries catch render/lifecycle/constructor throws of their subtree. They
 * do NOT catch throws from
 *   • event handlers (a click handler that throws is invisible to React — it
 *     only reaches `window.onerror`),
 *   • asynchronous callbacks (promise rejections, `setTimeout`, `rAF` bodies),
 *   • errors thrown in the boundary itself.
 * The worker/rAF/async paths in this app therefore report their own failures
 * into their own visible state (e.g. SectionCanvas' drawError note); a
 * boundary is a containment net, not a global handler.
 */
import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react'

export interface PanelErrorBoundaryProps {
  /** Panel name used in the card text and the console line: "«name» failed". */
  name?: string
  children: ReactNode
  /**
   * Replace the compact card entirely. Receives the error and a reset
   * callback that re-mounts the children.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Extra classes appended to the card (host panels can restyle it). */
  className?: string
  /**
   * Styles for the boundary element itself — the boundary always renders one
   * wrapper around the card, so a caller inside a grid/flex parent passes
   * `{ display: 'contents' }` to keep the layout untouched while the panel is
   * healthy.
   */
  style?: CSSProperties
}

interface PanelErrorBoundaryState {
  error: Error | null
}

/**
 * The visible card. Inline styles on purpose: this boundary is mounted by
 * several panels whose stylesheets belong to other tasks, so it must render
 * correctly without depending on any stylesheet rule. `role="alert"` makes the
 * failure announced rather than silent; the button is a real focusable control
 * so the recovery path is keyboard reachable.
 *
 * Exported because a call site whose boundary sits inside a grid/flex parent
 * must be able to re-render the card itself while keeping the WRAPPER
 * transparent (`display: contents`) — a wrapper cannot be both a transparent
 * layout box and a visible card. These call sites still render this card and
 * the `.panel-error` class, so every boundary in the app stays visually and
 * semantically identical.
 */
export function panelErrorCard(name: string, message: string, onRetry: () => void) {
  return (
    <div
      className="panel-error"
      role="alert"
      data-panel-error={name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        // A panel card must read as filling the failed surface: it is mounted
        // inside grids/flex rails whose children can be as narrow as a rail.
        width: '100%',
        boxSizing: 'border-box',
        margin: 0,
        padding: '8px 10px',
        border: '1px solid rgba(248, 113, 113, 0.45)',
        borderRadius: 4,
        background: 'rgba(69, 10, 10, 0.35)',
        color: '#fecaca',
        font: '12px/1.4 system-ui, sans-serif',
      }}
    >
      <span className="panel-error-text">
        {name} failed{message.length > 0 ? `: ${message}` : ''}
      </span>
      <button
        type="button"
        className="panel-error-retry btn"
        onClick={onRetry}
        title={`Re-mount the ${name}`}
        style={{
          padding: '2px 8px',
          border: '1px solid currentColor',
          borderRadius: 3,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}

/**
 * Generic per-panel boundary. `name` defaults to 'Panel' so a call site that
 * forgets it still renders a readable card.
 */
export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the stack in the console for field diagnosis; the UI stays readable.
    console.error(`[panel] ${this.props.name ?? 'Panel'} failed`, error, info.componentStack)
  }

  private reset = (): void => {
    // Re-mounting the subtree is the honest recovery: the boundary does not
    // know what state the failed panel left behind.
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return this.props.style === undefined ? (
      panelErrorCard(this.props.name ?? 'Panel', error.message, this.reset)
    ) : (
      <div className={this.props.className} style={this.props.style}>
        {panelErrorCard(this.props.name ?? 'Panel', error.message, this.reset)}
      </div>
    )
  }
}

/**
 * Back-compat shim: the live-section canvas' boundary under its historic name
 * and default-export shape (`{ children, fallback, style }`). Everything it did
 * before it still does — same card semantics, same Retry reset. `name` is
 * additive: without it the card says "Live section" exactly as before.
 */
export interface SectionErrorBoundaryProps {
  children: ReactNode
  /** Panel name in the card text (defaults to "Live section"). */
  name?: string
  /** Rendered instead of the children after a failure (defaults to the card). */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Styles for the wrapper element (see PanelErrorBoundaryProps.style). */
  style?: CSSProperties
}

export default class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[section] live section failed', error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    const name = this.props.name ?? 'Live section'
    if (name === 'Live section') {
      return (
        <div className="section-overlay-note is-error" role="alert">
          Live section failed: {error.message}{' '}
          <button type="button" className="section-retry" onClick={this.reset}>
            Retry
          </button>
        </div>
      )
    }
    const card = panelErrorCard(name, error.message, this.reset)
    return this.props.style === undefined ? (
      card
    ) : (
      <div style={this.props.style}>{card}</div>
    )
  }
}
