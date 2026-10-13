import { ValidateBy, type ValidationOptions } from 'class-validator';

const FIRST_PRINTING_YEAR = 1450;

/**
 * A custom class-validator check. GraphQL only knows that `year` is an Int.
 * This rejects numbers that are ints but cannot be publication years, such as 12.
 */
export function IsPublicationYear(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isPublicationYear',
      validator: {
        validate: (value: unknown): boolean => {
          const newestYear = new Date().getFullYear() + 1;
          return (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= FIRST_PRINTING_YEAR &&
            value <= newestYear
          );
        },
        defaultMessage: (): string =>
          'year must be a publication year from 1450 through next year',
      },
    },
    validationOptions,
  );
}
