import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/gql-types/paginated.type';
import { ReplyType } from './reply.type';

@ObjectType('PaginatedReplies')
export abstract class PaginatedRepliesType extends Paginated<ReplyType>(
  ReplyType,
) {}
