import { ICommentInput } from './comment-input.interface';

export interface IReplyInput extends ICommentInput {
  commentId: number;
}
