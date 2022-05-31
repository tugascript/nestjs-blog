import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { CommentsService } from './comments.service';
import { CreateCommentInput } from './inputs/create-comment.input';
import { ReplyInput } from './inputs/reply.input';
import { ConfigService } from '@nestjs/config';
import { CommentType } from './gql-types/comment.type';
import { CommentChangeType } from './gql-types/comment-change.type';
import { PubSub } from 'mercurius';
import { PostDto } from '../posts/dtos/post.dto';
import { ICommentChange } from './interfaces/comment-change.type';
import { v5 as uuidV5 } from 'uuid';
import { CommentDto } from './dtos/comment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { LocalMessageType } from '../common/gql-types/message.type';
import { CommentEntity } from './entities/comment.entity';
import { PaginatedCommentsType } from './gql-types/paginated-comments.type';
import { FilterCommentsDto } from './dtos/filter-comments.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';

@Resolver(() => CommentType)
export class CommentsResolver {
  private readonly commentNamespace =
    this.configService.get<string>('COMMENT_UUID');
  private readonly replyNamespace =
    this.configService.get<string>('REPLY_UUID');

  constructor(
    private readonly commentsService: CommentsService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => CommentType)
  public async createComment(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: CreateCommentInput,
  ): Promise<CommentEntity> {
    return this.commentsService.createComment(pubsub, user.id, input);
  }

  @Mutation(() => CommentType)
  public async updateComment(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: ReplyInput,
  ): Promise<CommentEntity> {
    return this.commentsService.updateComment(pubsub, user.id, input);
  }

  @Mutation(() => CommentType)
  public async likeComment(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: CommentDto,
  ): Promise<CommentEntity> {
    return this.commentsService.likeComment(pubsub, user.id, dto.commentId);
  }

  @Mutation(() => CommentType)
  public async unlikeComment(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: CommentDto,
  ): Promise<CommentEntity> {
    return this.commentsService.unlikeComment(pubsub, user.id, dto.commentId);
  }

  @Mutation(() => LocalMessageType)
  public async deleteComment(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: CommentDto,
  ): Promise<LocalMessageType> {
    return this.commentsService.deleteComment(pubsub, user.id, dto.commentId);
  }

  @Query(() => PaginatedCommentsType)
  public async filterComments(
    @Args() dto: FilterCommentsDto,
  ): Promise<IPaginated<CommentEntity>> {
    return this.commentsService.filterComments(dto);
  }

  @Subscription(() => CommentChangeType)
  public async commentChanges(
    @Context('pubsub') pubsub: PubSub,
    @Args() dto: PostDto,
  ) {
    return pubsub.subscribe<ICommentChange>(
      uuidV5(dto.postId.toString(), this.commentNamespace),
    );
  }

  @Subscription(() => CommentChangeType)
  public async replyChanges(
    @Context('pubsub') pubsub: PubSub,
    @Args() dto: CommentDto,
  ) {
    return pubsub.subscribe<ICommentChange>(
      uuidV5(dto.commentId.toString(), this.replyNamespace),
    );
  }
}
