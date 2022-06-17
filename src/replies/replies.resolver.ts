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
import { CommentChangeType } from '../comments/gql-types/comment-change.type';
import { PaginatedRepliesType } from './gql-types/paginated-replies.type';
import { ReplyType } from './gql-types/reply.type';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PostDto } from '../posts/dtos/post.dto';
import { PaginatedUsersType } from '../users/gql-types/paginated-users.type';
import { FilterRepliesDto } from './dtos/filter-replies.dto';
import { ReplyDto } from './dtos/reply.dto';
import { ReplyEntity } from './entities/reply.entity';
import { CreateReplyInput } from './inputs/create-reply.input';
import { UpdateReplyInput } from './inputs/update-reply.input';
import { IReplyChange } from './interfaces/reply-change.interface';
import { RepliesService } from './replies.service';

@Resolver(() => ReplyType)
export class RepliesResolver {
  private readonly replyNamespace =
    this.configService.get<string>('REPLY_UUID');

  constructor(
    private readonly repliesService: RepliesService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => ReplyType)
  public async replyToComment(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: CreateReplyInput,
  ): Promise<ReplyEntity> {
    return this.repliesService.createReply(pubsub, user.id, input);
  }

  @Mutation(() => ReplyType)
  public async updateReply(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: UpdateReplyInput,
  ): Promise<ReplyEntity> {
    return this.repliesService.updateReply(pubsub, user.id, input);
  }

  @Mutation(() => ReplyType)
  public async likeReply(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: ReplyDto,
  ): Promise<ReplyEntity> {
    return this.repliesService.likeReply(pubsub, user.id, dto);
  }

  @Mutation(() => ReplyType)
  public async unlikeReply(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: ReplyDto,
  ): Promise<ReplyEntity> {
    return this.repliesService.unlikeReply(pubsub, user.id, dto);
  }

  @Mutation(() => LocalMessageType)
  public async deleteReply(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: ReplyDto,
  ): Promise<LocalMessageType> {
    return this.repliesService.deleteReply(pubsub, user.id, dto);
  }

  @Query(() => PaginatedRepliesType)
  public async filterReplies(
    @Args() dto: FilterRepliesDto,
  ): Promise<IPaginated<ReplyEntity>> {
    return this.repliesService.filterReplies(dto);
  }

  @Subscription(() => CommentChangeType)
  public async replyChanges(
    @Context('pubsub') pubsub: PubSub,
    @Args() dto: PostDto,
  ) {
    return pubsub.subscribe<IReplyChange>(
      uuidV5(dto.postId.toString(), this.replyNamespace),
    );
  }

  //_____ ADMIN _____//

  @Mutation(() => LocalMessageType)
  @UseGuards(AdminGuard)
  public async adminDeleteReply(
    @Context('pubsub') pubsub: PubSub,
    @Args() dto: ReplyDto,
  ) {
    return this.repliesService.adminDeleteReply(pubsub, dto);
  }

  //_____ LOADERS _____//

  @ResolveField('likes', () => PaginatedUsersType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getLikes(@Args() _: FilterRelationDto) {
    return;
  }
}
