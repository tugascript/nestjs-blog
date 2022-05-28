import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsResolver } from './comments.resolver';

@Module({
  providers: [CommentsResolver, CommentsService]
})
export class CommentsModule {}
