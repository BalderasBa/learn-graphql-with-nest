import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * Metadata only. The bytes are fetched with a normal HTTP GET to `url`.
 * Putting the file in the GraphQL response would repeat it for every query
 * that happens to select the book.
 */
@ObjectType({ description: 'A cover image stored beside the book, not inside the JSON' })
export class BookCover {
  @Field()
  uploadId: string;

  @Field()
  filename: string;

  @Field()
  mimeType: string;

  @Field(() => Int)
  size: number;

  @Field({ description: 'HTTP path that streams the bytes' })
  url: string;
}
