import { OrderDto } from '../../common/dtos/order.dto';
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

@ArgsType()
export abstract class FilterPostLikesDto extends OrderDto {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  public postId: number;
}
