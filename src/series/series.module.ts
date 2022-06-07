import { Module } from '@nestjs/common';
import { SeriesService } from './series.service';
import { SeriesResolver } from './series.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SeriesEntity } from './entities/series.entity';
import { TagsModule } from '../tags/tags.module';
import { SeriesFollowerEntity } from './entities/series-follower.entity';
import { SeriesTagEntity } from './entities/series-tag.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      SeriesEntity,
      SeriesFollowerEntity,
      SeriesTagEntity,
    ]),
    TagsModule,
    UsersModule,
    NotificationsModule,
  ],
  providers: [SeriesResolver, SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
