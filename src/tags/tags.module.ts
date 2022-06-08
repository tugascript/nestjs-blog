import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TagEntity } from './entities/tag.entity';
import { TagsResolver } from './tags.resolver';
import { TagsService } from './tags.service';

@Module({
  imports: [MikroOrmModule.forFeature([TagEntity])],
  providers: [TagsResolver, TagsService],
  exports: [TagsService],
})
export class TagsModule {}
