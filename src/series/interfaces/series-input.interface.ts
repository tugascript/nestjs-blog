import { FileUpload } from 'graphql-upload';

export interface ISeriesInput {
  title: string;
  description: string;
  picture: Promise<FileUpload>;
  tagIds: number[];
}
