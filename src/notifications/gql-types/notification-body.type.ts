import { createUnionType } from '@nestjs/graphql';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { CommentType } from '../../comments/gql-types/comment.type';
import { ReplyType } from '../../replies/gql-types/reply.type';
import { PostEntity } from '../../posts/entities/post.entity';
import { PostType } from '../../posts/gql-types/post.type';
import { ReplyEntity } from '../../replies/entities/reply.entity';
import { SeriesEntity } from '../../series/entities/series.entity';
import { SeriesType } from '../../series/gql-types/series.type';

export const NotificationBodyType = createUnionType({
  name: 'NotificationBody',
  types: () => [SeriesType, PostType, CommentType, ReplyType],
  resolveType(value) {
    if (value instanceof ReplyEntity) {
      return ReplyType;
    } else if (value instanceof CommentEntity) {
      return CommentType;
    } else if (value instanceof PostEntity) {
      return PostType;
    } else if (value instanceof SeriesEntity) {
      return SeriesType;
    } else {
      return null;
    }
  },
});
