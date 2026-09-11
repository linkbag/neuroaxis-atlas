/**
 * CanvasSceneBoundary — an error boundary that lives INSIDE the react-three-fiber
 * scene graph (v7 closure, gap 1: "the loss state must survive a throw inside the
 * canvas subtree").
 *
 * WHY THIS IS NOT `PanelErrorBoundary`
 * R3F renders into its own reconciler, and R3F v8's `Canvas` wraps everything in
 * its own internal `ErrorBoundary` that RE-THROWS into the DOM tree
 * (`@react-three/fiber/dist/react-three-fiber.esm.js`: `ErrorBoundary set={setError}`
 * → `if (error) throw error` inside `Canvas`). Any throw inside the canvas
 * subtree therefore unmounts the WHOLE `Viewer3D` through the app's outer panel
 * boundary — that is exactly how the measured PostFX `alpha` TypeError removed
 * the WebGL context-loss overlay at the moment the context was lost.
 *
 * Two consequences shape this component:
 *   1. it must be BELOW R3F's own boundary in the tree, so it wins the error
 *      first (React routes an error to the NEAREST boundary ancestor);
 *   2. its fallback must be renderable by the THREE reconciler, so it renders
 *      `null` — never a `<div>`, which R3F rejects ("Div is not part of the
 *      THREE namespace"). The visible half of the failure is reported to the DOM
 *      through `onError`, and `Viewer3D` renders the notice there.
 *
 * The boundary is deliberately stateless about recovery: the owner bumps a key
 * (context restore, or the notice's Retry) to remount it, so the failed subtree
 * is rebuilt from scratch rather than resumed in an unknown state.
 */
import { Component, type ReactNode } from 'react'

export interface CanvasSceneBoundaryProps {
  /** Name of the wrapped surface, used by the DOM-side failure notice. */
  name: string
  /** Called once per caught error, so the DOM can show an honest notice. */
  onError: (name: string, error: Error) => void
  children: ReactNode
}

interface CanvasSceneBoundaryState {
  failed: boolean
}

export class CanvasSceneBoundary extends Component<
  CanvasSceneBoundaryProps,
  CanvasSceneBoundaryState
> {
  state: CanvasSceneBoundaryState = { failed: false }

  static getDerivedStateFromError(): CanvasSceneBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error): void {
    // Keep the stack for field diagnosis; the DOM notice carries the message.
    console.error(`[canvas] ${this.props.name} failed`, error)
    this.props.onError(this.props.name, error)
  }

  render(): ReactNode {
    // THREE-safe fallback: nothing in the scene, everything else still renders.
    return this.state.failed ? null : this.props.children
  }
}

export default CanvasSceneBoundary
