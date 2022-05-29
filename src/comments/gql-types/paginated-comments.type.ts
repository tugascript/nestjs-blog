import { ObjectType } from '@nestjs/graphql';
import { CommentType } from './comment.type';
import { Paginated } from '../../common/gql-types/paginated.type';

@ObjectType('PaginatedComments')
export abstract class PaginatedCommentsType extends Paginated<CommentType>(
  CommentType,
) {}
