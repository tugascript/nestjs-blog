import { Module } from '@nestjs/common';
import { SeriesService } from './series.service';
import { SeriesResolver } from './series.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SeriesEntity } from './entities/series.entity';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [MikroOrmModule.forFeature([SeriesEntity]), TagsModule],
  providers: [SeriesResolver, SeriesService],
})
export class SeriesModule {}
