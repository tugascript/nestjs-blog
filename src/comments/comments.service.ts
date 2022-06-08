import { profanity } from '@2toad/profanity';
import { CensorType } from '@2toad/profanity/dist/models';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from 'mercurius';
import { v5 as uuidV5 } from 'uuid';
import { CommonService } from '../common/common.service';
import { ChangeTypeEnum } from '../common/enums/change-type.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { NotificationTypeEnum } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { PostsService } from '../posts/posts.service';
import { UsersService } from '../users/users.service';
import { FilterCommentsDto } from './dtos/filter-comments.dto';
import { CommentLikeEntity } from './entities/comment-like.entity';
import { CommentEntity } from './entities/comment.entity';
import { CreateCommentInput } from './inputs/create-comment.input';
import { UpdateCommentInput } from './inputs/update-comment.input';
import { ICommentChange } from './interfaces/comment-change.interface';

@Injectable()
export class CommentsService {
  private readonly commentAlias = 'c';
  private readonly commentNamespace =
    this.configService.get<string>('COMMENT_UUID');

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentsRepository: EntityRepository<CommentEntity>,
    @InjectRepository(CommentLikeEntity)
    private readonly commentLikesRepository: EntityRepository<CommentLikeEntity>,
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

  public async commentById(commentId: number): Promise<CommentEntity> {
    const comment = await this.commentsRepository.findOne({ id: commentId });
    this.commonService.checkExistence('Comment', comment);
    return comment;
  }

  //_____ ADMIN _____//

  public async adminDeleteComment(
    pubsub: PubSub,
    commentId: number,
  ): Promise<LocalMessageType> {
    const comment = await this.commentById(commentId);
    return await this.deleteCommentLogic(pubsub, comment);
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
}
