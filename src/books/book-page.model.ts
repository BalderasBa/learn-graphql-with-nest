import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Book } from './book.model.js';

/** Page numbers. Easy to explain, awkward when rows are inserted in the middle. */
@ObjectType({ description: 'A page of books, counted from page 1' })
export class BookPage {
  @Field(() => [Book])
  items: Book[];

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  totalPages: number;
}
