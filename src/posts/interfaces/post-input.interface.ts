import { FileUpload } from 'graphql-upload';

export interface IPostInput {
  title: string;
  content: string;
  picture: Promise<FileUpload>;
  tagIds: number[];
}
