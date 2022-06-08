import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCommentInput } from './inputs/create-comment.input';
import { InjectRepository } from '@mikro-orm/nestjs';
import { CommentEntity } from './entities/comment.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { PostsService } from '../posts/posts.service';
import { CommonService } from '../common/common.service';
import { UsersService } from '../users/users.service';
import { PubSub } from 'mercurius';
import { profanity } from '@2toad/profanity';
import { CensorType } from '@2toad/profanity/dist/models';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationTypeEnum } from '../notifications/enums/notification-type.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { ConfigService } from '@nestjs/config';
import { ICommentChange } from './interfaces/comment-change.interface';
import { v5 as uuidV5 } from 'uuid';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { CreateReplyInput } from './inputs/create-reply.input';
import { FilterCommentsDto } from './dtos/filter-comments.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { CommentLikeEntity } from './entities/comment-like.entity';
import { ReplyEntity } from './entities/reply.entity';
import { ReplyLikeEntity } from './entities/reply-like.entity';
import { IReplyChange } from './interfaces/reply-change.interface';
import { UpdateCommentInput } from './inputs/update-comment.input';
import { UpdateReplyInput } from './inputs/update-reply.input';
import { ReplyDto } from './dtos/reply.dto';
import { FilterRepliesDto } from './dtos/filter-replies.dto';

@Injectable()
export class CommentsService {
  private readonly commentAlias = 'c';
  private readonly replyAlias = 'r';
  private readonly commentNamespace =
    this.configService.get<string>('COMMENT_UUID');
  private readonly replyNamespace =
    this.configService.get<string>('REPLY_UUID');

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentsRepository: EntityRepository<CommentEntity>,
    @InjectRepository(CommentLikeEntity)
    private readonly commentLikesRepository: EntityRepository<CommentLikeEntity>,
    @InjectRepository(ReplyEntity)
    private readonly repliesRepository: EntityRepository<ReplyEntity>,
    @InjectRepository(ReplyLikeEntity)
    private readonly replyLikesRepository: EntityRepository<ReplyLikeEntity>,
    private readonly configService: ConfigService,
    private readonly commonService: CommonService,
    private readonly postsService: PostsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create Comment
   *
   * Create CRUD action for Comments.
   * Creates a new comment for a given post, and new comment notification.
   */
  public async createComment(
    pubsub: PubSub,
    userId: number,
    { postId, content }: CreateCommentInput,
  ): Promise<CommentEntity> {
    const post = await this.postsService.postById(postId);
    const comment = await this.commentsRepository.create({
      author: userId,
      post: post,
      content: profanity.censor(content, CensorType.AllVowels),
    });
    await this.commonService.saveEntity(this.commentsRepository, comment, true);
    await this.notificationsService.createNotification(
      pubsub,
      NotificationTypeEnum.COMMENT,
      userId,
      post.author.id,
      comment,
    );
    this.publishCommentChange(pubsub, ChangeTypeEnum.NEW, comment);
    return comment;
  }

  /**
   * Update Comment
   *
   * Update CRUD action for Comments.
   */
  public async updateComment(
    pubsub: PubSub,
    userId: number,
    { commentId, content }: UpdateCommentInput,
  ): Promise<CommentEntity> {
    const comment = await this.authorsCommentById(userId, commentId);
    comment.content = profanity.censor(content, CensorType.AllVowels);
    await this.commonService.saveEntity(this.commentsRepository, comment);
    this.publishCommentChange(pubsub, ChangeTypeEnum.UPDATE, comment);
    return comment;
  }

  /**
   * Delete Comment
   *
   * Delete CRUD action for Comments.
   * Deletes a comment or reply and its notification.
   */
  public async deleteComment(
    pubsub: PubSub,
    userId: number,
    commentId: number,
  ): Promise<LocalMessageType> {
    const comment = await this.authorsCommentById(userId, commentId, true);
    await this.commonService.removeEntity(this.commentsRepository, comment);
    return await this.deleteCommentLogic(pubsub, comment);
  }

  /**
   * Like Comment
   *
   * Likes a comment or reply and creates a new notification.
   */
  public async likeComment(
    pubsub: PubSub,
    userId: number,
    commentId: number,
  ): Promise<CommentEntity> {
    const comment = await this.commentById(commentId);
    const count = await this.commentLikesRepository.count({
      comment: commentId,
      user: userId,
    });

    if (count > 0)
      throw new BadRequestException('You already liked this comment');

    const like = await this.commentLikesRepository.create({
      comment,
      user: userId,
    });
    await this.commonService.saveEntity(
      this.commentLikesRepository,
      like,
      true,
    );
    await this.notificationsService.createNotification(
      pubsub,
      NotificationTypeEnum.LIKE,
      userId,
      comment.author.id,
      comment,
    );
    this.publishCommentChange(pubsub, ChangeTypeEnum.UPDATE, comment);
    return comment;
  }

  /**
   * Unlike Comment
   *
   * Removes a like from a comment or reply and removes the notification.
   */
  public async unlikeComment(
    pubsub: PubSub,
    userId: number,
    commentId: number,
  ): Promise<CommentEntity> {
    const comment = await this.commentById(commentId);
    const like = await this.commentLikeByPKs(userId, commentId);
    await this.commonService.removeEntity(this.commentLikesRepository, like);
    await this.notificationsService.removeNotification(
      pubsub,
      NotificationTypeEnum.LIKE,
      userId,
      comment.author.id,
      comment,
    );
    this.publishCommentChange(pubsub, ChangeTypeEnum.UPDATE, comment);
    return comment;
  }

  /**
   * Filter Comments
   *
   * Multi read CRUD action for Comments.
   */
  public async filterComments({
    postId,
    order,
    after,
    first,
  }: FilterCommentsDto): Promise<IPaginated<CommentEntity>> {
    const qb = this.commentsRepository
      .createQueryBuilder(this.commentAlias)
      .where({ post: postId });

    return this.commonService.queryBuilderPagination(
      this.commentAlias,
      'id',
      first,
      order,
      qb,
      after,
      true,
    );
  }

  /**
   * Reply to Comment
   *
   * Replies to a comment and creates a new reply notification.
   */
  public async replyToComment(
    pubsub: PubSub,
    userId: number,
    { commentId, content, replyId }: CreateReplyInput,
  ): Promise<ReplyEntity> {
    const comment = await this.commentById(commentId);
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

  //_____ ADMIN _____//

  public async adminDeleteComment(
    pubsub: PubSub,
    commentId: number,
  ): Promise<LocalMessageType> {
    const comment = await this.commentById(commentId);
    return await this.deleteCommentLogic(pubsub, comment);
  }

  public async adminDeleteReply(
    pubsub: PubSub,
    { commentId, replyId }: ReplyDto,
  ): Promise<LocalMessageType> {
    const reply = await this.replyByIds(commentId, replyId);
    return await this.deleteReplyLogic(pubsub, reply);
  }

  /**
   * Author's Comment By ID
   *
   * Gets a comment from the current user by ID.
   */
  private async authorsCommentById(
    userId: number,
    commentId: number,
    populate = false,
  ): Promise<CommentEntity> {
    const comment = await this.commentsRepository.findOne(
      {
        author: userId,
        id: commentId,
      },
      populate ? { populate: ['post'] } : undefined,
    );
    this.commonService.checkExistence('Comment', comment);
    return comment;
  }

  private async commentById(commentId: number): Promise<CommentEntity> {
    const comment = await this.commentsRepository.findOne({ id: commentId });
    this.commonService.checkExistence('Comment', comment);
    return comment;
  }

  /**
   * Comment Like By PKs
   *
   * Gets a comet like by the comment and user IDs.
   */
  private async commentLikeByPKs(
    userId: number,
    commentId: number,
  ): Promise<CommentLikeEntity> {
    const commentLike = await this.commentLikesRepository.findOne({
      user: userId,
      comment: commentId,
    });
    this.commonService.checkExistence('Comment Like', commentLike);
    return commentLike;
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
      withComment && { populate: ['comment'] },
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

  private async deleteCommentLogic(
    pubsub: PubSub,
    comment: CommentEntity,
  ): Promise<LocalMessageType> {
    await this.commonService.removeEntity(this.commentsRepository, comment);
    await this.notificationsService.removeNotification(
      pubsub,
      NotificationTypeEnum.COMMENT,
      comment.author.id,
      comment.post.author.id,
      comment,
    );
    this.publishCommentChange(pubsub, ChangeTypeEnum.DELETE, comment);
    return new LocalMessageType('Comment deleted successfully');
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
