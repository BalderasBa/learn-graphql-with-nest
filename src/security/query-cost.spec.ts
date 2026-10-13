import { buildSchema, parse } from 'graphql';
import { calculateOperationCost } from './query-cost.js';

const schema = buildSchema(`
  type Query {
    books: [Book!]!
    book(id: ID!): Book!
  }
  type Book {
    title: String!
    author: Author
    reviews: [Review!]!
  }
  type Author { name: String! }
  type Review { body: String! }
`);

function cost(source: string, operationName?: string): number {
  return calculateOperationCost(schema, parse(source), operationName);
}

describe('calculateOperationCost', () => {
  it('charges extra for list fields', () => {
    expect(cost('{ book(id: "1") { title } }')).toBeLessThan(
      cost('{ books { title } }'),
    );
  });

  it('counts a fragment and an alias', () => {
    const source = `
      query Two {
        one: books { ...Card }
        two: books { ...Card }
      }
      fragment Card on Book { title author { name } }
    `;
    expect(cost(source, 'Two')).toBe(cost('{ books { title author { name } } }') * 2);
  });

  it('costs only the operation named in the request', () => {
    const source = `
      query Cheap { book(id: "1") { title } }
      query Wide { books { title reviews { body } } }
    `;
    expect(cost(source, 'Cheap')).toBeLessThan(cost(source, 'Wide'));
  });
});
