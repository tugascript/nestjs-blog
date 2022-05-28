import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Post {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
