/**
 * LevelRuler — plan §1.1 features 6 + 11: a vertical rostro-caudal strip of
 * the canonical levels (levels.json) with plate markers. Clicking a level
 * moves the 3D transverse clip plane to that level, opens the level's plate,
 * and switches to the Plates tab. The level nearest the current clip.y stays
 * highlighted, so moving the 3D plane keeps the ruler in sync.
 */

import { useMemo } from 'react'
import type { PlateRecord } from '../types'
import { levels, plates, shortLevelName, type LevelAnchor } from '../data/load'
import { useAtlasStore } from '../state/store'

/** First transverse plate per level id (plates are unique per level). */
function plateByLevel(): Map<string, PlateRecord> {
  const map = new Map<string, PlateRecord>()
  for (const plate of plates) {
    if (plate.orientation === 'transverse' && plate.levelId && !map.has(plate.levelId)) {
      map.set(plate.levelId, plate)
    }
  }
  return map
}

export default function LevelRuler() {
  const clipY = useAtlasStore((s) => s.clip.y)
  const gotoLevel = useAtlasStore((s) => s.gotoLevel)

  const platesByLevel = useMemo(plateByLevel, [])

  const nearestLevel = useMemo<LevelAnchor | null>(() => {
    let best: LevelAnchor | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const level of levels) {
      const distance = Math.abs(level.y - clipY)
      if (distance < bestDistance) {
        bestDistance = distance
        best = level
      }
    }
    return best
  }, [clipY])

  if (levels.length === 0) {
    return <p className="empty-note">Level table has not loaded — the ruler appears once src/data/levels.json exists.</p>
  }

  return (
    <div className="level-ruler-wrap">
      <p className="hint">Rostro-caudal · click a level to cut the 3D plane and open its plate</p>
      <ol className="level-ruler">
        {levels.map((level) => {
          const plate = platesByLevel.get(level.id)
          const isCurrent = nearestLevel !== null && nearestLevel.id === level.id
          return (
            <li key={level.id}>
              <button
                type="button"
                className={`ruler-item${isCurrent ? ' is-current' : ''}${plate ? ' is-plate' : ''}`}
                onClick={() => gotoLevel(level.id)}
                title={[
                  level.name,
                  `y = ${level.y} au`,
                  plate ? `open ${plate.id}` : 'no plate at this level yet',
                ].join(' · ')}
              >
                <span className="ruler-dot" aria-hidden="true" />
                <span className="ruler-label">{shortLevelName(level.name)}</span>
                <span className="ruler-y">{level.y > 0 ? `+${level.y}` : `${level.y}`}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
