import { Injectable } from '@nestjs/common';
import { CreateCommentInput } from './inputs/create-comment.input';
import { ReplyInput } from './inputs/reply.input';

@Injectable()
export class CommentsService {
  create(createCommentInput: CreateCommentInput) {
    return 'This action adds a new comment';
  }

  findAll() {
    return `This action returns all comments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} comment`;
  }

  update(id: number, updateCommentInput: ReplyInput) {
    return `This action updates a #${id} comment`;
  }

  remove(id: number) {
    return `This action removes a #${id} comment`;
  }
}
