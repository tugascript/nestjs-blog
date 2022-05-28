import { Module } from '@nestjs/common';
import { TagsService } from './tags.service';
import { TagsResolver } from './tags.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TagEntity } from './entities/tag.entity';

@Module({
  imports: [MikroOrmModule.forFeature([TagEntity])],
  providers: [TagsResolver, TagsService],
  exports: [TagsService],
})
export class TagsModule {}
