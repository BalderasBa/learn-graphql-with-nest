import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsPublicationYear } from '../common/is-publication-year.js';

@InputType()
export class UpdateBookInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  authorId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsPublicationYear()
  year?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  internalNote?: string;
}
