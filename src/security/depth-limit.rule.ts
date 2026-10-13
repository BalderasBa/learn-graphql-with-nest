import {
  GraphQLError,
  Kind,
  type SelectionSetNode,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';
import { MAX_QUERY_DEPTH } from './limits.js';

/**
 * Rejects documents that walk too far down the graph.
 * Depth is counted on the document, so a fragment spread is as deep as the
 * fields it pulls in. Hiding a cycle inside fragments does not get a free pass.
 * Introspection is exempt: GraphiQL cannot open the docs without it.
 */
export const depthLimitRule: ValidationRule = (context) => ({
  OperationDefinition(node) {
    if (node.name?.value === 'IntrospectionQuery') {
      return;
    }
    const rootFields = node.selectionSet.selections.filter(
      (selection) => selection.kind === Kind.FIELD,
    );
    const isIntrospection =
      rootFields.length > 0 &&
      rootFields.every(
        (selection) =>
          selection.kind === Kind.FIELD && selection.name.value.startsWith('__'),
      );
    if (isIntrospection) {
      return;
    }
    const depth = selectionDepth(node.selectionSet, context, new Set());
    if (depth > MAX_QUERY_DEPTH) {
      context.reportError(
        new GraphQLError(
          `Query depth ${depth} is above the limit of ${MAX_QUERY_DEPTH}. Ask for a shallower selection.`,
          {
            nodes: [node],
            extensions: {
              code: 'QUERY_TOO_DEEP',
              depth,
              maxDepth: MAX_QUERY_DEPTH,
            },
          },
        ),
      );
    }
  },
});

function selectionDepth(
  selectionSet: SelectionSetNode | undefined,
  context: ValidationContext,
  visitedFragments: Set<string>,
): number {
  if (!selectionSet) {
    return 0;
  }
  let deepest = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      deepest = Math.max(
        deepest,
        1 + selectionDepth(selection.selectionSet, context, visitedFragments),
      );
      continue;
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      deepest = Math.max(
        deepest,
        selectionDepth(selection.selectionSet, context, visitedFragments),
      );
      continue;
    }
    if (visitedFragments.has(selection.name.value)) {
      continue;
    }
    const fragment = context.getFragment(selection.name.value);
    if (!fragment) {
      continue;
    }
    const nextVisited = new Set(visitedFragments);
    nextVisited.add(selection.name.value);
    deepest = Math.max(
      deepest,
      selectionDepth(fragment.selectionSet, context, nextVisited),
    );
  }
  return deepest;
}
