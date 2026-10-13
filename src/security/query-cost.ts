import {
  Kind,
  type DocumentNode,
  type FragmentDefinitionNode,
  type GraphQLObjectType,
  type GraphQLSchema,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from 'graphql';
import { LIST_FIELD_EXTRA_COST } from './limits.js';

interface UnwrappedType {
  isList: boolean;
  objectType: GraphQLObjectType | null;
}

/**
 * Every selected field costs 1. A list costs more because one field can fan
 * out into many rows. `@skip` and `@include` are still counted: the variable
 * that controls them arrives with the request, so a cheap-looking document
 * can become an expensive one.
 */
export function calculateOperationCost(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName?: string | null,
): number {
  const operation = selectOperation(document, operationName);
  if (!operation) {
    return 0;
  }
  const root = rootType(schema, operation);
  if (!root) {
    return 0;
  }
  return selectionCost(schema, operation.selectionSet, root, document, new Set());
}

export function isIntrospectionDocument(
  document: DocumentNode,
  operationName?: string | null,
): boolean {
  if (operationName === 'IntrospectionQuery') {
    return true;
  }
  const operation = selectOperation(document, operationName);
  if (!operation) {
    return false;
  }
  const fields = operation.selectionSet.selections.filter(
    (selection) => selection.kind === Kind.FIELD,
  );
  return (
    fields.length > 0 &&
    fields.every(
      (selection) =>
        selection.kind === Kind.FIELD && selection.name.value.startsWith('__'),
    )
  );
}

function selectOperation(
  document: DocumentNode,
  operationName?: string | null,
): OperationDefinitionNode | undefined {
  const operations = document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (operationName) {
    return operations.find((operation) => operation.name?.value === operationName);
  }
  return operations[0];
}

function rootType(
  schema: GraphQLSchema,
  operation: OperationDefinitionNode,
): GraphQLObjectType | null {
  if (operation.operation === 'mutation') {
    return schema.getMutationType() ?? null;
  }
  if (operation.operation === 'subscription') {
    return schema.getSubscriptionType() ?? null;
  }
  return schema.getQueryType() ?? null;
}

function selectionCost(
  schema: GraphQLSchema,
  selectionSet: SelectionSetNode,
  parent: GraphQLObjectType,
  document: DocumentNode,
  visitedFragments: Set<string>,
): number {
  let cost = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      if (selection.name.value === '__typename') {
        cost += 1;
        continue;
      }
      const field = parent.getFields()[selection.name.value];
      if (!field) {
        continue;
      }
      const unwrapped = unwrap(field.type);
      cost += 1 + (unwrapped.isList ? LIST_FIELD_EXTRA_COST : 0);
      if (selection.selectionSet && unwrapped.objectType) {
        cost += selectionCost(
          schema,
          selection.selectionSet,
          unwrapped.objectType,
          document,
          visitedFragments,
        );
      }
      continue;
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      const nextParent = objectTypeFromName(
        schema,
        parent,
        selection.typeCondition?.name.value,
      );
      cost += selectionCost(
        schema,
        selection.selectionSet,
        nextParent,
        document,
        visitedFragments,
      );
      continue;
    }
    if (visitedFragments.has(selection.name.value)) {
      continue;
    }
    const fragment = findFragment(document, selection.name.value);
    if (!fragment) {
      continue;
    }
    const nextVisited = new Set(visitedFragments);
    nextVisited.add(selection.name.value);
    const nextParent = objectTypeFromName(
      schema,
      parent,
      fragment.typeCondition.name.value,
    );
    cost += selectionCost(
      schema,
      fragment.selectionSet,
      nextParent,
      document,
      nextVisited,
    );
  }
  return cost;
}

function objectTypeFromName(
  schema: GraphQLSchema,
  parent: GraphQLObjectType,
  typeName?: string,
): GraphQLObjectType {
  if (!typeName) {
    return parent;
  }
  const named = schema.getType(typeName);
  return constructorName(named) === 'GraphQLObjectType'
    ? (named as GraphQLObjectType)
    : parent;
}

function findFragment(
  document: DocumentNode,
  name: string,
): FragmentDefinitionNode | undefined {
  return document.definitions.find(
    (definition): definition is FragmentDefinitionNode =>
      definition.kind === Kind.FRAGMENT_DEFINITION && definition.name.value === name,
  );
}

function unwrap(type: unknown): UnwrappedType {
  let isList = false;
  let current = type;
  while (
    constructorName(current) === 'GraphQLNonNull' ||
    constructorName(current) === 'GraphQLList'
  ) {
    if (constructorName(current) === 'GraphQLList') {
      isList = true;
    }
    current = (current as { ofType: unknown }).ofType;
  }
  return {
    isList,
    objectType:
      constructorName(current) === 'GraphQLObjectType'
        ? (current as GraphQLObjectType)
        : null,
  };
}

function constructorName(value: unknown): string {
  return typeof value === 'object' && value !== null ? value.constructor.name : '';
}
