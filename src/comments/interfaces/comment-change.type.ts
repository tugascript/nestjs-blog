import { IChange } from '../../common/interfaces/change.interface';
import { IComment } from './comments.interface';

export interface ICommentChange {
  commentChange: IChange<IComment>;
}
