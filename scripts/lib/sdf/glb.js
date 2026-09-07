/**
 * NeuroAxis SDF kernel — minimal glTF-Binary (GLB) writer.
 *
 * Emits the smallest spec-conformant GLB that three.js's GLTFLoader accepts
 * (REALISM_PLAN §2.6: the runtime owns materials, the file carries none):
 *
 * Limits (documented for consumers in docs/GEOMETRY_PIPELINE.md):
 *  - exactly one scene, one node, one mesh, ONE primitive
 *  - attributes: POSITION + NORMAL only (no UV/TANGENT/COLOR/SKIN)
 *  - indexed TRIANGLES (mode 4) with uint32 indices, float32 components
 *  - single buffer, little-endian, 4-byte aligned chunks (JSON padded with
 *    0x20, BIN padded with 0x00 per spec recommendation)
 *  - no materials, textures, skins, animations, extensions, extras
 *  - geometry is written AS-IS in canonical atlas space (y = +superior,
 *    matching glTF's Y-up right-handed convention)
 *
 * Plain Node ESM, zero dependencies.
 */

const MAGIC = 0x46546c67; // "glTF"
const VERSION = 2;
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN"

/** Validate a kernel mesh; returns counts. Throws on any violation. */
export function validateMesh(mesh) {
  if (!mesh) throw new Error('writeGLB: mesh required');
  const { positions, normals, indices } = mesh;
  if (!(positions instanceof Float32Array) || positions.length === 0) {
    throw new Error('writeGLB: positions must be a non-empty Float32Array (xyz triplets)');
  }
  if (!(normals instanceof Float32Array) || normals.length !== positions.length) {
    throw new Error('writeGLB: normals must be a Float32Array matching positions length');
  }
  if (!(indices instanceof Uint32Array) || indices.length === 0) {
    throw new Error('writeGLB: indices must be a non-empty Uint32Array');
  }
  if (indices.length % 3 !== 0) throw new Error('writeGLB: indices length must be a multiple of 3');
  const vertexCount = positions.length / 3;
  for (let i = 0; i < indices.length; i += 1) {
    if (indices[i] >= vertexCount) {
      throw new Error(`writeGLB: index ${indices[i]} out of range (vertexCount=${vertexCount})`);
    }
  }
  return { vertexCount, triCount: indices.length / 3 };
}

/**
 * Serialize a mesh to a GLB byte array.
 * @param {object} mesh { positions: Float32Array, normals: Float32Array, indices: Uint32Array }
 * @param {object} [opts] { name?: string, generator?: string }
 * @returns {Uint8Array}
 */
export function writeGLB(mesh, opts = {}) {
  const { vertexCount } = validateMesh(mesh);
  const { positions, normals, indices } = mesh;
  const name = typeof opts.name === 'string' ? opts.name : undefined;

  // POSITION accessor requires min/max.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let a = 0; a < 3; a += 1) {
      const v = positions[i + a];
      if (v < min[a]) min[a] = v;
      if (v > max[a]) max[a] = v;
    }
  }

  const posBytes = positions.byteLength;
  const nrmBytes = normals.byteLength;
  const idxBytes = indices.byteLength;
  if (posBytes % 4 !== 0 || nrmBytes % 4 !== 0 || idxBytes % 4 !== 0) {
    throw new Error('writeGLB: internal alignment error (typed arrays must be 4-byte sized)');
  }

  const binLength = posBytes + nrmBytes + idxBytes;
  const gltf = {
    asset: {
      version: '2.0',
      generator: opts.generator ?? 'neuroaxis scripts/lib/sdf/glb.js (SDF kernel)',
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, ...(name ? { name } : {}) }],
    meshes: [{
      ...(name ? { name } : {}),
      primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, mode: 4 }],
    }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes, byteLength: nrmBytes, target: 34962 },
      { buffer: 0, byteOffset: posBytes + nrmBytes, byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: binLength }],
  };

  // JSON chunk, padded to 4 bytes with spaces (0x20).
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonLen = jsonBytes.length + jsonPad;

  // Binary chunk, padded to 4 bytes with zeros.
  const binPad = (4 - (binLength % 4)) % 4;
  const binChunkLen = binLength + binPad;

  const total = 12 + 8 + jsonLen + 8 + binChunkLen;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);

  let o = 0;
  dv.setUint32(o, MAGIC, true); o += 4;
  dv.setUint32(o, VERSION, true); o += 4;
  dv.setUint32(o, total, true); o += 4;

  dv.setUint32(o, jsonLen, true); o += 4;
  dv.setUint32(o, CHUNK_JSON, true); o += 4;
  out.set(jsonBytes, o); o += jsonBytes.length;
  for (let p = 0; p < jsonPad; p += 1) { out[o] = 0x20; o += 1; }

  dv.setUint32(o, binChunkLen, true); o += 4;
  dv.setUint32(o, CHUNK_BIN, true); o += 4;
  out.set(new Uint8Array(positions.buffer, positions.byteOffset, posBytes), o);
  o += posBytes;
  out.set(new Uint8Array(normals.buffer, normals.byteOffset, nrmBytes), o);
  o += nrmBytes;
  out.set(new Uint8Array(indices.buffer, indices.byteOffset, idxBytes), o);
  o += idxBytes;
  for (let p = 0; p < binPad; p += 1) { out[o] = 0x00; o += 1; }

  return out;
}

/**
 * Serialize positions/normals/indices as raw little-endian bytes — exposed
 * for tests and for pipelines that want the BIN payload without a GLB.
 */
export function binPayload(mesh) {
  validateMesh(mesh);
  const out = new Uint8Array(
    mesh.positions.byteLength + mesh.normals.byteLength + mesh.indices.byteLength,
  );
  let o = 0;
  out.set(new Uint8Array(mesh.positions.buffer, mesh.positions.byteOffset, mesh.positions.byteLength), o);
  o += mesh.positions.byteLength;
  out.set(new Uint8Array(mesh.normals.buffer, mesh.normals.byteOffset, mesh.normals.byteLength), o);
  o += mesh.normals.byteLength;
  out.set(new Uint8Array(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indices.byteLength), o);
  return out;
}
