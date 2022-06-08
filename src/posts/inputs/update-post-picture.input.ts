import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidatePromise } from 'class-validator';
import { GraphQLUpload } from 'graphql-upload';
import { FileUploadDto } from '../../uploader/dtos/file-upload.dto';
import { PostDto } from '../dtos/post.dto';
import { IPostInput } from '../interfaces/post-input.interface';

@InputType('UpdatePostPictureInput')
export abstract class UpdatePostPictureInput
  extends PostDto
  implements Partial<IPostInput>
{
  @Field(() => GraphQLUpload)
  @ValidatePromise()
  @Type(() => FileUploadDto)
  public picture: Promise<FileUploadDto>;
}
