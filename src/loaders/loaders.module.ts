import { Module } from '@nestjs/common';
import { LoadersService } from './loaders.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserEntity } from '../users/entities/user.entity';
import { SeriesEntity } from '../series/entities/series.entity';
import { PostEntity } from '../posts/entities/post.entity';
import { CommentEntity } from '../comments/entities/comment.entity';
import { SeriesFollowerEntity } from '../series/entities/series-follower.entity';
import { SeriesTagEntity } from '../series/entities/series-tag.entity';
import { PostLikeEntity } from '../posts/entities/post-like.entity';
import { PostTagEntity } from '../posts/entities/post-tag.entity';
import { CommentLikeEntity } from '../comments/entities/comment-like.entity';
import { ReplyEntity } from '../comments/entities/reply.entity';
import { ReplyLikeEntity } from '../comments/entities/reply-like.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      UserEntity,
      SeriesEntity,
      SeriesFollowerEntity,
      SeriesTagEntity,
      PostEntity,
      PostLikeEntity,
      PostTagEntity,
      CommentEntity,
      CommentLikeEntity,
      ReplyEntity,
      ReplyLikeEntity,
    ]),
  ],
  providers: [LoadersService],
  exports: [LoadersService],
})
export class LoadersModule {}
