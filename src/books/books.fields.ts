import {
  Args,
  Context,
  Int,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Author } from '../authors/author.model.js';
import type { GraphqlContext } from '../common/graphql-context.js';
import { LibraryRole } from '../common/library-role.js';
import { Review } from '../reviews/review.model.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { Book } from './book.model.js';

/**
 * Field resolvers run only for fields the client actually selected.
 * Asking for `title` does not load the author. Asking for `author { books }`
 * does, and the DataLoader batches those loads.
 */
@Resolver(() => Book)
export class BooksFieldsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ResolveField(() => Author)
  author(
    @Parent() book: Book,
    @Context() context: GraphqlContext,
  ): Promise<Author> {
    return context.loaders.author.load(book.authorId);
  }

  @ResolveField(() => [Review], {
    description: 'Pass minRating to drop weaker reviews. This is a field argument.',
  })
  reviews(
    @Parent() book: Book,
    @Args('minRating', { type: () => Int, nullable: true }) minRating?: number,
  ): Review[] {
    return this.reviewsService.findByBookId(book.id, minRating);
  }

  /**
   * Returns the plain title. `applyUpperDirective` then uppercases it.
   * `@skip` and `@include` are different: GraphQL drops the field before
   * this method runs. See the examples folder.
   */
  @ResolveField(() => String, {
    description: 'The title in uppercase. Wrapped after the resolver returns.',
  })
  shoutedTitle(@Parent() book: Book): string {
    return book.title;
  }

  @ResolveField(() => String, {
    deprecationReason: 'Use author { name } instead.',
  })
  async authorName(
    @Parent() book: Book,
    @Context() context: GraphqlContext,
  ): Promise<string> {
    const author = await context.loaders.author.load(book.authorId);
    return author.name;
  }

  /**
   * Field-level authorization. A reader can load the book, but this one
   * field stays null. Throwing here would fail the whole book selection.
   */
  @ResolveField(() => String, { nullable: true })
  internalNote(
    @Parent() book: Book,
    @Context() context: GraphqlContext,
  ): string | null {
    if (context.user?.role !== LibraryRole.LIBRARIAN) {
      return null;
    }
    return book.internalNote;
  }
}
