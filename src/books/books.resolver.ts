import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { LibrarianGuard } from '../common/auth.guards.js';
import { LibraryPubSub } from '../library/library-pub-sub.js';
import { MAX_PAGE_SIZE } from '../security/limits.js';
import { BookConnection } from './book-connection.model.js';
import { BookPage } from './book-page.model.js';
import { Book } from './book.model.js';
import { BooksService } from './books.service.js';
import { CreateBookInput } from './create-book.input.js';
import { UpdateBookInput } from './update-book.input.js';

@Resolver(() => Book)
export class BooksResolver {
  constructor(
    private readonly booksService: BooksService,
    private readonly pubSub: LibraryPubSub,
  ) {}

  @Query(() => [Book], {
    description:
      'Every matching book, capped at 20. Use booksPage or booksConnection for a real list.',
  })
  books(
    @Args('search', { type: () => String, nullable: true }) search?: string,
  ): Book[] {
    return this.booksService.findMany(search);
  }

  @Query(() => Book, { description: 'One book. The id argument selects which row.' })
  book(@Args('id', { type: () => ID }) id: string): Book {
    return this.booksService.findOne(id);
  }

  @Query(() => BookPage, {
    description: 'Offset pagination. page starts at 1.',
  })
  booksPage(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 2 }) pageSize: number,
    @Args('search', { type: () => String, nullable: true }) search?: string,
  ): BookPage {
    return this.booksService.findPage(page, pageSize, search);
  }

  @Query(() => BookConnection, {
    description: `Cursor pagination. first is at most ${MAX_PAGE_SIZE}.`,
  })
  booksConnection(
    @Args('first', { type: () => Int, defaultValue: 2 }) first: number,
    @Args('after', { type: () => String, nullable: true }) after?: string,
    @Args('search', { type: () => String, nullable: true }) search?: string,
  ): BookConnection {
    return this.booksService.findConnection(first, after, search);
  }

  @Mutation(() => Book, { description: 'Librarian only. Publishes bookCreated.' })
  @UseGuards(LibrarianGuard)
  createBook(@Args('input') input: CreateBookInput): Book {
    const book = this.booksService.create(input);
    this.pubSub.publish('bookCreated', { bookCreated: book });
    return book;
  }

  @Mutation(() => Book)
  @UseGuards(LibrarianGuard)
  updateBook(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateBookInput,
  ): Book {
    return this.booksService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(LibrarianGuard)
  deleteBook(@Args('id', { type: () => ID }) id: string): boolean {
    return this.booksService.remove(id);
  }

  /**
   * The published value is `{ bookCreated: book }` because a subscription
   * result is an object whose key is the field name. `authorId` filters
   * which events this listener receives. Omit it to hear about every book.
   */
  @Subscription(() => Book, {
    filter: (
      payload: { bookCreated: Book },
      variables: { authorId?: string | null },
    ) => !variables.authorId || payload.bookCreated.authorId === variables.authorId,
  })
  bookCreated(
    @Args('authorId', { type: () => ID, nullable: true }) authorId?: string,
  ): AsyncIterableIterator<{ bookCreated: Book }> {
    void authorId;
    return this.pubSub.asyncIterator('bookCreated');
  }
}
