import { Context, Info, Query, Resolver } from '@nestjs/graphql';
import type { GraphQLResolveInfo } from 'graphql';
import { BooksService } from '../books/books.service.js';
import { LibraryCacheService } from '../cache/library-cache.service.js';
import { LibraryStats } from '../cache/library-stats.model.js';
import type { GraphqlContext } from '../common/graphql-context.js';
import { LibraryUser } from '../common/library-user.model.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { HTTP_CACHE_MAX_AGE_SECONDS } from '../security/limits.js';
import { ServiceInfo } from './service-info.model.js';

interface CacheControlInfo extends GraphQLResolveInfo {
  cacheControl?: {
    setCacheHint: (hint: { maxAge: number; scope: 'PUBLIC' | 'PRIVATE' }) => void;
  };
}

@Resolver()
export class LibraryResolver {
  constructor(
    private readonly booksService: BooksService,
    private readonly reviewsService: ReviewsService,
    private readonly cache: LibraryCacheService,
  ) {}

  @Query(() => LibraryUser, {
    nullable: true,
    description: 'Null until the request carries a known bearer token',
  })
  me(@Context() context: GraphqlContext): LibraryUser | null {
    return context.user;
  }

  @Query(() => LibraryStats, {
    description: 'Cached for 15 seconds. Call it twice and watch fromCache.',
  })
  libraryStats(@Info() info: CacheControlInfo): LibraryStats {
    // Apollo turns this hint into a Cache-Control header on the HTTP response.
    info.cacheControl?.setCacheHint({
      maxAge: HTTP_CACHE_MAX_AGE_SECONDS,
      scope: 'PUBLIC',
    });
    return this.cache.rememberStats(() => ({
      bookCount: this.booksService.count(),
      reviewCount: this.reviewsService.count(),
      computedAt: new Date().toISOString(),
    }));
  }

  @Query(() => ServiceInfo, {
    description: 'Plain facts about the HTTP and websocket endpoints',
  })
  serviceInfo(): ServiceInfo {
    return {
      name: 'learn-graphql-with-nest',
      graphqlPath: '/graphql',
      transports: ['http-post', 'http-get', 'graphql-ws'],
      introspectionEnabled: process.env.NODE_ENV !== 'production',
    };
  }
}
