import { Field, InputType } from '@nestjs/graphql';
import { ISeriesInput } from '../interfaces/series-input.interface';
import { ValidatePromise } from 'class-validator';
import { SeriesDto } from '../dtos/series.dto';
import { GraphQLUpload } from 'graphql-upload';
import { Type } from 'class-transformer';
import { FileUploadDto } from '../../uploader/dtos/file-upload.dto';

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
