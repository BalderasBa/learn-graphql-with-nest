import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BookCover } from '../uploads/book-cover.model.js';

/**
 * Fields on this class are the book's own columns. `author`, `reviews`, and
 * `shoutedTitle` are added by field resolvers, because they are not stored
 * as columns on the book.
 */
@ObjectType({ description: 'A book in the catalog' })
export class Book {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => Int)
  year: number;

  @Field(() => BookCover, { nullable: true })
  cover: BookCover | null;

  /** Used by resolvers. Not a GraphQL field, so clients cannot select it. */
  authorId: string;

  /** Returned only by the internalNote resolver, and only to a librarian. */
  internalNote: string;
}
