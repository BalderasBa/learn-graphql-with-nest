import { randomUUID } from 'node:crypto';
import type DataLoader from 'dataloader';
import type { Request } from 'express';
import type { Author } from '../authors/author.model.js';
import type { Book } from '../books/book.model.js';
import { userFromAuthorizationHeader } from './demo-users.js';
import type { LibraryUser } from './library-user.model.js';

export interface LoaderStats {
  authorBatches: number;
  booksByAuthorBatches: number;
}

export interface GraphqlContext {
  user: LibraryUser | null;
  /** Address used by the classroom rate limiter. */
  clientKey: string;
  requestId: string;
  stats: LoaderStats;
  loaders: {
    author: DataLoader<string, Author>;
    booksByAuthor: DataLoader<string, Book[]>;
  };
}

/**
 * HTTP requests arrive as `{ req }`. graphql-ws subscriptions arrive as
 * `{ connectionParams }`. One function serves both so resolvers always see
 * the same context shape.
 */
export interface GraphqlContextSource {
  req?: Request;
  connectionParams?: Readonly<Record<string, unknown>> | null;
}

export function readAuthorization(source: GraphqlContextSource): string | undefined {
  const header = source.req?.headers?.authorization;
  if (typeof header === 'string') {
    return header;
  }
  const params = source.connectionParams;
  if (!params) {
    return undefined;
  }
  const value = params.authorization ?? params.Authorization;
  return typeof value === 'string' ? value : undefined;
}

export function readRequestId(source: GraphqlContextSource): string {
  const header = source.req?.headers?.['x-request-id'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return header.trim().slice(0, 80);
  }
  return randomUUID();
}

export function readClientKey(source: GraphqlContextSource): string {
  return source.req?.ip ?? source.req?.socket?.remoteAddress ?? 'subscription';
}

export function userFromContextSource(source: GraphqlContextSource): LibraryUser | null {
  return userFromAuthorizationHeader(readAuthorization(source));
}
