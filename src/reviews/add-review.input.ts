import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

@InputType()
export class AddReviewInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  body: string;
}
