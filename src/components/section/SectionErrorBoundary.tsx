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
 * The query parameter the browser audit uses to force a throw in exactly one
 * named surface: `?panelfail=Taxonomy%20tree`.
 *
 * WHY A TEST HOOK IS THE HONEST WAY TO PROVE CONTAINMENT
 * `docs/QUALITY_PLAN.md` §6 asks for the containment demonstration itself, and a
 * demonstration has to be runnable by a machine, not by a person editing code,
 * re-running, and reverting — that is unrepeatable and leaves the tree dirty if
 * anything goes wrong mid-run. This hook is the repeatable form of the same
 * experiment.
 *
 * SAFETY — three independent guards, because a test hook that can reach
 * production is a defect of its own:
 *   1. `import.meta.env?.DEV` is `false` in a production build (Vite replaces the
 *      token with its own env object, so the dev branch is statically dead and
 *      the minifier drops the URL read). The hook cannot be reached in a shipped
 *      bundle even by hand-editing the URL — asserted by grepping the built
 *      bundle for `panelfail`.
 *   2. The parameter must be present. Without `?panelfail` nothing is armed.
 *   3. The name must match THIS boundary's `name` exactly, so one surface fails
 *      and every other panel proves it keeps working.
 *
 * The probe element it renders (`data-panel-probe="<name>"`) additionally gives
 * the audit a positive signal that the hook is armed, so a *missing* card can
 * never be mistaken for a passing containment check.
 *
 * ── v7 closure: the probe marker moved ONTO THE FAILURE CARD (audit gap 5) ──
 * The marker used to be `hidden` span rendered as a SIBLING of
 * `<PanelFailureProbe/>`. React discards that whole subtree in the render pass
 * that throws, so the span never committed: the audit measured
 * `?panelfail armed 0 boundaries` and could not tell "the hook never armed" from
 * "the card is missing". The marker now lives on the failure card
 * (`panelErrorCard`, rendered while `error !== null`), i.e. AFTER the boundary's
 * state transition, so `document.querySelectorAll('[data-panel-probe]').length
 * === 1` proves arming AND containment in one signal.
 *
 * ── v7 closure: the probe fires ONCE per page load ─────────────────────────
 * Retry must be a real recovery, not a re-throw: an unconditional probe made
 * `Retry` restart the failure and left `probes === 1` forever, so the
 * recoverability half of the demonstration could not be asserted. The hook now
 * arms one throw per page load (it is a dev-only demonstration, and re-arming is
 * one reload away), which lets the audit assert: card appears → Retry clears it →
 * the panel renders again → the hook is inert afterwards.
 */
export const PANEL_FAIL_PARAM = 'panelfail'

/**
 * One-shot latch for the forced throw (see the header).
 *
 * Consumed in `componentDidCatch` — i.e. AFTER React committed the failure —
 * NOT during render. That matters because the app runs inside
 * `React.StrictMode` (`src/main.tsx`), which DOUBLE-INVOKES render in dev: a
 * latch flipped inside `render()` would be spent by the second invocation, the
 * committed output would be the healthy children, and the deliberate throw would
 * never happen at all (the demonstration would silently stop working — the same
 * class of defect this whole gap is about).
 */
let probeConsumed = false

/**
 * Node-only arming seam. Under Node there is no `window` and no
 * `import.meta.env`, so `panelFailTarget()` is inert by construction — which
 * would make the containment demonstration impossible in the browser-free lane
 * that `scripts/verify/boundary-contract.mjs` runs. This seam lets that lane arm
 * the SAME shipped code path (no copy, no regex): pass the surface name to arm,
 * `null` to disarm and reset the one-shot latch.
 *
 * It is a test seam, NOT a feature: the browser path never calls it, and it
 * cannot enable the hook in a production build (the probe is still gated by
 * `isDevBuild()` on the query-parameter path).
 */
export function armPanelFailForTest(target: string | null): void {
  testTarget = target
  probeConsumed = false
}

/** Armed target for the Node lane; null in the browser path. */
let testTarget: string | null = null
/**
 * True when this build is served by the Vite DEV server.
 *
 * ── v7 closure: THE ROOT CAUSE OF THE `?panelfail` FAILURE (audit gap 5) ───
 * This function used to read the flag through a local alias of `import.meta`:
 *
 *     const meta = import.meta as unknown as { env?: { DEV?: boolean } }
 *     return meta.env?.DEV === true
 *
 * which is always `false` in the dev server, so `panelFailTarget()` was inert
 * and the whole forced-throw demonstration could never arm — the audit measured
 * exactly that (`?panelfail armed 0 boundaries`, `card=null`). The reason:
 *
 *   • Vite's dev transform decides whether to inject `import.meta.env` by
 *     WALKING THE TRANSFORMED MODULE for an `import.meta.<prop>` access
 *     (`vite:import-analysis`, "hasEnv", `prop === ".env"`). The esbuild TS strip
 *     runs first, and a type cast is erased — so the alias above leaves the
 *     module with a bare `import.meta` and a local `.env` read, no token to
 *     detect, and therefore NO injected env object: `import.meta.env` is
 *     `undefined` at runtime.
 *   • The token has to appear literally, which is what the single line below
 *     does. In a production build Vite replaces that same token with its own
 *     literal env object, so `DEV` is `false` and the hook stays dead — verified
 *     by grepping the built bundle for `panelfail` (see the run's evidence).
 *
 * The optional chain is deliberate: `scripts/verify/boundary-contract.mjs` and
 * other Node lanes import this module directly, where `import.meta.env` is
 * `undefined` and `armPanelFailForTest()` is the arming seam.
 */
function isDevBuild(): boolean {
  return import.meta.env?.DEV === true
}

/** Read `?panelfail` from the current URL. Dev-only; '' in every other case. */
function panelFailTarget(): string {
  // The Node lane's explicit seam wins (see armPanelFailForTest).
  if (testTarget !== null) return testTarget
  if (!isDevBuild()) return ''
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get(PANEL_FAIL_PARAM) ?? ''
  } catch {
    return ''
  }
}

/** The armed probe: throws during render, so React's own boundary path runs. */
function PanelFailureProbe({ name }: { name: string }): never {
  throw new Error(
    `audit probe: deliberate render failure in "${name}" (?${PANEL_FAIL_PARAM}=${name})`,
  )
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
  // v7 closure (gap 5): the armed surface's own card carries the probe marker, so
  // "the hook is armed" and "the throw was contained" are ONE observable fact.
  // Every other boundary's card is unaffected (its name does not match), which is
  // what keeps `[data-panel-probe]` unique in the document.
  const armed = panelFailTarget() === name && name.length > 0
  return (
    <div
      className="panel-error"
      role="alert"
      data-panel-error={name}
      {...(armed ? { 'data-panel-probe': name } : {})}
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
    // Consume the one-shot demonstration latch HERE, not in render(): this runs
    // once per COMMITTED failure, while render() is double-invoked under
    // React.StrictMode (see the latch declaration).
    if (this.props.name !== undefined && panelFailTarget() === this.props.name) {
      probeConsumed = true
    }
  }

  private reset = (): void => {
    // Re-mounting the subtree is the honest recovery: the boundary does not
    // know what state the failed panel left behind.
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) {
      const armed = panelFailTarget()
      const name = this.props.name ?? 'Panel'
      if (armed !== '' && armed === name && !probeConsumed) {
        // The ONE deliberate throw. The failure branch below renders the card
        // (and `panelErrorCard` puts `data-panel-probe` on it, so arming and
        // containment are one observable fact); `componentDidCatch` then spends
        // the latch, which is what makes Retry recover instead of re-throwing.
        return <PanelFailureProbe name={name} />
      }
      return this.props.children
    }
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
