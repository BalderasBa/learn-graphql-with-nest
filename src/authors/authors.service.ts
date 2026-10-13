import { Injectable } from '@nestjs/common';
import { Author } from './author.model.js';

const SEED_AUTHORS: readonly Author[] = [
  { id: 'a1', name: 'Andrew Hunt' },
  { id: 'a2', name: 'Robert C. Martin' },
  { id: 'a3', name: 'Eric Evans' },
  { id: 'a4', name: 'Martin Fowler' },
];

@Injectable()
export class AuthorsService {
  private readonly authors: Author[] = SEED_AUTHORS.map((author) => ({
    ...author,
  }));

  findById(id: string): Author | null {
    return this.authors.find((author) => author.id === id) ?? null;
  }

  findByIds(ids: readonly string[]): Author[] {
    const wanted = new Set(ids);
    return this.authors.filter((author) => wanted.has(author.id));
  }
}
