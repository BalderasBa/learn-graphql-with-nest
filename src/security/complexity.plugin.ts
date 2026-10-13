import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { MAX_QUERY_COST } from './limits.js';
import { calculateOperationCost, isIntrospectionDocument } from './query-cost.js';

/**
 * Runs after the document is parsed and the operation is chosen, before
 * resolvers run. Rejecting here means an expensive selection never touches
 * the data.
 */
export function complexityLimitPlugin(
  maxCost: number = MAX_QUERY_COST,
): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          if (
            isIntrospectionDocument(
              requestContext.document,
              requestContext.operationName,
            )
          ) {
            return;
          }
          const cost = calculateOperationCost(
            requestContext.schema,
            requestContext.document,
            requestContext.operationName,
          );
          if (cost > maxCost) {
            throw new GraphQLError(
              `Query cost ${cost} is above the limit of ${maxCost}. Select fewer fields, or paginate.`,
              { extensions: { code: 'QUERY_TOO_COMPLEX', cost, maxCost } },
            );
          }
        },
      };
    },
  };
}
