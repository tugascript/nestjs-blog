import { Global, Module } from '@nestjs/common';
import { UploaderService } from './uploader.service';

@Global()
@Module({
  providers: [UploaderService],
  exports: [UploaderService],
})
export class UploaderModule {}
