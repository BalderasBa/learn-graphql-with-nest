import type { GraphQLFormattedError } from 'graphql';

/**
 * Clients receive a message, a code, and validation details. They do not
 * receive stack traces or the internal exception object. Those belong in
 * the server log, which the logging plugin already keeps free of variables.
 */
export function formatGraphqlError(
  formatted: GraphQLFormattedError,
): GraphQLFormattedError {
  const extensions = formatted.extensions ?? {};
  const response = isRecord(extensions.response) ? extensions.response : undefined;
  const original = isRecord(extensions.originalError)
    ? extensions.originalError
    : undefined;
  const details = response?.message ?? original?.message;
  const kept: Record<string, unknown> = {
    code: extensions.code ?? 'INTERNAL_SERVER_ERROR',
  };
  if (extensions.requestId !== undefined) {
    kept.requestId = extensions.requestId;
  }
  if (extensions.cost !== undefined) {
    kept.cost = extensions.cost;
    kept.maxCost = extensions.maxCost;
  }
  if (extensions.depth !== undefined) {
    kept.depth = extensions.depth;
    kept.maxDepth = extensions.maxDepth;
  }
  if (details !== undefined) {
    kept.details = details;
  }
  return {
    message: formatted.message,
    locations: formatted.locations,
    path: formatted.path,
    extensions: kept,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
