import { Module } from '@nestjs/common';
import { LoadersService } from './loaders.service';

@Module({
  providers: [LoadersService]
})
export class LoadersModule {}
