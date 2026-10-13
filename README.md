# learn-graphql-with-nest

A NestJS API for learning GraphQL. The schema is code-first: TypeScript classes are the source, and `src/schema.gql` is generated when the app starts. Books, authors, and reviews live in memory, so there is no database to install.

Paste the files in `examples/` into GraphiQL. Each file says which headers and variables to use. The **Docs** button in GraphiQL is the live schema.

## Run

```bash
npm install
npm run start:dev
```

Open [http://localhost:3000/graphql](http://localhost:3000/graphql).

`src/schema.gql` is rewritten at startup. Change the TypeScript, then restart. Do not edit that file.

```bash
npm test
npm run test:e2e
```

## Who you are

Queries are public. Mutations are not.

| Header | Who | Allowed |
| --- | --- | --- |
| none | anonymous | Queries only |
| `Authorization: Bearer reader-token` | Amina, reader | Queries and `addReview` |
| `Authorization: Bearer librarian-token` | Samir, librarian | Queries, reviews, catalog changes, uploads |

In GraphiQL, open **Headers** and paste:

```json
{ "Authorization": "Bearer librarian-token" }
```

These tokens are classroom stand-ins. `src/common/demo-users.ts` maps the string to a person. A real app would validate a session or a signed token before this point.

## 1. The query language

A GraphQL request names the fields it wants. The server runs only those resolvers.

**Fields.** `title` is stored on the book. `author` and `reviews` are not. They are field resolvers in `src/books/books.fields.ts`, and they run only when the document selects them.

**Arguments.** `book(id:)` chooses a row. `reviews(minRating:)` filters that book's reviews. An argument belongs to one field.

**Aliases.** Two selections of `book` would both be called `book` in the JSON. `pragmatic:` and `clean:` become the response keys.

**Operation name.** A document may contain more than one operation. GraphiQL's dropdown chooses which one runs. Without a name, that document is invalid.

**Variables.** The document stays fixed. The JSON variables change. Put them in GraphiQL's **Variables** panel.

**Fragments.** `fragment BookCard on Book` is a reusable selection. The response does not contain the fragment. The server inlines it first.

**Directives.**

- `@include(if:)` and `@skip(if:)` run before your resolver.
- `@deprecated` is set with `deprecationReason` on `authorName`. Use `author { name }` instead.
- `shoutedTitle` is uppercased after the resolver returns. That wrapper is `src/library/upper.directive.ts`.

**Mutations** use the same selection language, then change data. `createBook` publishes `bookCreated`.

Try:

- [`examples/01-fields-and-arguments.graphql`](examples/01-fields-and-arguments.graphql)
- [`examples/01-aliases-variables-fragments-directives.graphql`](examples/01-aliases-variables-fragments-directives.graphql)
- [`examples/01-complicated-query.graphql`](examples/01-complicated-query.graphql)
- [`examples/01-mutations.graphql`](examples/01-mutations.graphql) — resolver: `src/books/books.resolver.ts`

## 2. Authorization, subscriptions, validation

**Authorization** is a guard, not a field argument. `LibraryAuthGuard` and `LibrarianGuard` in `src/common/auth.guards.ts` read the header. `internalNote` is different: the book still loads, and that one field is null unless the caller is a librarian. Try [`examples/02-authorization.graphql`](examples/02-authorization.graphql).

**Subscriptions** stay open and push an event. This server uses `graphql-ws` on `ws://localhost:3000/graphql`. HTTP cannot carry them. Open two GraphiQL tabs, run `Listen` in the first, and create a book in the second. `authorId` filters which events that listener receives. `LibraryPubSub` only reaches clients on this process. A second server needs Redis, Postgres, or a queue. Try [`examples/02-subscriptions.graphql`](examples/02-subscriptions.graphql).

**Validation** has two layers. GraphQL checks that `year` is an `Int`. `IsPublicationYear` checks that the integer can be a publication year. A bad year comes back as `BAD_REQUEST`. `extensions.details` lists the messages. The stack trace is removed in `src/common/format-graphql-error.ts`. Try [`examples/02-validation.graphql`](examples/02-validation.graphql).

## 3. GraphQL over HTTP

GraphQL is the document. HTTP is the transport. Express listens on port 3000, and Apollo is mounted at `/graphql`. The wiring is `src/graphql/graphql.options.ts`.

| Request | Result |
| --- | --- |
| `POST /graphql` with `Content-Type: application/json` | Normal queries and mutations |
| `GET /graphql?query=...` plus `apollo-require-preflight: true` | Queries only |
| `GET` with no preflight header | Rejected as CSRF |
| `GET` of a mutation, even with the header | Rejected. GET cannot change data |
| `GET /health` | Plain HTTP for a load balancer. Not GraphQL |

The JSON body is `{ "query", "variables", "operationName" }`. `operationName` is required when the document contains two operations.

[`examples/03-serving-graphql-over-http.http`](examples/03-serving-graphql-over-http.http) is for an HTTP client or curl. GraphiQL already sends POST.

## 4. Pagination

`books` is capped at 20 and is not a page API.

`booksPage(page, pageSize)` is offset pagination. Page numbers are easy to explain. An insert at the top shifts every later page.

`booksConnection(first, after)` is cursor pagination. The client keeps `pageInfo.endCursor` and sends it back as `after`. It does not ask for "page 4".

`pageSize` and `first` must be from 1 to 10. Try [`examples/04-pagination.graphql`](examples/04-pagination.graphql). The implementation is `src/books/books.service.ts`.

## 5. File uploads

GraphQL responses are JSON. The image bytes are not part of that JSON.

`BookCover` carries `filename`, `size`, and `url`. The bytes are a normal `GET` of that url.

| Path | When to use it |
| --- | --- |
| `uploadBookCover` | A small base64 PNG inside GraphiQL |
| `POST /uploads/covers`, then `attachCover` | A real file. The form field name is `file` |

Both require the librarian token. The file must be a PNG, JPEG, or WebP, at most 100 KB, and the leading bytes must match the declared type. The upload id is generated by the server and is never used as a filesystem path.

Try [`examples/05-file-uploads.graphql`](examples/05-file-uploads.graphql). The code is in `src/uploads/`.

## 6. Caching

Two layers, both 15 seconds:

1. **Application cache.** `libraryStats` stores the counts in this process. The second call has `fromCache: true` and the same `computedAt`. Restarting clears it. Every caller shares it. See `src/cache/library-cache.service.ts`.
2. **HTTP cache.** The same field sets `Cache-Control: max-age=15`. Browsers and CDNs honor that on GET. GraphiQL sends POST, so the header shows up on the GET in the HTTP example, not in GraphiQL.

A client cache such as Apollo Client lives in the browser and is not part of this server.

Try [`examples/06-caching.graphql`](examples/06-caching.graphql).

## 7. Performance

`books { author { books { title } } }` looks like one query and runs several resolvers. Loading the author inside a loop would query once per book. That is the N+1 problem.

Each request gets its own DataLoader in `src/authors/author.loader.ts`. It collects the ids from that tick and loads them once. A loader kept on a singleton would also cache one user's rows for the next user.

The response includes `extensions.loaderBatches`. For the nested query, `authorBatches` should be `1`, not `6`. That extension is for this classroom. Remove `src/graphql/loader-stats.plugin.ts` before exposing a real API.

Try [`examples/07-performance.graphql`](examples/07-performance.graphql).

## 8. Security

The limits live in `src/security/limits.ts`.

| Control | Value | What it stops |
| --- | --- | --- |
| Depth | 5 levels, fragments included | A document that walks the whole graph |
| Cost | 50. Each field costs 1, each list costs 5 more | A wide document, including aliases |
| Page size | 10 | A request that asks for a huge page |
| Upload size | 100 KB, real image bytes | A file that only pretends to be an image |
| Rate limit | 100 requests per minute per socket, in this process | A tight loop from one client |
| Error shape | message, code, validation details | Stack traces and internal exceptions |
| Introspection | off when `NODE_ENV` is `production` | Publishing the schema by accident |

`@include` does not make a field free. The variable can turn it on, so the cost counter still counts it.

[`examples/08-security.graphql`](examples/08-security.graphql) contains `TooDeep` and `TooExpensive`. They are rejected before resolvers run. Use them on this server only.

## 9. A sturdier application

Expected failures and unexpected failures take different shapes.

`addReview` returns `AddReviewPayload`. A missing book, or a second review from the same person, sets `userErrors` and leaves `review` null. `data` is still present, so a form can show the strings. The reviewer name comes from the signed-in user. The input has no place to send someone else's name.

A missing token does not use `userErrors`. The guard throws, `data` is null, and `errors` carries the code.

`serviceInfo` describes the endpoint. `GET /health` is what a load balancer should call. `src/main.ts` enables shutdown hooks so the process can close the websocket server when it stops.

Try [`examples/09-robust-application.graphql`](examples/09-robust-application.graphql). The payload type is `src/reviews/add-review.payload.ts`.

## Where the code is

```text
src/graphql/graphql.options.ts   endpoint, plugins, limits
src/books/                       books, pages, cursors, mutations
src/authors/                     authors and DataLoaders
src/reviews/                     reviews and the userErrors payload
src/uploads/                     base64 mutation and the HTTP file route
src/cache/                       15-second stats cache
src/security/                    depth, cost, rate limit
src/common/                      tokens, guards, error formatting
src/library/                     health, pub/sub, serviceInfo
examples/                        documents to paste into GraphiQL
```
