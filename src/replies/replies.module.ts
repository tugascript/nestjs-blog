import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { CommentsModule } from '../comments/comments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReplyLikeEntity } from './entities/reply-like.entity';
import { ReplyEntity } from './entities/reply.entity';
import { RepliesResolver } from './replies.resolver';
import { RepliesService } from './replies.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([ReplyEntity, ReplyLikeEntity]),
    CommentsModule,
    NotificationsModule,
  ],
  providers: [RepliesService, RepliesResolver],
})
export class RepliesModule {}
