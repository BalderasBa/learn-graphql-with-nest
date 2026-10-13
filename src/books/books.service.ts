import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthorsService } from '../authors/authors.service.js';
import { MAX_PAGE_SIZE, MAX_UNPAGED_BOOKS } from '../security/limits.js';
import type { BookCover } from '../uploads/book-cover.model.js';
import { BookConnection } from './book-connection.model.js';
import { BookPage } from './book-page.model.js';
import { Book } from './book.model.js';
import { CreateBookInput } from './create-book.input.js';
import { UpdateBookInput } from './update-book.input.js';

const SEED_BOOKS: readonly Book[] = [
  seed('1', 'The Pragmatic Programmer', 1999, 'a1', 'Desk copy'),
  seed('2', 'Clean Code', 2008, 'a2', 'Course reading'),
  seed('3', 'Clean Architecture', 2017, 'a2', 'Second title by the same author'),
  seed('4', 'Domain-Driven Design', 2003, 'a3', 'Blue book'),
  seed('5', 'Refactoring', 1999, 'a4', 'First edition'),
  seed('6', 'Patterns of Enterprise Application Architecture', 2002, 'a4', 'PoEAA'),
];

@Injectable()
export class BooksService {
  private readonly books: Book[] = SEED_BOOKS.map((book) => ({ ...book }));

  constructor(private readonly authorsService: AuthorsService) {}

  findMany(search?: string): Book[] {
    return this.filter(search).slice(0, MAX_UNPAGED_BOOKS);
  }

  findOne(id: string): Book {
    const book = this.findById(id);
    if (!book) {
      throw new NotFoundException(`Book with id "${id}" was not found`);
    }
    return book;
  }

  findById(id: string): Book | null {
    return this.books.find((book) => book.id === id) ?? null;
  }

  findPage(page: number, pageSize: number, search?: string): BookPage {
    this.assertWindow(page, pageSize);
    const matched = this.filter(search);
    const totalCount = matched.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: matched.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  findConnection(first: number, after?: string, search?: string): BookConnection {
    this.assertWindow(1, first);
    const matched = this.filter(search);
    const start = this.startIndex(matched, after);
    const slice = matched.slice(start, start + first);
    const edges = slice.map((book) => ({
      cursor: encodeCursor(book.id),
      node: book,
    }));
    const lastEdge = edges.at(-1);
    return {
      edges,
      pageInfo: {
        endCursor: lastEdge?.cursor ?? null,
        hasNextPage: start + first < matched.length,
      },
      totalCount: matched.length,
    };
  }

  findByAuthorIds(authorIds: readonly string[]): Book[][] {
    return authorIds.map((authorId) =>
      this.sorted().filter((book) => book.authorId === authorId),
    );
  }

  count(): number {
    return this.books.length;
  }

  create(input: CreateBookInput): Book {
    this.assertAuthor(input.authorId);
    const book: Book = {
      id: randomUUID(),
      title: input.title,
      year: input.year,
      authorId: input.authorId,
      internalNote: input.internalNote ?? '',
      cover: null,
    };
    this.books.push(book);
    return book;
  }

  update(id: string, input: UpdateBookInput): Book {
    const book = this.findOne(id);
    if (input.authorId !== undefined) {
      this.assertAuthor(input.authorId);
      book.authorId = input.authorId;
    }
    if (input.title !== undefined) {
      book.title = input.title;
    }
    if (input.year !== undefined) {
      book.year = input.year;
    }
    if (input.internalNote !== undefined) {
      book.internalNote = input.internalNote;
    }
    return book;
  }

  remove(id: string): boolean {
    const index = this.books.findIndex((book) => book.id === id);
    if (index === -1) {
      throw new NotFoundException(`Book with id "${id}" was not found`);
    }
    this.books.splice(index, 1);
    return true;
  }

  setCover(bookId: string, cover: BookCover): Book {
    const book = this.findOne(bookId);
    book.cover = cover;
    return book;
  }

  private assertAuthor(authorId: string): void {
    if (!this.authorsService.findById(authorId)) {
      throw new BadRequestException(`Author "${authorId}" was not found`);
    }
  }

  private assertWindow(page: number, pageSize: number): void {
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page must be an integer starting at 1');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new BadRequestException(
        `pageSize and first must be from 1 to ${MAX_PAGE_SIZE}`,
      );
    }
  }

  private startIndex(books: Book[], after?: string): number {
    if (!after) {
      return 0;
    }
    const id = decodeCursor(after);
    const index = books.findIndex((book) => book.id === id);
    if (index === -1) {
      throw new BadRequestException('Unknown pagination cursor');
    }
    return index + 1;
  }

  private filter(search?: string): Book[] {
    const needle = search?.trim().toLowerCase();
    const sorted = this.sorted();
    if (!needle) {
      return sorted;
    }
    return sorted.filter((book) => book.title.toLowerCase().includes(needle));
  }

  private sorted(): Book[] {
    return [...this.books].sort((left, right) => left.id.localeCompare(right.id));
  }
}

function seed(
  id: string,
  title: string,
  year: number,
  authorId: string,
  internalNote: string,
): Book {
  return { id, title, year, authorId, internalNote, cover: null };
}

export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}
