import { Field, ID, InputType } from '@nestjs/graphql';
import { IsBase64, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * GraphiQL can send JSON, so this input carries the bytes as base64.
 * The HTTP route in UploadsController is the better path for a real file:
 * multipart bytes never have to become a giant JSON string.
 */
@InputType()
export class UploadCoverInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  filename: string;

  @Field()
  @IsIn(IMAGE_TYPES)
  mimeType: string;

  @Field()
  @IsBase64()
  @MaxLength(140_000)
  contentBase64: string;
}
