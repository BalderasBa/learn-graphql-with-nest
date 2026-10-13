import { Logger } from '@nestjs/common';
import type { ApolloServerPlugin } from '@apollo/server';

const graphqlLogger = new Logger('GraphQL');

/**
 * Logs the operation name and how long it took. The document and the
 * variables stay out of the log: a variable may be a token or a file.
 */
export function loggingPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart({ request }) {
      const startedAt = Date.now();
      const operationName = request.operationName ?? 'anonymous';
      return {
        async willSendResponse() {
          graphqlLogger.log(`${operationName} ${Date.now() - startedAt}ms`);
        },
      };
    },
  };
}
