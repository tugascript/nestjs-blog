import { Field, InputType, Int } from '@nestjs/graphql';
import { IPostInput } from '../interfaces/post-input.interface';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  Length,
  Matches,
  Min,
  ValidatePromise,
} from 'class-validator';
import { NAME_REGEX } from '../../common/constants/regex';
import { GraphQLUpload } from 'graphql-upload';
import { Type } from 'class-transformer';
import { FileUploadDto } from '../../uploader/dtos/file-upload.dto';

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
