/**
 * ctx-cerebellum-l — left cerebellar hemisphere envelope
 * (envelopes-hindbrain-v2b). Built by lib/hindbrain-cerebellum.mjs.
 */

import { buildCerebellumHemisphere } from './lib/hindbrain-cerebellum.mjs';

const part = buildCerebellumHemisphere('ctx-cerebellum-l', 1);

export const slug = part.slug;
export function bbox() { return part.bbox(); }
export function sdf(x, y, z) { return part.sdf(x, y, z); }
export const meshOpts = part.meshOpts;
