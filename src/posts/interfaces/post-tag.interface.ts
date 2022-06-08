import { ITag } from '../../tags/interfaces/tag.interface';
import { IPost } from './post.interface';

export interface IPostTag {
  post: IPost;
  tag: ITag;
  createdAt: Date;
}
