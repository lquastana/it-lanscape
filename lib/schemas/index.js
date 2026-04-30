import { LandscapeSchema } from './application.js';
import { FluxFileSchema } from './flux.js';
import { InfrastructureFileSchema } from './infrastructure.js';
import { NetworkFileSchema } from './network.js';
import { TrigrammeSchema } from './trigramme.js';

/**
 * Resolves the Zod schema to apply for a given data filename (without .json extension).
 * Returns null for unrecognised file types — they pass through unvalidated.
 */
export function resolveSchema(name) {
  if (name === 'trigrammes') return TrigrammeSchema;
  if (name.endsWith('.flux')) return FluxFileSchema;
  if (name.endsWith('.infra')) return InfrastructureFileSchema;
  if (name.endsWith('.network')) return NetworkFileSchema;
  return LandscapeSchema;
}

/**
 * Formats Zod validation errors into a human-readable array of strings.
 */
export function formatZodErrors(error) {
  return error.errors.map((e) => {
    const path = e.path.length > 0 ? e.path.join('.') + ': ' : '';
    return `${path}${e.message}`;
  });
}

export { LandscapeSchema, FluxFileSchema, InfrastructureFileSchema, NetworkFileSchema, TrigrammeSchema };
