import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { SeriesFollowerEntity } from './entities/series-follower.entity';
import { SeriesTagEntity } from './entities/series-tag.entity';
import { SeriesEntity } from './entities/series.entity';
import { SeriesResolver } from './series.resolver';
import { SeriesService } from './series.service';

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
