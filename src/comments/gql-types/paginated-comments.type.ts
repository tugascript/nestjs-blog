import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/gql-types/paginated.type';
import { CommentType } from './comment.type';

@ObjectType('PaginatedComments')
export abstract class PaginatedCommentsType extends Paginated<CommentType>(
  CommentType,
) {}
