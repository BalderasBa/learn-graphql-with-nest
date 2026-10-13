/** How many selection levels a document may contain, including fragment spreads. */
export const MAX_QUERY_DEPTH = 5;

/**
 * How expensive one operation may be. List fields cost extra, and aliases are
 * counted in full, because a variable can turn an `@include` back on.
 */
export const MAX_QUERY_COST = 50;

/** Added on top of the normal field cost when the field returns a list. */
export const LIST_FIELD_EXTRA_COST = 5;

/** Shared by the offset page and the cursor connection. */
export const MAX_PAGE_SIZE = 10;

/** The simple `books` query is capped so an unbounded list is not the real API. */
export const MAX_UNPAGED_BOOKS = 20;

export const MAX_UPLOAD_BYTES = 100_000;

/** Enough for GraphiQL's own traffic while you click around. */
export const RATE_LIMIT = 100;
export const RATE_WINDOW_MS = 60_000;

/** Application-cache lifetime for library stats. */
export const CACHE_TTL_MS = 15_000;

/** HTTP cache lifetime advertised for the stats field. */
export const HTTP_CACHE_MAX_AGE_SECONDS = 15;
