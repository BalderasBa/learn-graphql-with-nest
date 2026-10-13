import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'How this process is serving GraphQL' })
export class ServiceInfo {
  @Field()
  name: string;

  @Field()
  graphqlPath: string;

  @Field(() => [String])
  transports: string[];

  @Field()
  introspectionEnabled: boolean;
}
