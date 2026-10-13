import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from 'graphql-ws';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { LIBRARIAN_TOKEN, READER_TOKEN } from './../src/common/demo-users.js';
import { SAMPLE_PNG_BASE64 } from './../src/uploads/sample-png.js';
import { AppModule } from './../src/app.module.js';

describe('Library GraphQL (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns nested fields and an uppercased directive result', () => {
    return post(app, '{ books { id title shoutedTitle author { name } } }').expect(
      (response) => {
        const first = response.body.data.books[0];
        expect(first).toMatchObject({
          id: '1',
          title: 'The Pragmatic Programmer',
          shoutedTitle: 'THE PRAGMATIC PROGRAMMER',
          author: { name: 'Andrew Hunt' },
        });
        expect(response.body.extensions.loaderBatches.authorBatches).toBe(1);
      },
    );
  });

  it('runs the combined lesson query', () => {
    return post(
      app,
      `
        query LibraryTour($bookId: ID!, $withAuthor: Boolean!, $minRating: Int!) {
          catalog: books(search: "clean") {
            ...BookCard
            highReviews: reviews(minRating: $minRating) { rating }
          }
          featured: book(id: $bookId) {
            ...BookCard
            authorName @skip(if: $withAuthor)
          }
        }
        fragment BookCard on Book {
          id
          title
          shoutedTitle
          author @include(if: $withAuthor) { name }
        }
      `,
      { bookId: '1', withAuthor: true, minRating: 5 },
      undefined,
      'LibraryTour',
    ).expect((response) => {
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.catalog).toHaveLength(2);
      expect(response.body.data.featured.shoutedTitle).toBe('THE PRAGMATIC PROGRAMMER');
      expect(response.body.data.featured.authorName).toBeUndefined();
    });
  });

  it('runs one named operation when the document contains two', () => {
    return post(
      app,
      `
        query Service { serviceInfo { name } }
        query Stats { libraryStats { bookCount } }
      `,
      undefined,
      undefined,
      'Service',
    ).expect((response) => {
      expect(response.body.data.serviceInfo.name).toBe('learn-graphql-with-nest');
      expect(response.body.data.libraryStats).toBeUndefined();
    });
  });

  it('pages books and continues from a cursor', async () => {
    const page = await post(
      app,
      '{ booksPage(page: 1, pageSize: 2) { totalCount items { id } } }',
    );
    expect(page.body.data.booksPage.totalCount).toBe(6);
    expect(page.body.data.booksPage.items).toHaveLength(2);
    const connection = await post(
      app,
      '{ booksConnection(first: 2) { pageInfo { endCursor hasNextPage } edges { node { id } } } }',
    );
    const cursor = connection.body.data.booksConnection.pageInfo.endCursor;
    const next = await post(
      app,
      'query Next($after: String) { booksConnection(first: 2, after: $after) { edges { node { id } } } }',
      { after: cursor },
    );
    expect(next.body.data.booksConnection.edges.map((edge: { node: { id: string } }) => edge.node.id)).toEqual([
      '3',
      '4',
    ]);
  });

  it('hides the internal note until a librarian asks', async () => {
    const anonymous = await post(app, '{ book(id: "1") { internalNote } }');
    expect(anonymous.body.data.book.internalNote).toBeNull();
    const librarian = await post(
      app,
      '{ book(id: "1") { internalNote } }',
      undefined,
      LIBRARIAN_TOKEN,
    );
    expect(librarian.body.data.book.internalNote).toBe('Desk copy');
  });

  it('rejects a catalog change without the librarian token', async () => {
    const anonymous = await post(app, createBookQuery, createBookVariables);
    expect(anonymous.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    const reader = await post(app, createBookQuery, createBookVariables, READER_TOKEN);
    expect(reader.body.errors[0].extensions.code).toBe('FORBIDDEN');
  });

  it('creates a book for a librarian', () => {
    return post(app, createBookQuery, createBookVariables, LIBRARIAN_TOKEN).expect(
      (response) => {
        expect(response.body.data.createBook.title).toBe('Test Driven Development');
        expect(response.body.errors).toBeUndefined();
      },
    );
  });

  it('returns validation details for a bad year', () => {
    return post(
      app,
      createBookQuery,
      {
        input: { title: 'Too Old', authorId: 'a1', year: 1200 },
      },
      LIBRARIAN_TOKEN,
    ).expect((response) => {
      expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
      expect(response.body.errors[0].extensions.details).toEqual(
        expect.arrayContaining([expect.stringContaining('publication year')]),
      );
      expect(response.body.errors[0].extensions.originalError).toBeUndefined();
      expect(response.body.errors[0].extensions.stacktrace).toBeUndefined();
      expect(response.body.errors[0].extensions.stacktrace).toBeUndefined();
    });
  });

  it('reports a duplicate review in userErrors', () => {
    return post(
      app,
      `
        mutation { addReview(input: { bookId: "1", rating: 5, body: "Read it again." }) {
          review { id }
          userErrors
        } }
      `,
      undefined,
      READER_TOKEN,
    ).expect((response) => {
      expect(response.body.data.addReview.review).toBeNull();
      expect(response.body.data.addReview.userErrors).toEqual([
        'You already reviewed this book',
      ]);
    });
  });

  it('rejects a document that walks too deep', () => {
    return post(
      app,
      '{ books { author { books { author { books { title } } } } } }',
    ).expect((response) => {
      expect(response.body.errors[0].message).toContain('Query depth');
    });
  });

  it('rejects a wide alias query that costs too much', () => {
    const selection =
      'books { id title year author { id name } reviews { id rating body reviewerName } }';
    return post(
      app,
      `query TooExpensive { one: ${selection} two: ${selection} three: ${selection} }`,
    ).expect((response) => {
      expect(response.body.errors[0].message).toContain('Query cost');
    });
  });

  it('answers a query over HTTP GET and refuses a mutation on GET', async () => {
    const queryResponse = await request(app.getHttpServer())
      .get('/graphql')
      .set('apollo-require-preflight', 'true')
      .query({ query: '{ serviceInfo { graphqlPath transports } }' });
    expect(queryResponse.status).toBe(200);
    expect(queryResponse.body.data.serviceInfo.transports).toContain('http-get');
    const mutationResponse = await request(app.getHttpServer())
      .get('/graphql')
      .set('apollo-require-preflight', 'true')
      .query({ query: 'mutation { deleteBook(id: "1") }' });
    expect(mutationResponse.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(mutationResponse.body)).toContain('only support query operations');
    const forged = await request(app.getHttpServer())
      .get('/graphql')
      .query({ query: '{ serviceInfo { name } }' });
    expect(forged.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(forged.body)).toContain('CSRF');
  });

  it('marks the second stats read as a cache hit', async () => {
    const first = await post(app, '{ libraryStats { bookCount fromCache computedAt } }');
    const second = await post(app, '{ libraryStats { bookCount fromCache computedAt } }');
    expect(first.body.data.libraryStats.fromCache).toBe(false);
    expect(second.body.data.libraryStats).toMatchObject({
      fromCache: true,
      bookCount: first.body.data.libraryStats.bookCount,
      computedAt: first.body.data.libraryStats.computedAt,
    });
  });

  it('advertises a cache header for stats', () => {
    return request(app.getHttpServer())
      .get('/graphql')
      .set('apollo-require-preflight', 'true')
      .query({ query: '{ libraryStats { bookCount } }' })
      .expect(200)
      .expect('cache-control', /max-age=15/);
  });

  it('stores a base64 cover and serves the bytes over HTTP', async () => {
    const uploaded = await post(
      app,
      `
        mutation Cover($input: UploadCoverInput!) {
          uploadBookCover(input: $input) { cover { uploadId filename url } }
        }
      `,
      {
        input: {
          bookId: '1',
          filename: 'dot.png',
          mimeType: 'image/png',
          contentBase64: SAMPLE_PNG_BASE64,
        },
      },
      LIBRARIAN_TOKEN,
    );
    const url = uploaded.body.data.uploadBookCover.cover.url as string;
    const download = await request(app.getHttpServer()).get(url);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toContain('image/png');
  });

  it('accepts a multipart upload and attaches it', async () => {
    const uploaded = await request(app.getHttpServer())
      .post('/uploads/covers')
      .set('Authorization', `Bearer ${LIBRARIAN_TOKEN}`)
      .attach('file', Buffer.from(SAMPLE_PNG_BASE64, 'base64'), {
        filename: 'dot.png',
        contentType: 'image/png',
      });
    expect(uploaded.status).toBe(201);
    const attached = await post(
      app,
      'mutation Attach($uploadId: ID!) { attachCover(bookId: "2", uploadId: $uploadId) { cover { filename } } }',
      { uploadId: uploaded.body.uploadId },
      LIBRARIAN_TOKEN,
    );
    expect(attached.body.data.attachCover.cover.filename).toBe('dot.png');
  });

  it('answers the health check outside GraphQL', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('pushes bookCreated over graphql-ws', async () => {
    await app.listen(0);
    const httpServer = app.getHttpServer() as Server;
    const address = httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected the test server to listen on a TCP port');
    }
    const client = createClient({
      url: `ws://127.0.0.1:${address.port}/graphql`,
      webSocketImpl: WebSocket,
    });
    try {
      const connected = new Promise<void>((resolve, reject) => {
        client.on('connected', () => resolve());
        client.on('error', (error) => reject(asError(error)));
      });
      const received = new Promise<unknown>((resolve, reject) => {
        client.subscribe(
          { query: 'subscription { bookCreated { title } }' },
          {
            next: (value) => resolve(value),
            error: (error) => reject(asError(error)),
            complete: () => undefined,
          },
        );
      });
      await connected;
      await post(app, createBookQuery, createBookVariables, LIBRARIAN_TOKEN);
      await expect(received).resolves.toMatchObject({
        data: { bookCreated: { title: 'Test Driven Development' } },
      });
    } finally {
      await client.dispose();
    }
  }, 15_000);
});

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(JSON.stringify(error));
}

const createBookQuery = `
  mutation Create($input: CreateBookInput!) {
    createBook(input: $input) { title }
  }
`;

const createBookVariables = {
  input: {
    title: 'Test Driven Development',
    authorId: 'a2',
    year: 2002,
  },
};

function post(
  app: INestApplication<App>,
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
  operationName?: string,
): request.Test {
  const call = request(app.getHttpServer())
    .post('/graphql')
    .send({ query, variables, operationName });
  if (token) {
    call.set('Authorization', `Bearer ${token}`);
  }
  return call;
}
