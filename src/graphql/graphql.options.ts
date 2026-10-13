import { join } from 'node:path';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { ApolloDriverConfig } from '@nestjs/apollo';
import { createAuthorLoader, createBooksByAuthorLoader } from '../authors/author.loader.js';
import { AuthorsService } from '../authors/authors.service.js';
import { BooksService } from '../books/books.service.js';
import { formatGraphqlError } from '../common/format-graphql-error.js';
import {
  type GraphqlContext,
  type GraphqlContextSource,
  readClientKey,
  readRequestId,
  userFromContextSource,
} from '../common/graphql-context.js';
import { loaderStatsPlugin } from './loader-stats.plugin.js';
import { loggingPlugin } from './logging.plugin.js';
import { applyUpperDirective } from '../library/upper.directive.js';
import { complexityLimitPlugin } from '../security/complexity.plugin.js';
import { depthLimitRule } from '../security/depth-limit.rule.js';
import { rateLimitPlugin } from '../security/rate-limit.plugin.js';

/**
 * One GraphQL endpoint, mounted on the Express server at `/graphql`.
 *
 * - POST application/json is the normal transport for queries and mutations.
 * - GET is allowed for queries only. Apollo blocks mutations on GET so a
 *   foreign page cannot trigger one by asking the browser to open a URL.
 * - Subscriptions use the graphql-ws protocol on the same path, over a
 *   websocket upgrade. They are not HTTP requests.
 * - Introspection and GraphiQL stay on outside production so you can learn.
 *   Turn both off before exposing a server.
 */
export function createGraphqlOptions(
  authorsService: AuthorsService,
  booksService: BooksService,
): ApolloDriverConfig {
  return {
    path: '/graphql',
    autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    sortSchema: true,
    introspection: process.env.NODE_ENV !== 'production',
    includeStacktraceInErrorResponses: false,
    csrfPrevention: true,
    subscriptions: {
      'graphql-ws': true,
    },
    transformSchema: (schema) => applyUpperDirective(schema),
    validationRules: [depthLimitRule],
    formatError: (formatted) => formatGraphqlError(formatted),
    plugins: [
      ApolloServerPluginCacheControl({ defaultMaxAge: 0 }),
      complexityLimitPlugin(),
      rateLimitPlugin(),
      loggingPlugin(),
      loaderStatsPlugin(),
    ],
    context: (source: GraphqlContextSource): GraphqlContext => {
      const stats = { authorBatches: 0, booksByAuthorBatches: 0 };
      return {
        user: userFromContextSource(source),
        clientKey: readClientKey(source),
        requestId: readRequestId(source),
        stats,
        loaders: {
          author: createAuthorLoader(authorsService, stats),
          booksByAuthor: createBooksByAuthorLoader(booksService, stats),
        },
      };
    },
  };
}
