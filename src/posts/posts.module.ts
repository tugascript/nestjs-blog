import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsResolver } from './posts.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostEntity } from './entities/post.entity';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MikroOrmModule.forFeature([PostEntity]), TagsModule, UsersModule],
  providers: [PostsResolver, PostsService],
})
export class PostsModule {}
