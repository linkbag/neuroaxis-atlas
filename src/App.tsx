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
 */

import { useState } from 'react'
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
import { useAtlasStore, type ActiveTab } from './state/store'

const TABS: { id: ActiveTab; label: string; title: string }[] = [
  { id: '3d', label: '3D', title: 'Interactive 3D brainstem viewer' },
  { id: 'plates', label: 'Plates', title: '2D cross-section plates (transverse · sagittal · coronal)' },
  { id: 'syndromes', label: 'Syndromes', title: 'Clinical syndrome browser' },
]

/** Initial sidebar visibility: collapsed by default on tablet/phone widths. */
function initialSidebarOpen(): boolean {
  return typeof window === 'undefined' || window.innerWidth > 1024
}

export default function App() {
  const activeTab = useAtlasStore((s) => s.activeTab)
  const setActiveTab = useAtlasStore((s) => s.setActiveTab)
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen)

  return (
    <div className={`app-shell ${sidebarOpen ? 'is-sidebar-open' : 'is-sidebar-closed'}`}>
      <Header />

      {/* ------------------------------------------------ left: browse rail */}
      <aside
        className={`sidebar ${sidebarOpen ? 'is-open' : 'is-closed'}`}
        aria-label="Structure browser"
        aria-hidden={!sidebarOpen}
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
          <section className="side-section side-section--grow" aria-label="Taxonomy">
            <TaxonomyTree />
          </section>
          <section className="side-section" aria-label="Level ruler">
            <LevelRuler />
          </section>
        </div>
      </aside>

      {/* ------------------------------------------------------- center pane */}
      <main className="center-pane">
        <div className="center-tabs" role="tablist" aria-label="Main views">
          {TABS.map((tab) => {
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
                onClick={() => setActiveTab(tab.id)}
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
          {activeTab === '3d' && <Viewer3D />}
          {activeTab === 'plates' && <PlatesTab />}
          {activeTab === 'syndromes' && <SyndromeBrowser />}
        </div>
      </main>

      {/* ------------------------------------------------- right: info rail */}
      <div className="right-rail">
        <InfoPanel />
        <Legend />
      </div>

      <ReferencesModal />
    </div>
  )
}
