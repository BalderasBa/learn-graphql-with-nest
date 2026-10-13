import DataLoader from 'dataloader';
import type { LoaderStats } from '../common/graphql-context.js';
import { Author } from './author.model.js';
import { AuthorsService } from './authors.service.js';
import type { Book } from '../books/book.model.js';
import { BooksService } from '../books/books.service.js';

/**
 * One DataLoader lives for one request. It collects the ids asked for during
 * that tick and loads them in a single call. A loader stored on a singleton
 * would also cache one user's rows for the next user, so it is created in
 * the GraphQL context factory instead.
 */
export function createAuthorLoader(
  authorsService: AuthorsService,
  stats: LoaderStats,
): DataLoader<string, Author> {
  return new DataLoader(async (ids) => {
    stats.authorBatches += 1;
    const authors = authorsService.findByIds(ids);
    const byId = new Map(authors.map((author) => [author.id, author]));
    return ids.map(
      (id) => byId.get(id) ?? new Error(`Author "${id}" was not found`),
    );
  });
}

export function createBooksByAuthorLoader(
  booksService: BooksService,
  stats: LoaderStats,
): DataLoader<string, Book[]> {
  return new DataLoader(async (authorIds) => {
    stats.booksByAuthorBatches += 1;
    return booksService.findByAuthorIds(authorIds);
  });
}
