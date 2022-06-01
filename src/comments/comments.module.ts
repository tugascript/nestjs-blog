import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './resolvers/comments.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CommentEntity } from './entities/comment.entity';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommentLikeEntity } from './entities/comment-like.entity';
import { ReplyEntity } from './entities/reply.entity';
import { ReplyLikeEntity } from './entities/reply-like.entity';
import { RepliesResolver } from './resolvers/replies.resolver';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      CommentEntity,
      CommentLikeEntity,
      ReplyEntity,
      ReplyLikeEntity,
    ]),
    UsersModule,
    PostsModule,
    NotificationsModule,
  ],
  providers: [CommentsResolver, RepliesResolver, CommentsService],
})
export class CommentsModule {}
