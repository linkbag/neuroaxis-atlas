/**
 * ctx-cerebellum-r — right cerebellar hemisphere envelope
 * (envelopes-hindbrain-v2b). Mirror of the left builder; the slug seeds an
 * independent folia noise field (determinism rule).
 */

import { buildCerebellumHemisphere } from './lib/hindbrain-cerebellum.mjs';

const part = buildCerebellumHemisphere('ctx-cerebellum-r', -1);

export const slug = part.slug;
export function bbox() { return part.bbox(); }
export function sdf(x, y, z) { return part.sdf(x, y, z); }
export const meshOpts = part.meshOpts;
