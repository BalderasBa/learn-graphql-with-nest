import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import type { GraphqlContext } from '../common/graphql-context.js';
import { Book } from '../books/book.model.js';
import { Author } from './author.model.js';

@Resolver(() => Author)
export class AuthorsResolver {
  @ResolveField(() => [Book], {
    description: 'Books by this author. Loaded in one batch for the whole request.',
  })
  books(
    @Parent() author: Author,
    @Context() context: GraphqlContext,
  ): Promise<Book[]> {
    return context.loaders.booksByAuthor.load(author.id);
  }
}
