import { FileUpload } from 'graphql-upload';

export interface ISeriesInput {
  title: string;
  picture: Promise<FileUpload>;
  tagIds: number[];
}
