import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  Length,
  Matches,
  Min,
  ValidatePromise,
} from 'class-validator';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js';
import { NAME_REGEX } from '../../common/constants/regex';
import { FileUploadDto } from '../../uploader/dtos/file-upload.dto';
import { IPostInput } from '../interfaces/post-input.interface';

@InputType()
export class CreatePostInput implements IPostInput {
  @Field(() => String)
  @Length(3, 100)
  @Matches(NAME_REGEX)
  public title: string;

  @Field(() => GraphQLUpload)
  @ValidatePromise()
  @Type(() => FileUploadDto)
  public picture: Promise<FileUploadDto>;

  @Field(() => [Int])
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(1, { each: true })
  public tagIds: number[];

  @Field(() => String)
  @Length(10, 5000)
  public content: string;
}
