import { Injectable } from '@nestjs/common';
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
import { ICommentChange } from './interfaces/comment-change.type';
import { v5 as uuidV5 } from 'uuid';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { ReplyInput } from './inputs/reply.input';
import { FilterCommentsDto } from './dtos/filter-comments.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';

@Injectable()
export class CommentsService {
  private readonly commentsAlias = 'c';
  private readonly commentNamespace =
    this.configService.get<string>('COMMENT_UUID');
  private readonly replyNamespace =
    this.configService.get<string>('REPLY_UUID');

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentsRepository: EntityRepository<CommentEntity>,
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
    await this.notificationsService.createAppNotification(
      pubsub,
      NotificationTypeEnum.COMMENT,
      userId,
      postId,
      comment.id,
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
    { commentId, content }: ReplyInput,
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
    const comment = await this.authorsCommentById(userId, commentId);
    await this.commonService.removeEntity(this.commentsRepository, comment);

    if (comment?.replying) {
      await this.notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.REPLY,
        userId,
        comment.post.id,
        comment.id,
        comment.replying.id,
      );
    } else {
      await this.notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.COMMENT,
        userId,
        comment.post.id,
        comment.id,
      );
    }

    this.publishCommentChange(pubsub, ChangeTypeEnum.DELETE, comment);
    return new LocalMessageType('Comment deleted successfully');
  }

  /**
   * Reply to Comment
   *
   * Replies to a comment and creates a new reply notification.
   */
  public async replyToComment(
    pubsub: PubSub,
    userId: number,
    { commentId, content }: ReplyInput,
  ): Promise<CommentEntity> {
    const comment = await this.commentById(commentId);
    const reply = await this.commentsRepository.create({
      replying: comment,
      post: comment.post.id,
      author: userId,
      content: profanity.censor(content, CensorType.AllVowels),
    });
    await this.commonService.saveEntity(this.commentsRepository, reply, true);
    await this.notificationsService.createAppNotification(
      pubsub,
      NotificationTypeEnum.REPLY,
      userId,
      comment.post.id,
      comment.id,
      reply.id,
    );
    this.publishCommentChange(pubsub, ChangeTypeEnum.NEW, reply);
    return reply;
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
    comment.likes.add(this.usersService.getUserRef(userId));
    await this.commonService.saveEntity(this.commentsRepository, comment);

    if (comment?.replying) {
      await this.notificationsService.createAppNotification(
        pubsub,
        NotificationTypeEnum.REPLY_LIKE,
        userId,
        comment.post.id,
        comment.id,
        comment.replying.id,
      );
    } else {
      await this.notificationsService.createAppNotification(
        pubsub,
        NotificationTypeEnum.COMMENT_LIKE,
        userId,
        comment.post.id,
        comment.id,
      );
    }

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
    comment.likes.remove(this.usersService.getUserRef(userId));
    await this.commonService.saveEntity(this.commentsRepository, comment);

    if (comment?.replying) {
      await this.notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.REPLY_LIKE,
        userId,
        comment.post.id,
        comment.id,
        comment.replying.id,
      );
    } else {
      await this.notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.COMMENT_LIKE,
        userId,
        comment.post.id,
        comment.id,
      );
    }

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
      .createQueryBuilder(this.commentsAlias)
      .where({ post: postId });

    return this.commonService.queryBuilderPagination(
      this.commentsAlias,
      'id',
      first,
      order,
      qb,
      after,
      true,
    );
  }

  private async authorsCommentById(
    userId: number,
    commentId: number,
  ): Promise<CommentEntity> {
    const comment = await this.commentsRepository.findOne({
      author: userId,
      id: commentId,
    });
    this.commonService.checkExistence('Comment', comment);
    return comment;
  }

  private async commentById(commentId: number): Promise<CommentEntity> {
    const comment = await this.commentsRepository.findOne({ id: commentId });
    this.commonService.checkExistence('Comment', comment);
    return comment;
  }

  private publishCommentChange(
    pubsub: PubSub,
    changeType: ChangeTypeEnum,
    comment: CommentEntity,
  ): void {
    const topic = comment?.replying
      ? uuidV5(comment.replying.id.toString(), this.replyNamespace)
      : uuidV5(comment.post.id.toString(), this.commentNamespace);
    pubsub.publish<ICommentChange>({
      topic,
      payload: {
        commentChange: this.commonService.generateChange(
          comment,
          changeType,
          'id',
        ),
      },
    });
  }
}
