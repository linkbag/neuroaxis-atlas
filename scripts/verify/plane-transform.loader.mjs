/**
 * plane-transform.loader.mjs — Node module-resolution hook for
 * `npm run verify:plane`.
 *
 * Why it exists: the app is bundled by Vite, so its TypeScript sources import
 * each other with EXTENSIONLESS specifiers (`from './contours'`,
 * `from '../viewer3d/clipPlanes'`). Node's ESM resolver requires a full
 * filename, so `import('./src/components/section/planeGeometry.ts')` fails with
 * ERR_MODULE_NOT_FOUND — which would force the gate to test a copy of the
 * transform instead of the module the app actually ships. This hook adds only
 * that one rule (relative specifier → try `.ts`, `.tsx`, `index.ts`) and leaves
 * every other resolution to Node.
 *
 * Scope: scratch-free, side-effect-free, used exclusively by
 * scripts/verify/plane-transform.mjs (registered with `module.register()` from
 * inside that script, before it imports the module under test).
 */
import { fileURLToPath } from 'node:url'

/** Extensionless relative specifiers the bundler would resolve, in Vite's order. */
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx']

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    try {
      return await nextResolve(specifier, context)
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error
      for (const extension of EXTENSIONS) {
        try {
          return await nextResolve(specifier + extension, context)
        } catch (inner) {
          if (inner?.code !== 'ERR_MODULE_NOT_FOUND') throw inner
        }
      }
      // Report the original failure, not the last probe.
      throw error
    }
  }
  return nextResolve(specifier, context)
}

/** Present so a future caller can assert the hook is the repo's, not a global one. */
export const LOADER_ID = fileURLToPath(import.meta.url)
