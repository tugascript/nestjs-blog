import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './comments.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CommentEntity } from './entities/comment.entity';
import { UsersModule } from '../users/users.module';
import { PostsModule } from '../posts/posts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([CommentEntity]),
    UsersModule,
    PostsModule,
    NotificationsModule,
  ],
  providers: [CommentsResolver, CommentsService],
})
export class CommentsModule {}
