import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsModule } from '../posts/posts.module';
import { UsersModule } from '../users/users.module';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';
import { CommentLikeEntity } from './entities/comment-like.entity';
import { CommentEntity } from './entities/comment.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([CommentEntity, CommentLikeEntity]),
    UsersModule,
    PostsModule,
    NotificationsModule,
  ],
  providers: [CommentsResolver, CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
