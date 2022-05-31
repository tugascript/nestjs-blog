import { Module } from '@nestjs/common';
import { LoadersService } from './loaders.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UserEntity } from '../users/entities/user.entity';
import { SeriesEntity } from '../series/entities/series.entity';
import { PostEntity } from '../posts/entities/post.entity';
import { CommentEntity } from '../comments/entities/comment.entity';
import { SeriesFollowerEntity } from '../series/entities/series-follower.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      UserEntity,
      SeriesEntity,
      SeriesFollowerEntity,
      PostEntity,
      CommentEntity,
    ]),
  ],
  providers: [LoadersService],
  exports: [LoadersService],
})
export class LoadersModule {}
