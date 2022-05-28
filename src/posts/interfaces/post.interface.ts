import { IBase } from '../../common/interfaces/base.interface';

export interface IPost extends IBase {
  title: string;
  slug: string;
  content: string;
  published: boolean;
}
