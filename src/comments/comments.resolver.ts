import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  Context,
  Mutation,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { v5 as uuidV5 } from 'uuid';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PostDto } from '../posts/dtos/post.dto';
import { PaginatedUsersType } from '../users/gql-types/paginated-users.type';
import { CommentsService } from './comments.service';
import { CommentDto } from './dtos/comment.dto';
import { FilterCommentsDto } from './dtos/filter-comments.dto';
import { CommentEntity } from './entities/comment.entity';
import { CommentChangeType } from './gql-types/comment-change.type';
import { CommentType } from './gql-types/comment.type';
import { PaginatedCommentsType } from './gql-types/paginated-comments.type';
import { CreateCommentInput } from './inputs/create-comment.input';
import { UpdateCommentInput } from './inputs/update-comment.input';
import { ICommentChange } from './interfaces/comment-change.interface';

@Resolver(() => CommentType)
export class CommentsResolver {
  private readonly commentNamespace =
    this.configService.get<string>('COMMENT_UUID');

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
    @Args('input') input: UpdateCommentInput,
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

  //_____ ADMIN _____//

  @Mutation(() => LocalMessageType)
  @UseGuards(AdminGuard)
  public async adminDeleteComment(
    @Context('pubsub') pubsub: PubSub,
    @Args() dto: CommentDto,
  ): Promise<LocalMessageType> {
    return this.commentsService.adminDeleteComment(pubsub, dto.commentId);
  }

  //_____ LOADERS _____//

  @ResolveField('replies', () => PaginatedCommentsType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getReplies(@Args() _: FilterRelationDto) {
    return;
  }

  @ResolveField('likes', () => PaginatedUsersType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getLikes(@Args() _: FilterRelationDto) {
    return;
  }
}
