/** Acquisition support is separate from intensity: black MRI can be valid data. */
export interface SourceField {
  dims: [number, number, number]
  voxelFromAtlasAu: readonly number[]
}

export function readSourceField(value: unknown): SourceField | undefined {
  if (value === undefined) return undefined // Legacy manifests have no source geometry.
  if (value === null || typeof value !== 'object') throw new Error('Invalid image source field')
  const field = value as { dims?: unknown; voxelFromAtlasAu?: unknown }
  if (!Array.isArray(field.dims) || field.dims.length !== 3 ||
      !field.dims.every(n => Number.isInteger(n) && n > 0) ||
      !Array.isArray(field.voxelFromAtlasAu) || field.voxelFromAtlasAu.length !== 16 ||
      !field.voxelFromAtlasAu.every(Number.isFinite)) throw new Error('Invalid image source geometry')
  const m = field.voxelFromAtlasAu as number[]
  if (m[12] !== 0 || m[13] !== 0 || m[14] !== 0 || m[15] !== 1) throw new Error('Expected affine source geometry')
  const determinant = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8])
  if (Math.abs(determinant) < 1e-12) throw new Error('Singular image source geometry')
  return { dims: field.dims as [number, number, number], voxelFromAtlasAu: m }
}

/** No extrapolation. Includes source voxel centers at the physical volume edges. */
export function sourceFieldContains(field: SourceField | undefined, x: number, y: number, z: number): boolean {
  if (field === undefined) return true
  const m = field.voxelFromAtlasAu
  for (let a = 0; a < 3; a++) {
    const b = a * 4
    const v = m[b] * x + m[b + 1] * y + m[b + 2] * z + m[b + 3]
    if (!(v >= -1e-8 && v <= field.dims[a] - 1 + 1e-8)) return false
  }
  return true
}
