import { Injectable } from '@nestjs/common';
import { CreatePostInput } from './inputs/create-post.input';
import { UpdatePostInput } from './inputs/update-post.input';
import { InjectRepository } from '@mikro-orm/nestjs';
import { PostEntity } from './entities/post.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { CommonService } from '../common/common.service';
import { TagsService } from '../tags/tags.service';
import { UploaderService } from '../uploader/uploader.service';
import { RatioEnum } from '../common/enums/ratio.enum';
import { UpdatePostPictureInput } from './inputs/update-post-picture.input';
import { LocalMessageType } from '../common/gql-types/message.type';
import { PostTagInput } from './inputs/post-tag.input';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { SearchPostsDto } from './dtos/search-posts.dto';
import {
  getQueryCursor,
  QueryCursorEnum,
} from '../common/enums/query-cursor.enum';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PubSub } from 'mercurius';
import { NotificationTypeEnum } from '../notifications/enums/notification-type.enum';
import { FilterSeriesPostDto } from './dtos/filter-series-post.dto';
import { SeriesService } from '../series/series.service';
import { PostLikeEntity } from './entities/post-like.entity';
import { PostTagEntity } from './entities/post-tag.entity';

@Injectable()
export class PostsService {
  private readonly postAlias = 'p';

  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: EntityRepository<PostEntity>,
    @InjectRepository(PostLikeEntity)
    private readonly postLikesRepository: EntityRepository<PostLikeEntity>,
    @InjectRepository(PostTagEntity)
    private readonly postTagsRepository: EntityRepository<PostTagEntity>,
    private readonly commonService: CommonService,
    private readonly uploaderService: UploaderService,
    private readonly tagsService: TagsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly seriesService: SeriesService,
  ) {}

  /**
   * Create Post
   *
   * Create CRUD action for Posts.
   */
  public async createPost(
    userId: number,
    { title, picture, tagIds, content }: CreatePostInput,
  ): Promise<PostEntity> {
    title = this.commonService.formatTitle(title);
    const post = await this.postsRepository.create({
      title,
      content,
      slug: this.commonService.generateSlug(title),
    });
    post.picture = await this.uploaderService.uploadImage(
      userId,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.postsRepository, post, true);
    const tags = await this.tagsService.findTagsByIds(userId, tagIds);
    const postTags: PostTagEntity[] = [];

    for (let i = 0; i < tags.length; i++) {
      postTags.push(
        this.postTagsRepository.create({
          tag: tags[i],
          post,
        }),
      );
    }

    await this.commonService.throwDuplicateError(
      this.postTagsRepository.persistAndFlush(postTags),
    );
    return post;
  }

  /**
   * Update Post
   *
   * Update CRUD action for Posts.
   */
  public async updatePost(
    userId: number,
    { postId, title, content }: UpdatePostInput,
  ): Promise<PostEntity> {
    const post = await this.authorsPostById(userId, postId);

    if (title) {
      title = this.commonService.formatTitle(title);
      post.title = title;
      post.slug = this.commonService.generateSlug(title);
    }

    if (content) post.content = content;

    await this.commonService.saveEntity(this.postsRepository, post);
    return post;
  }

  /**
   * Update Post Picture
   *
   * Update CRUD action for Posts.
   * Updates the picture so there is no extra picture in the bucket.
   */
  public async updatePostPicture(
    userId: number,
    { postId, picture }: UpdatePostPictureInput,
  ): Promise<PostEntity> {
    const post = await this.authorsPostById(userId, postId);
    const toDelete = post.picture;
    post.picture = await this.uploaderService.uploadImage(
      userId,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.postsRepository, post);
    this.uploaderService.deleteFile(toDelete);
    return post;
  }

  /**
   * Add Tag To Post
   *
   * Update CRUD action for Post.
   * Adds a new tag to a given post.
   */
  public async addTagToPost(
    userId: number,
    { postId, tagId }: PostTagInput,
  ): Promise<PostEntity> {
    const post = await this.authorsPostById(userId, postId);
    const tag = await this.tagsService.tagById(userId, tagId);
    const postTag = this.postTagsRepository.create({
      tag,
      post,
    });
    await this.commonService.saveEntity(this.postTagsRepository, postTag, true);
    return post;
  }

  /**
   * Remove Tag From Post
   *
   * Update CRUD action for Post.
   * Removes a tag from a given post.
   */
  public async removeTagFromPost(
    userId: number,
    { postId, tagId }: PostTagInput,
  ): Promise<PostEntity> {
    const post = await this.authorsPostById(userId, postId);
    const postTag = await this.postTagByPKs(postId, tagId);
    await this.commonService.removeEntity(this.postTagsRepository, postTag);
    return post;
  }

  /**
   * Like Post
   *
   * The current user adds a like to a post.
   */
  public async likePost(
    pubsub: PubSub,
    userId: number,
    postId: number,
  ): Promise<PostEntity> {
    const post = await this.postById(postId);
    const like = this.postLikesRepository.create({
      user: userId,
      post: postId,
    });
    await this.commonService.saveEntity(this.postLikesRepository, like, true);
    await this.notificationsService.createAppNotification(
      pubsub,
      NotificationTypeEnum.POST_LIKE,
      userId,
      post.author.id,
      postId,
    );
    return post;
  }

  /**
   * Unlike Post
   *
   * The current user removes a like from a post.
   */
  public async unlikePost(
    pubsub: PubSub,
    userId: number,
    postId: number,
  ): Promise<PostEntity> {
    const post = await this.postById(postId);
    const like = await this.postLikeByPKs(userId, postId);
    await this.commonService.removeEntity(this.postLikesRepository, like);
    await this.notificationsService.removeNotification(
      pubsub,
      NotificationTypeEnum.POST_LIKE,
      userId,
      post.author.id,
      postId,
    );
    return post;
  }

  /**
   * Delete Post
   *
   * Delete CRUD action for Posts.
   */
  public async deletePost(
    userId: number,
    postId: number,
  ): Promise<LocalMessageType> {
    const post = await this.authorsPostById(userId, postId);
    await this.commonService.removeEntity(this.postsRepository, post);
    this.uploaderService.deleteFile(post.picture);
    return new LocalMessageType('Post deleted successfully');
  }

  /**
   * Post By ID
   *
   * Single Read CRUD action for Post.
   */
  public async postById(postId: number): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({ id: postId });
    this.commonService.checkExistence('Post', post);
    return post;
  }

  /**
   * Post By Slug
   *
   * Single Read CRUD action for Post.
   */
  public async postBySlug(slug: string): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({ slug: slug });
    this.commonService.checkExistence('Post', post);
    return post;
  }

  /**
   * Filter Posts
   *
   * Multi Read CRUD action for Posts.
   */
  public async filterPosts({
    authorId,
    cursor,
    search,
    order,
    first,
    after,
  }: SearchPostsDto): Promise<IPaginated<PostEntity>> {
    const qb = this.postsRepository.createQueryBuilder(this.postAlias);

    if (search) {
      search = this.commonService.formatSearch(search);
      qb.where({
        title: {
          $iLike: search,
        },
      }).andWhere({
        content: {
          $iLike: search,
        },
      });
    }

    if (authorId) qb.andWhere({ author: authorId });

    return this.commonService.queryBuilderPagination(
      this.postAlias,
      getQueryCursor(cursor),
      first,
      order,
      qb,
      after,
      cursor === QueryCursorEnum.DATE,
    );
  }

  /**
   * Filter Series' Posts
   *
   * Multi Read CRUD action for Posts.
   * Find posts with the tags of a given series.
   */
  public async filterSeriesPosts({
    seriesId,
    cursor,
    order,
    first,
    after,
  }: FilterSeriesPostDto): Promise<IPaginated<PostEntity>> {
    const series = await this.seriesService.seriesWithTags(seriesId);
    const tags = series.tags.getItems();
    const tagIds: number[] = [];

    for (let i = 0; i < tags.length; i++) {
      tagIds.push(tags[i].tag.id);
    }

    const qb = this.postsRepository
      .createQueryBuilder(this.postAlias)
      .leftJoin(`${this.postAlias}.tags`, 't')
      .where({
        tags: {
          tag: {
            $in: tagIds,
          },
        },
      });
    return this.commonService.queryBuilderPagination(
      this.postAlias,
      getQueryCursor(cursor),
      first,
      order,
      qb,
      after,
      cursor === QueryCursorEnum.DATE,
    );
  }

  /**
   * Author's Post By ID
   *
   * Single Read CRUD action for Post.
   * Finds a single post by ID of the current user.
   */
  private async authorsPostById(
    userId: number,
    postId: number,
  ): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({
      author: userId,
      id: postId,
    });
    this.commonService.checkExistence('Post', post);
    return post;
  }

  /**
   * Post Like By PKs
   *
   * Gets a like entity given the user and post IDs.
   */
  private async postLikeByPKs(
    userId: number,
    postId: number,
  ): Promise<PostLikeEntity> {
    const postLike = await this.postLikesRepository.findOne({
      user: userId,
      post: postId,
    });
    this.commonService.checkExistence('Post Like', postLike);
    return postLike;
  }

  /**
   * Post Like By PKs
   *
   * Gets a like entity given the tag and post IDs.
   */
  private async postTagByPKs(
    postId: number,
    tagId: number,
  ): Promise<PostTagEntity> {
    const postTag = await this.postTagsRepository.findOne({
      tag: tagId,
      post: postId,
    });
    this.commonService.checkExistence('Post Tag', postTag);
    return postTag;
  }
}
