/**
 * App — integration root (plan §7, integration task).
 *
 * Desktop 3-column grid (layout.css `.app-shell`):
 *   header  → <Header />            title · view presets · references
 *   sidebar → SearchBox + TaxonomyTree + LevelRuler   (collapsible)
 *   center  → tabs 3D | Plates | Syndromes
 *             3D        → <Viewer3D /> (R3F canvas + ClipControls + ExplodeSlider)
 *             Plates    → <PlatesTab /> (12 SVG cross-sections, 2D↔3D synced)
 *             Syndromes → <SyndromeBrowser /> (cards → global highlight)
 *   info    → <InfoPanel /> over <Legend /> in a right rail
 *   overlay → <ReferencesModal />
 *
 * Cross-feature sync lives in the zustand store (plan §1.1): selection from
 * any source (3D click, tree, search, plate region, syndrome chip) drives the
 * info panel, tree highlight, plate region highlight, and 3D dim/emissive;
 * selecting a plate/level moves the 3D transverse clip plane and reveals the
 * plane helper; an open syndrome card highlights its structures everywhere.
 * (Camera nudge on selection is intentionally omitted — optional stretch.)
 *
 * Responsive (plan §1.3): tablet ≤1024px stacks the info rail under the
 * center pane and makes the sidebar collapsible via the tab-bar "Browse"
 * button; phone ≤640px turns the sidebar into a bottom sheet, keeps the info
 * panel as its own bottom sheet (see InfoPanel), and docks the tabs as a
 * fixed bottom bar.
 *
 * ── P0 survivability: error boundaries on every major surface
 *    (QUALITY_PLAN §1 item 2, AUDIT §2.2) ──────────────────────────────────
 * Before this file was changed, the app carried exactly ONE boundary (around
 * SectionCanvas inside PlatesTab): a throw in Header, Viewer3D, InfoPanel,
 * TaxonomyTree, SyndromeBrowser, PlateRenderer or ReferencesModal unmounted the
 * whole tree and left a blank page. Every one of those surfaces is now wrapped
 * in a `PanelErrorBoundary` with its own compact "«panel» failed — Retry" card,
 * and the whole shell is wrapped once more in `AppErrorBoundary` as the last
 * line of defence.
 *
 * WRAPPER SHAPE — why `display: contents`: `.app-shell` is a named grid and its
 * areas (`header`, `sidebar`, `center`, `info`) are matched to DIRECT children;
 * `.right-rail` and `.sidebar-scroll` are flex columns whose children must stay
 * in flow. A boundary wrapper that kept its own box would therefore move a
 * panel out of its grid area or collapse a flex child. `display: contents`
 * makes the healthy wrapper layout-transparent (the children keep their
 * original box, size and scroll behaviour — the healthy app lays out exactly as
 * before), while a FAILED boundary still renders the card, which becomes the
 * grid/flex item and is visible. `styles/layout.css` is not part of this task's
 * write scope, which is why the rule is inline.
 *
 * LIMITATION (inherited from React, stated rather than implied away): error
 * boundaries catch render/lifecycle throws only — not event handlers, not async
 * callbacks. Those paths report their own visible failures (see the header of
 * section/SectionErrorBoundary.tsx).
 *
 * ── P2 accessibility: hidden panels are really hidden ────────────────────
 * QUALITY_PLAN §4 item 14 / AUDIT §2.18. The sidebar used to be hidden by
 * `aria-hidden={!sidebarOpen}` alone while it stayed in the tab order (and, on
 * phones, off-screen behind a transform), so a keyboard or screen-reader user
 * could Tab into an invisible panel — the classic aria-hidden-on-focusable
 * violation. The container is `inert` while closed instead: `inert` removes the
 * subtree from the tab order, from hit-testing and from the accessibility tree
 * in one step, so the two states can no longer disagree. The `transform`
 * transitions in `styles/layout.css` are untouched — the sheet still animates
 * exactly as before — and the tab-bar **Browse** button stays outside the inert
 * subtree, so a keyboard user always has the way back in.
 * (`inert` is supported by the browsers this app targets — Chrome 102+,
 * Firefox 112+, Safari 15.5+ — and is typed on JSX intrinsic elements from
 * @types/react 18.3, which is what `npm run check` verifies.)
 */

import { useRef, useState, type ReactNode } from 'react'
import Header from './components/Header'
import SearchBox from './components/SearchBox'
import TaxonomyTree from './components/TaxonomyTree'
import LevelRuler from './components/LevelRuler'
import Legend from './components/Legend'
import InfoPanel from './components/InfoPanel'
import PlatesTab from './components/PlatesTab'
import SyndromeBrowser from './components/SyndromeBrowser'
import ReferencesModal from './components/ReferencesModal'
import Viewer3D from './components/viewer3d/Viewer3D'
import AppErrorBoundary from './components/AppErrorBoundary'
import { PanelErrorBoundary, panelErrorCard } from './components/section/SectionErrorBoundary'
import { useAtlasStore, type ActiveTab } from './state/store'

const TABS: { id: ActiveTab; label: string; title: string }[] = [
  { id: '3d', label: '3D', title: 'Interactive 3D brainstem viewer' },
  { id: 'plates', label: 'Plates', title: '2D cross-section plates (transverse · sagittal · coronal)' },
  { id: 'syndromes', label: 'Syndromes', title: 'Clinical syndrome browser' },
]

/**
 * v19 (audit ux-009) — the tab bar declared `role="tablist"` / `role="tab"`
 * without implementing the WAI-ARIA tabs pattern: every tab was in the tab
 * order and no arrow key moved between them, so a keyboard user had three
 * extra stops and no way to walk the tabs. The two rules the pattern actually
 * requires are implemented below — roving `tabindex` (only the selected tab is
 * a tab stop) and Left/Right/Home/End moving selection AND focus — while the
 * markup, ids, labels and click behaviour are unchanged.
 */
function tabAfterArrow(current: number, key: string): number {
  if (key === 'ArrowRight') return (current + 1) % TABS.length
  if (key === 'ArrowLeft') return (current - 1 + TABS.length) % TABS.length
  if (key === 'Home') return 0
  if (key === 'End') return TABS.length - 1
  return current
}

/** Initial sidebar visibility: collapsed by default on tablet/phone widths. */
function initialSidebarOpen(): boolean {
  return typeof window === 'undefined' || window.innerWidth > 1024
}

/**
 * A boundary that does not disturb the layout it is mounted in: the wrapper
 * takes no box (`display: contents`) and the failure card is produced by the
 * shared `panelErrorCard`, so the card keeps the app-wide `.panel-error` look
 * and the `role="alert"` semantics.
 */
function TransparentBoundary({ label, children }: { label: string; children: ReactNode }) {
  return (
    <PanelErrorBoundary
      name={label}
      style={{ display: 'contents' }}
      fallback={(error, reset) => panelErrorCard(label, error.message, reset)}
    >
      {children}
    </PanelErrorBoundary>
  )
}

/**
 * The application itself (grid shell + per-surface boundaries). Kept as a
 * named component so the default export can wrap it in the app-level guard
 * without the guard re-mounting on every shell render.
 */
export function AppContent() {
  const activeTab = useAtlasStore((s) => s.activeTab)
  const setActiveTab = useAtlasStore((s) => s.setActiveTab)
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)
  /** v19 (audit ux-009) — the tab buttons, so the arrow keys can move FOCUS with
   *  the selection (the tabs pattern requires both). */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  return (
    <div className={`app-shell ${sidebarOpen ? 'is-sidebar-open' : 'is-sidebar-closed'}`}>
      {/* The header keeps its `header` grid area: the wrapper is transparent. */}
      <TransparentBoundary label="Header">
        <Header />
      </TransparentBoundary>

      {/* ------------------------------------------------ left: browse rail */}
      <aside
        className={`sidebar ${sidebarOpen ? 'is-open' : 'is-closed'}`}
        aria-label="Structure browser"
        // A11Y-CONTRACT (item 14): while the sidebar is closed it is hidden by
        // layout/transform only, so the container must be inert — NOT
        // `aria-hidden`, which is a lie while its buttons stay focusable.
        // `inert` is a real DOM property (Chrome 102+/Firefox 112+/Safari 15.5+)
        // but the installed @types/react 18.x does not declare it on JSX
        // intrinsic elements yet, which is why the one attribute is cast here —
        // `npm run check` stays at 0 and the DOM receives `inert` exactly as
        // React renders any unknown lowercase attribute. The value is `""` (not
        // `true`) so React writes `inert=""` when closed and REMOVES the
        // attribute when open: an empty string is the only value a boolean HTML
        // attribute renders unambiguously across React versions.
        {...({ inert: sidebarOpen ? undefined : '' } as Record<string, unknown>)}
      >
        <div className="sidebar-handle">
          <span className="panel-title">Browse</span>
          <button
            type="button"
            className="btn sidebar-close"
            onClick={() => setSidebarOpen(false)}
            title="Hide the browse sidebar"
          >
            ▾ Close
          </button>
        </div>
        <div className="sidebar-scroll">
          <section className="side-section" aria-label="Search">
            <SearchBox />
          </section>
          {/* The tree is the throw-prone half of this rail (it walks the whole
              taxonomy and every record); the wrapper is transparent so the
              `.side-section--grow` flex child keeps its height. */}
          <section className="side-section side-section--grow" aria-label="Taxonomy">
            <TransparentBoundary label="Taxonomy tree">
              <TaxonomyTree />
            </TransparentBoundary>
          </section>
          <section className="side-section" aria-label="Level ruler">
            <LevelRuler />
          </section>
        </div>
      </aside>

      {/* ------------------------------------------------------- center pane */}
      <main className="center-pane">
        <div className="center-tabs" role="tablist" aria-label="Main views">
          {TABS.map((tab, index) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls="center-body"
                title={tab.title}
                className={`center-tab${active ? ' is-active' : ''}`}
                /* v19 (audit ux-009) — roving tabindex: the selected tab is the
                 * single tab stop, the arrows (handled on the tablist) move it. */
                tabIndex={active ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => {
                  const next = tabAfterArrow(index, event.key)
                  if (next === index && !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    return
                  }
                  event.preventDefault()
                  setActiveTab(TABS[next].id)
                  tabRefs.current[next]?.focus()
                }}
              >
                {tab.label}
              </button>
            )
          })}
          <button
            type="button"
            className={`btn center-tabs-browse${sidebarOpen ? ' is-active' : ''}`}
            aria-pressed={sidebarOpen}
            title={sidebarOpen ? 'Hide the browse sidebar' : 'Show the browse sidebar (search, tree, level ruler)'}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? '◂ Panel' : 'Browse ▸'}
          </button>
        </div>

        <div className="center-body" id="center-body" role="tabpanel" aria-label="Active view">
          {/* Each tab owns its own boundary: a failure in the 3D canvas must
              leave the Plates and Syndromes tabs reachable, and vice versa.
              PlatesTab additionally guards its two modes internally
              (author plate / live section), so a throw there costs one stage
              rather than the whole tab. */}
          {activeTab === '3d' && (
            <TransparentBoundary label="3D viewer">
              <Viewer3D />
            </TransparentBoundary>
          )}
          {activeTab === 'plates' && (
            <TransparentBoundary label="Plates tab">
              <PlatesTab />
            </TransparentBoundary>
          )}
          {activeTab === 'syndromes' && (
            <TransparentBoundary label="Syndrome browser">
              <SyndromeBrowser />
            </TransparentBoundary>
          )}
        </div>
      </main>

      {/* ------------------------------------------------- right: info rail */}
      <div className="right-rail">
        <TransparentBoundary label="Info panel">
          <InfoPanel />
        </TransparentBoundary>
        <Legend />
      </div>

      <TransparentBoundary label="References modal">
        <ReferencesModal />
      </TransparentBoundary>
    </div>
  )
}

/**
 * Default export: the application inside the last-resort guard.
 *
 * `main.tsx` mounts THIS component, so the guard sits at the very top of the
 * React tree — including over the shell markup above, which no panel boundary
 * covers. It is mounted here rather than in `main.tsx` because that file is
 * outside this task's write scope; the observable result is identical, and any
 * future `main.tsx` change can simply render `<AppErrorBoundary><App /></…>`
 * around the same component.
 */
export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  )
}
