// Opaque record IDs for seeded data: a multiplicative hash of a counter, the
// same on every build, carrying nothing a reader could parse.
export const resolveOpaqueId = (prefix: string, index: number): string => `${prefix}${(Math.imul(index + 1, 2654435761) >>> 0).toString(36)}`;
