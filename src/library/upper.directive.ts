import { type GraphQLSchema, defaultFieldResolver } from 'graphql';

/**
 * What a custom `@upper` directive would do at runtime: run the field's
 * resolver, then change the value. The spec directives you will use first
 * are `@skip`, `@include`, and `@deprecated`. Those are already built in.
 * This wrapper is attached by field name so the lesson does not have to
 * construct a GraphQLDirective (two copies of the graphql package reject
 * each other's directive objects).
 */
export function applyUpperDirective(schema: GraphQLSchema): GraphQLSchema {
  const bookType = schema.getType('Book');
  if (!bookType || !hasFields(bookType)) {
    return schema;
  }
  const field = bookType.getFields().shoutedTitle;
  if (!field) {
    return schema;
  }
  const original = field.resolve ?? defaultFieldResolver;
  field.resolve = async (source, args, context, info) => {
    const value: unknown = await original(source, args, context, info);
    return typeof value === 'string' ? value.toUpperCase() : value;
  };
  return schema;
}

function hasFields(
  type: unknown,
): type is { getFields: () => Record<string, { resolve?: GraphQLFieldResolver }> } {
  return typeof type === 'object' && type !== null && 'getFields' in type;
}

type GraphQLFieldResolver = (
  source: unknown,
  args: unknown,
  context: unknown,
  info: Parameters<typeof defaultFieldResolver>[3],
) => unknown;
