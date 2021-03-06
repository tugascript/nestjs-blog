import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileUpload } from 'graphql-upload';
import { PubSub } from 'mercurius';
import { CommonService } from '../common/common.service';
import { ExtendedSearchDto } from '../common/dtos/extended-search.dto';
import {
  getQueryCursor,
  QueryCursorEnum,
} from '../common/enums/query-cursor.enum';
import { RatioEnum } from '../common/enums/ratio.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { NotificationTypeEnum } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { SeriesService } from '../series/series.service';
import { TagEntity } from '../tags/entities/tag.entity';
import { TagsService } from '../tags/tags.service';
import { UploaderService } from '../uploader/uploader.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { FilterPostLikesDto } from './dtos/filter-post-likes.dto';
import { FilterSeriesPostDto } from './dtos/filter-series-post.dto';
import { PostLikeEntity } from './entities/post-like.entity';
import { PostTagEntity } from './entities/post-tag.entity';
import { PostEntity } from './entities/post.entity';
import { CreatePostInput } from './inputs/create-post.input';
import { PostTagInput } from './inputs/post-tag.input';
import { UpdatePostPictureInput } from './inputs/update-post-picture.input';
import { UpdatePostInput } from './inputs/update-post.input';
import { SearchDto } from '../common/dtos/search.dto';

@Injectable()
export class PostsService {
  private readonly postAlias = 'p';
  private readonly postLikesAlias = 'pl';
  private readonly postTagsAlias = 'pt';

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
    const count = await this.postsRepository.count({
      title,
      author: userId,
    });

    if (count > 0)
      throw new BadRequestException('Post with this title already exists.');

    const post = await this.postsRepository.create({
      title,
      content,
      slug: this.commonService.generateSlug(title),
      author: userId,
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
    await this.updatePostLogic(post, title, content);
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
    await this.updatePostPictureLogic(post, picture);
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
    const count = await this.postTagsRepository.count({ tag, post });

    if (count > 0) throw new BadRequestException('Tag already added to post.');

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
   * Publish Post
   *
   * Publishes a given user's post and makes it public.
   */
  public async publishPost(
    userId: number,
    postId: number,
  ): Promise<PostEntity> {
    const post = await this.authorsPostById(userId, postId);

    if (post.published)
      throw new BadRequestException('Post already published.');

    post.published = true;
    await this.commonService.saveEntity(this.postsRepository, post);
    return post;
  }

  /**
   * Unpublish Post
   *
   * Unpublishes a given user's post and makes it private.
   */
  public async unpublishPost(
    userId: number,
    postId: number,
  ): Promise<PostEntity> {
    const post = await this.authorsPostById(userId, postId);

    if (!post.published)
      throw new BadRequestException('Post already unpublished.');

    post.published = false;
    await this.commonService.saveEntity(this.postsRepository, post);
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
    const count = await this.postLikesRepository.count({
      post,
      user: userId,
    });

    if (count > 0)
      throw new BadRequestException('You already liked this post.');

    const like = this.postLikesRepository.create({
      user: userId,
      post: postId,
    });
    await this.commonService.saveEntity(this.postLikesRepository, like, true);
    await this.notificationsService.createNotification(
      pubsub,
      NotificationTypeEnum.LIKE,
      userId,
      post.author.id,
      post,
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
      NotificationTypeEnum.LIKE,
      userId,
      post.author.id,
      post,
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
    const post = await this.postsRepository.findOne({
      id: postId,
      published: true,
    });
    this.commonService.checkExistence('Post', post);
    return post;
  }

  /**
   * Post By Slug
   *
   * Single Read CRUD action for Post.
   */
  public async postBySlug(slug: string): Promise<PostEntity> {
    const post = await this.postsRepository.findOne({
      slug: slug,
      published: true,
    });
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
  }: ExtendedSearchDto): Promise<IPaginated<PostEntity>> {
    const qb = this.postsRepository
      .createQueryBuilder(this.postAlias)
      .where({ published: true });

    if (search) {
      search = this.commonService.formatSearch(search);
      qb.andWhere({
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
   * Filter User's Posts
   *
   * Find posts of a given user.
   */
  public async filterUsersPosts(
    userId: number,
    { cursor, search, order, first, after }: SearchDto,
  ): Promise<IPaginated<PostEntity>> {
    const qb = this.postsRepository
      .createQueryBuilder(this.postAlias)
      .where({ author: userId });

    if (search) {
      search = this.commonService.formatSearch(search);
      qb.andWhere({
        title: {
          $iLike: search,
        },
      }).andWhere({
        content: {
          $iLike: search,
        },
      });
    }

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
    const idQuery = this.postTagsRepository
      .createQueryBuilder(this.postTagsAlias)
      .select(`${this.postTagsAlias}.post_id`)
      .where({
        tag: {
          $in: this.seriesService.seriesTagsQuery(seriesId),
        },
      })
      .getKnexQuery();
    const qb = this.postsRepository.createQueryBuilder(this.postAlias).where({
      published: true,
      id: {
        $in: idQuery,
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

  public async postTags(postId: number): Promise<TagEntity[]> {
    await this.checkPostExistence(postId);
    const idQuery = this.postTagsRepository
      .createQueryBuilder(this.postTagsAlias)
      .select(`${this.postTagsAlias}.tag_id`)
      .where({ post: postId })
      .getKnexQuery();
    return await this.tagsService.findTagsByIdsQuery(idQuery);
  }

  public async postLikes({
    postId,
    first,
    after,
    order,
  }: FilterPostLikesDto): Promise<IPaginated<UserEntity>> {
    await this.checkPostExistence(postId);
    const likesQuery = this.postLikesRepository
      .createQueryBuilder(this.postLikesAlias)
      .select(`${this.postLikesAlias}.user_id`)
      .where({ post: postId })
      .getKnexQuery();
    const qb = this.usersService
      .usersQueryBuilder()
      .where({ id: { $in: likesQuery } });
    return this.commonService.queryBuilderPagination(
      'u',
      'username',
      first,
      order,
      qb,
      after,
    );
  }

  public async checkPostExistence(postId: number): Promise<void> {
    const count = await this.postsRepository.count({ id: postId });
    if (count === 0) throw new NotFoundException('Post not found');
  }

  //_____ FOR ADMIN _____

  public async adminEditPost({
    postId,
    content,
    title,
  }: UpdatePostInput): Promise<PostEntity> {
    const post = await this.postById(postId);
    await this.updatePostLogic(post, title, content);
    return post;
  }

  public async adminEditPostPicture({
    postId,
    picture,
  }: UpdatePostPictureInput): Promise<PostEntity> {
    const post = await this.postById(postId);
    await this.updatePostPictureLogic(post, picture);
    return post;
  }

  public async adminDeletePost(postId: number): Promise<LocalMessageType> {
    const post = await this.postById(postId);
    await this.commonService.removeEntity(this.postsRepository, post);
    this.uploaderService.deleteFile(post.picture);
    return new LocalMessageType('Post deleted successfully');
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

  private async updatePostLogic(
    post: PostEntity,
    title?: string,
    content?: string,
  ): Promise<void> {
    if (title) {
      title = this.commonService.formatTitle(title);
      post.title = title;
      post.slug = this.commonService.generateSlug(title);
    }

    if (content) post.content = content;

    await this.commonService.saveEntity(this.postsRepository, post);
  }

  private async updatePostPictureLogic(
    post: PostEntity,
    picture: Promise<FileUpload>,
  ): Promise<void> {
    const toDelete = post.picture;
    post.picture = await this.uploaderService.uploadImage(
      post.author.id,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.postsRepository, post);
    this.uploaderService.deleteFile(toDelete);
  }
}
