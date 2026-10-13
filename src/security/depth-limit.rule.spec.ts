import { buildSchema, parse, validate } from 'graphql';
import { depthLimitRule } from './depth-limit.rule.js';

const schema = buildSchema(`
  type Query {
    books: [Book!]!
  }
  type Book {
    title: String!
    author: Author!
  }
  type Author {
    name: String!
    books: [Book!]!
  }
`);

function depthErrors(source: string): string[] {
  return validate(schema, parse(source), [depthLimitRule])
    .filter((error) => error.message.includes('Query depth'))
    .map((error) => error.message);
}

describe('depthLimitRule', () => {
  it('allows a shallow selection', () => {
    expect(depthErrors('{ books { title author { name } } }')).toEqual([]);
  });

  it('counts a fragment the same as inlined fields', () => {
    const source = `
      { books { ...Card } }
      fragment Card on Book { author { name } }
    `;
    expect(depthErrors(source)).toEqual([]);
  });

  it('rejects a walk that is deeper than the limit', () => {
    const source = `
      { books { author { books { author { books { title } } } } } }
    `;
    expect(depthErrors(source)[0]).toContain('above the limit');
  });

  it('leaves introspection alone so GraphiQL can load the docs', () => {
    const source = `
      { __schema { types { fields { type { name fields { name } } } } } }
    `;
    expect(depthErrors(source)).toEqual([]);
  });
});
