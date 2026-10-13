import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import type { GraphqlContext } from '../common/graphql-context.js';
import { RATE_LIMIT, RATE_WINDOW_MS } from './limits.js';

interface RateBucket {
  count: number;
  resetAt: number;
}

/**
 * A per-process counter keyed by the socket address. It teaches the shape of
 * a limit. It is not a production limiter: several servers would not share
 * the count, and the address behind a proxy must come from the platform, not
 * from a header the client can invent.
 */
export function rateLimitPlugin(
  limit: number = RATE_LIMIT,
  windowMs: number = RATE_WINDOW_MS,
): ApolloServerPlugin<GraphqlContext> {
  const buckets = new Map<string, RateBucket>();
  return {
    async requestDidStart({ contextValue }) {
      const now = Date.now();
      const key = contextValue.clientKey;
      const current = buckets.get(key);
      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
      }
      current.count += 1;
      if (current.count > limit) {
        throw new GraphQLError(
          'Too many GraphQL requests. Wait a moment and try again.',
          { extensions: { code: 'TOO_MANY_REQUESTS' } },
        );
      }
    },
  };
}
