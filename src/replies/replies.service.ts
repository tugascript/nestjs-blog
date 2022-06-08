import { profanity } from '@2toad/profanity';
import { CensorType } from '@2toad/profanity/dist/models';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'mercurius';
import { v5 as uuidV5 } from 'uuid';
import { CommentsService } from '../comments/comments.service';
import { CommentEntity } from '../comments/entities/comment.entity';
import { ICommentChange } from '../comments/interfaces/comment-change.interface';
import { CommonService } from '../common/common.service';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { NotificationTypeEnum } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { FilterRepliesDto } from './dtos/filter-replies.dto';
import { ReplyDto } from './dtos/reply.dto';
import { ReplyLikeEntity } from './entities/reply-like.entity';
import { ReplyEntity } from './entities/reply.entity';
import { CreateReplyInput } from './inputs/create-reply.input';
import { UpdateReplyInput } from './inputs/update-reply.input';
import { IReplyChange } from './interfaces/reply-change.interface';

@Injectable()
export class RepliesService {
  private readonly replyAlias = 'r';
  private readonly replyNamespace =
    this.configService.get<string>('REPLY_UUID');
  private readonly commentNamespace =
    this.configService.get<string>('COMMENT_UUID');

  constructor(
    @InjectRepository(ReplyEntity)
    private readonly repliesRepository: EntityRepository<ReplyEntity>,
    @InjectRepository(ReplyLikeEntity)
    private readonly replyLikesRepository: EntityRepository<ReplyLikeEntity>,
    private readonly configService: ConfigService,
    private readonly commonService: CommonService,
    private readonly commentsService: CommentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create Reply
   *
   * Replies to a comment and creates a new reply notification.
   */
  public async createReply(
    pubsub: PubSub,
    userId: number,
    { commentId, content, replyId }: CreateReplyInput,
  ): Promise<ReplyEntity> {
    const comment = await this.commentsService.commentById(commentId);
    const reply = this.repliesRepository.create({
      content: profanity.censor(content, CensorType.AllVowels),
      author: userId,
      comment,
    });
    let recipientId = comment.author.id;
    let notificationType = NotificationTypeEnum.REPLY;
    let skip = false;

    if (replyId) {
      const parentReply = await this.replyByIds(commentId, replyId);
      reply.mention = parentReply.author;
      recipientId = parentReply.author.id;
      notificationType = NotificationTypeEnum.MENTION;
      skip = reply.mute;
    }

    await this.commonService.saveEntity(this.repliesRepository, reply, true);

    if (!skip) {
      await this.notificationsService.createNotification(
        pubsub,
        notificationType,
        userId,
        recipientId,
        reply,
      );
    }

    this.publishCommentChange(pubsub, ChangeTypeEnum.UPDATE, comment);
    this.publishReplyChange(pubsub, ChangeTypeEnum.NEW, reply);
    return reply;
  }

  /**
   * Update Reply
   *
   * Updates a reply.
   */
  public async updateReply(
    pubsub: PubSub,
    userId: number,
    { commentId, replyId, content }: UpdateReplyInput,
  ): Promise<ReplyEntity> {
    const reply = await this.authorsReplyByIds(userId, commentId, replyId);
    reply.content = profanity.censor(content, CensorType.AllVowels);
    await this.commonService.saveEntity(this.repliesRepository, reply);
    this.publishReplyChange(pubsub, ChangeTypeEnum.UPDATE, reply);
    return reply;
  }

  /**
   * Delete Reply
   *
   * Deletes a reply and removes its notification.
   */
  public async deleteReply(
    pubsub: PubSub,
    userId: number,
    { commentId, replyId }: ReplyDto,
  ): Promise<LocalMessageType> {
    const reply = await this.authorsReplyByIds(
      userId,
      commentId,
      replyId,
      true,
    );
    return await this.deleteReplyLogic(pubsub, reply);
  }

  /**
   * Like Reply
   *
   * Likes a reply and creates a new notification.
   */
  public async likeReply(
    pubsub: PubSub,
    userId: number,
    { commentId, replyId }: ReplyDto,
  ): Promise<ReplyEntity> {
    const reply = await this.replyByIds(commentId, replyId);
    const like = this.replyLikesRepository.create({
      user: userId,
      reply,
    });
    await this.commonService.saveEntity(this.replyLikesRepository, like, true);
    await this.notificationsService.createNotification(
      pubsub,
      NotificationTypeEnum.LIKE,
      userId,
      reply.author.id,
      reply,
    );
    this.publishReplyChange(pubsub, ChangeTypeEnum.UPDATE, reply);
    return reply;
  }

  /**
   * Unlike Reply
   *
   * Removes a like from a reply and removes its notification.
   */
  public async unlikeReply(
    pubsub: PubSub,
    userId: number,
    { commentId, replyId }: ReplyDto,
  ): Promise<ReplyEntity> {
    const reply = await this.replyByIds(commentId, replyId);
    const like = await this.replyLikeByPKs(userId, replyId);
    await this.commonService.removeEntity(this.replyLikesRepository, like);
    await this.notificationsService.removeNotification(
      pubsub,
      NotificationTypeEnum.LIKE,
      userId,
      reply.author.id,
      reply,
    );
    this.publishReplyChange(pubsub, ChangeTypeEnum.UPDATE, reply);
    return reply;
  }

  /**
   * Filter Replies
   *
   * Multi read CRUD action for Replies.
   */
  public filterReplies({
    commentId,
    order,
    after,
    first,
  }: FilterRepliesDto): Promise<IPaginated<ReplyEntity>> {
    const qb = this.repliesRepository
      .createQueryBuilder(this.replyAlias)
      .where({ comment: commentId });

    return this.commonService.queryBuilderPagination(
      this.replyAlias,
      'id',
      first,
      order,
      qb,
      after,
      true,
    );
  }

  public async adminDeleteReply(
    pubsub: PubSub,
    { commentId, replyId }: ReplyDto,
  ): Promise<LocalMessageType> {
    const reply = await this.replyByIds(commentId, replyId);
    return await this.deleteReplyLogic(pubsub, reply);
  }

  /**
   * Reply By IDs
   *
   * Gets a reply by the reply and comment ID.
   */
  private async replyByIds(
    commentId: number,
    replyId: number,
  ): Promise<ReplyEntity> {
    const reply = await this.repliesRepository.findOne({
      id: replyId,
      comment: commentId,
    });
    this.commonService.checkExistence('Reply', reply);
    return reply;
  }

  /**
   * Author's Reply By IDS
   *
   * Gets a reply of the current user by the reply and comment ID.
   */
  private async authorsReplyByIds(
    userId: number,
    commentId: number,
    replyId: number,
    withComment = false,
  ): Promise<ReplyEntity> {
    const reply = await this.repliesRepository.findOne(
      {
        author: userId,
        comment: commentId,
        id: replyId,
      },
      withComment ? { populate: ['comment'] } : undefined,
    );
    this.commonService.checkExistence('Reply', reply);
    return reply;
  }

  /**
   * Reply Like by PKs
   *
   * Gets a reply like by the reply and user IDs.
   */
  private async replyLikeByPKs(
    userId: number,
    replyId: number,
  ): Promise<ReplyLikeEntity> {
    const replyLike = await this.replyLikesRepository.findOne({
      user: userId,
      reply: replyId,
    });
    this.commonService.checkExistence('Reply Like', replyLike);
    return replyLike;
  }

  /**
   * Publish Comment Change
   *
   * Publishes a comment change to the subscription.
   */
  private publishCommentChange(
    pubsub: PubSub,
    changeType: ChangeTypeEnum,
    comment: CommentEntity,
  ): void {
    pubsub.publish<ICommentChange>({
      topic: uuidV5(comment.post.id.toString(), this.commentNamespace),
      payload: {
        commentChange: this.commonService.generateChange(
          comment,
          changeType,
          'id',
        ),
      },
    });
  }

  /**
   * Publish Reply Change
   *
   * Publishes a reply change to the subscription.
   */
  private publishReplyChange(
    pubsub: PubSub,
    changeType: ChangeTypeEnum,
    reply: ReplyEntity,
  ): void {
    pubsub.publish<IReplyChange>({
      topic: uuidV5(reply.comment.id.toString(), this.replyNamespace),
      payload: {
        replyChange: this.commonService.generateChange(reply, changeType, 'id'),
      },
    });
  }

  private async deleteReplyLogic(
    pubsub: PubSub,
    reply: ReplyEntity,
  ): Promise<LocalMessageType> {
    await this.commonService.removeEntity(this.repliesRepository, reply);
    const userId = reply.author.id;

    if (reply.mention) {
      await this.notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.MENTION,
        userId,
        reply.mention.id,
        reply,
      );
    } else {
      await this.notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.REPLY,
        userId,
        reply.comment.id,
        reply,
      );
    }

    this.publishReplyChange(pubsub, ChangeTypeEnum.DELETE, reply);
    this.publishCommentChange(pubsub, ChangeTypeEnum.UPDATE, reply.comment);
    return new LocalMessageType('Reply deleted successfully');
  }
}
