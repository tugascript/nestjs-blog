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

@Injectable()
export class PostsService {
  private readonly postAlias = 'p';

  constructor(
    @InjectRepository(PostEntity)
    private readonly postsRepository: EntityRepository<PostEntity>,
    private readonly commonService: CommonService,
    private readonly uploaderService: UploaderService,
    private readonly tagsService: TagsService,
    private readonly usersService: UsersService,
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
    const tags = await this.tagsService.findTagsByIds(userId, tagIds);
    post.tags.set(tags);
    post.picture = await this.uploaderService.uploadImage(
      userId,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.postsRepository, post, true);
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
    post.tags.add(tag);
    await this.commonService.saveEntity(this.postsRepository, post);
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
    const tag = await this.tagsService.tagById(userId, tagId);
    post.tags.remove(tag);
    await this.commonService.saveEntity(this.postsRepository, post);
    return post;
  }

  /**
   * Like Post
   *
   * The current user adds a like to a post.
   */
  public async likePost(userId: number, postId: number): Promise<PostEntity> {
    const post = await this.postById(postId);
    post.likes.add(this.usersService.getUserRef(userId));
    await this.commonService.saveEntity(this.postsRepository, post);
    return post;
  }

  /**
   * Unlike Post
   *
   * The current user removes a like from a post.
   */
  public async unlikePost(userId: number, postId: number): Promise<PostEntity> {
    const post = await this.postById(postId);
    post.likes.remove(this.usersService.getUserRef(userId));
    await this.commonService.saveEntity(this.postsRepository, post);
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
   * Author's Post By ID
   *
   * Single Read CRUD action for Post.
   * Finds a single post by ID of the current user.
   */
  private async authorsPostById(userId: number, postId: number) {
    const post = await this.postsRepository.findOne({
      author: userId,
      id: postId,
    });
    this.commonService.checkExistence('Post', post);
    return post;
  }
}
