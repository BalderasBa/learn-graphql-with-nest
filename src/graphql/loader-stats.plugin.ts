import type { ApolloServerPlugin } from '@apollo/server';
import type { GraphqlContext } from '../common/graphql-context.js';

interface SingleResultBody {
  kind: string;
  singleResult?: { extensions?: Record<string, unknown> };
}

/**
 * Adds `extensions.loaderBatches` so a nested query can show that authors
 * were loaded once, not once per book. Take this out of a real API. It
 * describes the server's internals to every client.
 */
export function loaderStatsPlugin(): ApolloServerPlugin<GraphqlContext> {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          const body = requestContext.response.body as SingleResultBody;
          if (body.kind !== 'single' || !body.singleResult) {
            return;
          }
          body.singleResult.extensions = {
            ...body.singleResult.extensions,
            loaderBatches: requestContext.contextValue.stats,
          };
        },
      };
    },
  };
}
