import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/gql-types/paginated.type';
import { PostType } from './post.type';

@ObjectType('PaginatedPosts')
export abstract class PaginatedPostsType extends Paginated<PostType>(
  PostType,
) {}
