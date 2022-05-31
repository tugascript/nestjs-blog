import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsResolver } from './posts.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostEntity } from './entities/post.entity';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SeriesModule } from '../series/series.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([PostEntity]),
    TagsModule,
    UsersModule,
    SeriesModule,
    NotificationsModule,
  ],
  providers: [PostsResolver, PostsService],
})
export class PostsModule {}
