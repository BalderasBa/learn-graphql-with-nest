import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * `fromCache` is our in-memory cache. The HTTP Cache-Control header is a
 * second layer, set from the libraryStats resolver for GET requests.
 */
@ObjectType({ description: 'Counts that are safe to reuse for a few seconds' })
export class LibraryStats {
  @Field(() => Int)
  bookCount: number;

  @Field(() => Int)
  reviewCount: number;

  @Field()
  fromCache: boolean;

  @Field()
  computedAt: string;
}
