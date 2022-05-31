import { Module } from '@nestjs/common';
import { SeriesService } from './series.service';
import { SeriesResolver } from './series.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SeriesEntity } from './entities/series.entity';
import { TagsModule } from '../tags/tags.module';
import { SeriesFollowerEntity } from './entities/series-follower.entity';
import { SeriesTagEntity } from './entities/series-tag.entity';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      SeriesEntity,
      SeriesFollowerEntity,
      SeriesTagEntity,
    ]),
    TagsModule,
  ],
  providers: [SeriesResolver, SeriesService],
})
export class SeriesModule {}
