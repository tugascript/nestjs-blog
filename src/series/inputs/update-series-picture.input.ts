import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidatePromise } from 'class-validator';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { FileUploadDto } from '../../uploader/dtos/file-upload.dto';
import { SeriesDto } from '../dtos/series.dto';
import { ISeriesInput } from '../interfaces/series-input.interface';

@InputType('UpdateSeriesPictureInput')
export abstract class UpdateSeriesPictureInput
  extends SeriesDto
  implements Partial<ISeriesInput>
{
  @Field(() => GraphQLUpload)
  @ValidatePromise()
  @Type(() => FileUploadDto)
  public picture: Promise<FileUploadDto>;
}
