/**
 * ExplodeSlider — exploded-view control (plan §1.1 feature 3): a 0…1 slider
 * docked over the canvas writing store.explode. Nucleus-kind meshes shift
 * radially by their normalized [x, z] × explode × 6 (see NucleusMesh); tracts
 * and envelopes stay in place.
 */
import { useAtlasStore } from '../../state/store'

export default function ExplodeSlider() {
  const explode = useAtlasStore((s) => s.explode)
  const setExplode = useAtlasStore((s) => s.setExplode)

  return (
    <div className="explode-dock">
      <label htmlFor="explode-range">Explode</label>
      <input
        id="explode-range"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={explode}
        onChange={(event) => setExplode(Number(event.target.value))}
        aria-label="Exploded view factor"
      />
      <output htmlFor="explode-range">{Math.round(explode * 100)}%</output>
    </div>
  )
}
