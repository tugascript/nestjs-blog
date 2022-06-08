import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SeriesModule } from '../series/series.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { PostLikeEntity } from './entities/post-like.entity';
import { PostTagEntity } from './entities/post-tag.entity';
import { PostEntity } from './entities/post.entity';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([PostEntity, PostLikeEntity, PostTagEntity]),
    TagsModule,
    UsersModule,
    SeriesModule,
    NotificationsModule,
  ],
  providers: [PostsResolver, PostsService],
  exports: [PostsService],
})
export class PostsModule {}
