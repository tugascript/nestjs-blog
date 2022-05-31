import { IPost } from './post.interface';
import { ITag } from '../../tags/interfaces/tag.interface';

export interface IPostTag {
  post: IPost;
  tag: ITag;
  createdAt: Date;
}
