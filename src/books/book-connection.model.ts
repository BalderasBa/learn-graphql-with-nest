import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Book } from './book.model.js';

/**
 * Cursor pagination, often called a connection. The client asks for `first`
 * items after a cursor. It does not ask for "page 4", so an insert on page 1
 * does not shift every later page.
 */
@ObjectType()
export class BookEdge {
  @Field({ description: 'Pass this back as `after` to read the next page' })
  cursor: string;

  @Field(() => Book)
  node: Book;
}

@ObjectType()
export class PageInfo {
  @Field(() => String, { nullable: true })
  endCursor: string | null;

  @Field()
  hasNextPage: boolean;
}

@ObjectType({ description: 'One window of the book list, plus how to ask for the next window' })
export class BookConnection {
  @Field(() => [BookEdge])
  edges: BookEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}
