import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { UserEntity } from '../users/entities/user.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { TagEntity } from '../tags/entities/tag.entity';
import { SeriesEntity } from '../series/entities/series.entity';
import { PostEntity } from '../posts/entities/post.entity';
import { CommentEntity } from '../comments/entities/comment.entity';
import { CommonService } from '../common/common.service';
import { ILoader } from './interfaces/loader.interface';
import { FilterPostsRelationDto } from '../series/dtos/filter-posts-relation.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { IBase } from '../common/interfaces/base.interface';
import { getQueryCursor } from '../common/enums/query-cursor.enum';
import { ISeriesPostsResult } from './interfaces/series-posts-result.interface';
import { SeriesFollowerEntity } from '../series/entities/series-follower.entity';
import { ISeriesFollowerCountResult } from './interfaces/series-followers-count-result.interface';
import { SeriesTagEntity } from '../series/entities/series-tag.entity';
import { PostTagEntity } from '../posts/entities/post-tag.entity';
import { PostLikeEntity } from '../posts/entities/post-like.entity';
import { IPostLikesCount } from './interfaces/post-likes-count-result.interface';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { ILikesResult } from './interfaces/likes-result.interface';
import { ICountResult } from './interfaces/count-result.interface';
import { IPostCommentsResult } from './interfaces/post-comments-result.interface';
import { IUser } from '../users/interfaces/user.interface';
import { CommentLikeEntity } from '../comments/entities/comment-like.entity';
import { ReplyEntity } from '../comments/entities/reply.entity';
import { ReplyLikeEntity } from '../comments/entities/reply-like.entity';

@Injectable()
export class LoadersService {
  private readonly userAlias = 'u';
  private readonly seriesAlias = 's';
  private readonly seriesTagAlias = 'st';
  private readonly postAlias = 'p';
  private readonly postTagAlias = 'pt';
  private readonly postLikeAlias = 'pl';
  private readonly commentAlias = 'c';
  private readonly commentLikeAlias = 'cl';
  private readonly replyAlias = 'r';
  private readonly replyLikeAlies = 'rl';
  private readonly tagAlias = 't';
  private readonly followersAlias = 'f';

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: EntityRepository<UserEntity>,
    @InjectRepository(SeriesEntity)
    private readonly seriesRepository: EntityRepository<SeriesEntity>,
    @InjectRepository(SeriesFollowerEntity)
    private readonly seriesFollowerRepository: EntityRepository<SeriesFollowerEntity>,
    @InjectRepository(SeriesTagEntity)
    private readonly seriesTagsRepository: EntityRepository<SeriesTagEntity>,
    @InjectRepository(PostEntity)
    private readonly postsRepository: EntityRepository<PostEntity>,
    @InjectRepository(PostTagEntity)
    private readonly postTagsRepository: EntityRepository<PostTagEntity>,
    @InjectRepository(PostLikeEntity)
    private readonly postLikesRepository: EntityRepository<PostLikeEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentsRepository: EntityRepository<CommentEntity>,
    @InjectRepository(CommentLikeEntity)
    private readonly commentLikesRepository: EntityRepository<CommentLikeEntity>,
    @InjectRepository(ReplyEntity)
    private readonly repliesRepository: EntityRepository<ReplyEntity>,
    @InjectRepository(ReplyLikeEntity)
    private readonly replyLikesRepository: EntityRepository<ReplyLikeEntity>,
    private readonly commonService: CommonService,
  ) {}

  /**
   * Get Entities
   *
   * Maps the entity object to the entity itself.
   */
  private static getEntities<T extends IBase, P = undefined>(
    items: ILoader<T, P>[],
  ): T[] {
    const entities: T[] = [];

    for (let i = 0; i < items.length; i++) {
      entities.push(items[i].obj);
    }

    return entities;
  }

  /**
   * Get Entity IDs
   *
   * Maps the entity object to an array of IDs.
   */
  private static getEntityIds<T extends IBase, P = undefined>(
    items: ILoader<T, P>[],
  ): number[] {
    const ids: number[] = [];

    for (let i = 0; i < items.length; i++) {
      ids.push(items[i].obj.id);
    }

    return ids;
  }

  /**
   * Get Relation IDs
   *
   * Maps the entity object many-to-one relation to an array of IDs.
   */
  private static getRelationIds<T extends IBase>(
    items: ILoader<T>[],
    relationName: string,
  ): number[] {
    const ids: number[] = [];

    for (let i = 0; i < items.length; i++) {
      ids.push(items[i].obj[relationName].id);
    }

    return ids;
  }

  /**
   * Get Entity Map
   *
   * Turns an array of entity objects to a map of entity objects
   * with its ID as the key.
   */
  private static getEntityMap<T extends IBase>(entities: T[]): Map<number, T> {
    const map = new Map<number, T>();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      map.set(entity.id, entity);
    }

    return map;
  }

  /**
   * Get Results
   *
   * With the IDs of the relation id array, gets the results of the map.
   */
  private static getResults<T>(ids: number[], map: Map<number, T>): T[] {
    const results: T[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      results.push(map.get(id));
    }

    return results;
  }

  //_________ SERIES LOADERS _________
  /**
   * Series Tags Loader
   *
   * Get tags relation.
   */
  public seriesTagsLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<TagEntity[][]> => {
      if (data.length === 0) return [];

      const series = LoadersService.getEntities(data);
      await this.seriesRepository.populate(series, ['tags', 'tags.tag']);
      const tags: TagEntity[][] = [];

      for (let i = 0; i < series.length; i++) {
        const seriesTags = series[i].tags.getItems();
        const innerTags: TagEntity[] = [];

        for (let j = 0; j < seriesTags.length; j++) {
          innerTags.push(seriesTags[j].tag);
        }

        tags.push(innerTags);
      }

      return tags;
    };
  }

  /**
   * Series Followers Count Loader
   *
   * Get followers count relation.
   */
  public seriesFollowersCountLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<number[]> => {
      if (data.length === 0) return [];

      const ids = LoadersService.getEntityIds(data);
      const seriesId = this.seriesAlias + '.id';
      const knex = this.seriesFollowerRepository.getKnex();
      const seriesRef = knex.ref(seriesId);
      const followersCount = this.seriesFollowerRepository
        .createQueryBuilder(this.followersAlias)
        .count(`${this.followersAlias}.user_id`)
        .where({
          series: {
            $in: seriesRef,
          },
        })
        .as('count');
      const raw: ISeriesFollowerCountResult[] =
        await this.seriesFollowerRepository
          .createQueryBuilder(this.followersAlias)
          .select([`${this.followersAlias}.series_id`, followersCount])
          .where({
            series: {
              $in: ids,
            },
          })
          .execute();
      const map = new Map<number, number>();

      for (let i = 0; i < raw.length; i++) {
        map.set(raw[i].series_id, raw[i].count);
      }

      return LoadersService.getResults(ids, map);
    };
  }

  /**
   * Series Posts Loader
   *
   * Get posts paginated relation.
   */
  public seriesPostsLoader() {
    return async (
      data: ILoader<SeriesEntity, FilterPostsRelationDto>[],
    ): Promise<IPaginated<PostEntity>[]> => {
      if (data.length === 0) return [];

      const { cursor, order, first } = data[0].params;
      const ids = LoadersService.getEntityIds(data);
      const knex = this.seriesRepository.getKnex();
      const seriesId = this.seriesAlias + '.id';
      const seriesRef = knex.ref(seriesId);
      const seriesTagsQuery = this.seriesTagsRepository
        .createQueryBuilder(this.seriesTagAlias)
        .select([`${this.seriesTagAlias}.tag_id`])
        .where({ series: seriesRef })
        .getKnexQuery();
      const postsCountQuery = await this.postTagsRepository
        .createQueryBuilder(this.postTagAlias)
        .count(`${this.postTagAlias}.post_id`)
        .where({
          tag: {
            $in: seriesTagsQuery,
          },
        })
        .as('posts_count');
      const strCursor = getQueryCursor(cursor);
      const postsQuery = this.postsRepository
        .createQueryBuilder(this.postAlias)
        .leftJoin(`${this.postAlias}.tags`, this.tagAlias)
        .select(`${this.postAlias}.*`)
        .where({
          tags: {
            tag: {
              $in: seriesTagsQuery,
            },
          },
        })
        .orderBy({
          [strCursor]: order,
        })
        .limit(first)
        .as('posts');
      const raw: ISeriesPostsResult[] = await this.seriesRepository
        .createQueryBuilder(this.seriesAlias)
        .select([seriesId, postsCountQuery, postsQuery])
        .where({ id: { $in: ids } })
        .groupBy([seriesId, `${this.postAlias}.id`])
        .execute();
      const resultMap = new Map<number, IPaginated<PostEntity>>();

      for (let i = 0; i < raw.length; i++) {
        const { posts, posts_count, id } = raw[i];
        const entities: PostEntity[] = [];

        for (let j = 0; j < posts.length; j++) {
          entities.push(this.postsRepository.map(posts[j]));
        }

        resultMap.set(
          id,
          this.commonService.paginate(
            entities,
            posts_count,
            0,
            strCursor,
            first,
          ),
        );
      }

      return LoadersService.getResults(ids, resultMap);
    };
  }

  //_________ POSTS LOADERS _________

  /**
   * Post Tags Loader
   *
   * Get tags relation.
   */
  public postTagsLoader() {
    return async (data: ILoader<PostEntity>[]): Promise<TagEntity[][]> => {
      if (data.length === 0) return [];

      const posts = LoadersService.getEntities(data);
      await this.postsRepository.populate(posts, ['tags', 'tags.tag']);
      const tags: TagEntity[][] = [];

      for (let i = 0; i < posts.length; i++) {
        const postsTags = posts[i].tags.getItems();
        const innerTags: TagEntity[] = [];

        for (let j = 0; j < postsTags.length; j++) {
          innerTags.push(postsTags[j].tag);
        }

        tags.push(innerTags);
      }

      return tags;
    };
  }

  /**
   * Post Likes Count Loader
   *
   * Get likes count relation.
   */
  public postLikesCountLoader() {
    return async (data: ILoader<PostEntity>[]): Promise<number[]> => {
      if (data.length === 0) return [];

      const ids = LoadersService.getEntityIds(data);
      const knex = this.postLikesRepository.getKnex();
      const postId = this.postAlias + '.id';
      const postRef = knex.ref(postId);
      const likesCount = this.postLikesRepository
        .createQueryBuilder(this.postLikeAlias)
        .count(`${this.postLikeAlias}.user_id`)
        .where({
          post: {
            $in: postRef,
          },
        })
        .as('count');
      const raw: IPostLikesCount[] = await this.postLikesRepository
        .createQueryBuilder(this.postLikeAlias)
        .select([`${this.postLikeAlias}.post_id`, likesCount])
        .where({
          post: { $in: ids },
        })
        .groupBy(`${this.postLikeAlias}.post_id`)
        .execute();
      const map = new Map<number, number>();

      for (let i = 0; i < raw.length; i++) {
        map.set(raw[i].post_id, raw[i].count);
      }

      return LoadersService.getResults(ids, map);
    };
  }

  /**
   * Post Likes Loader
   *
   * Get paginated users of likes relation.
   */
  public postLikesLoader() {
    return async (
      data: ILoader<PostEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      if (data.length === 0) return [];

      const { first, order } = data[0].params;
      const ids = LoadersService.getEntityIds(data);
      const knex = this.postsRepository.getKnex();
      const postId = this.postAlias + '.id';
      const postRef = knex.ref(postId);
      const likesCountQuery = this.postLikesRepository
        .createQueryBuilder(this.postLikeAlias)
        .count(`${this.postLikeAlias}.user_id`)
        .where({
          post: {
            $in: postRef,
          },
        })
        .as('likes_count');
      const usersQuery = this.usersRepository
        .createQueryBuilder(this.userAlias)
        .leftJoin(`${this.userAlias}.likedPosts`, this.postLikeAlias)
        .where({ likedPosts: { $in: postRef } })
        .orderBy({
          username: order,
        })
        .limit(first)
        .as('users');
      const raw: ILikesResult[] = await this.postsRepository
        .createQueryBuilder(this.postAlias)
        .select([postId, likesCountQuery, usersQuery])
        .where({ id: { $in: ids } })
        .groupBy([postId, `${this.userAlias}.id`])
        .execute();
      const map = new Map<number, IPaginated<UserEntity>>();

      for (let i = 0; i < raw.length; i++) {
        const { likes_count, users, id } = raw[i];
        const usersArray: UserEntity[] = [];

        for (let j = 0; j < users.length; j++) {
          usersArray.push(this.usersRepository.map(users[j]));
        }

        map.set(
          id,
          this.commonService.paginate(
            usersArray,
            likes_count,
            0,
            'username',
            first,
          ),
        );
      }

      return LoadersService.getResults(ids, map);
    };
  }

  /**
   * Post Comments Count Loader
   *
   * Get comments count relation.
   */
  public postCommentsCountLoader() {
    return async (data: ILoader<PostEntity>[]) => {
      if (data.length === 0) return [];

      const ids = LoadersService.getEntityIds(data);
      const postId = this.postAlias + '.id';
      const knex = this.commentsRepository.getKnex();
      const postRef = knex.ref(postId);
      const commentsCount = this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .count(`${this.commentAlias}.id`)
        .where({
          post: {
            $in: postRef,
          },
        })
        .as('count');
      const raw: ICountResult[] = await this.postsRepository
        .createQueryBuilder(this.postAlias)
        .select([postId, commentsCount])
        .where({ id: { $in: ids } })
        .groupBy(postId)
        .execute();
      const map = new Map<number, number>();

      for (let i = 0; i < raw.length; i++) {
        map.set(raw[i].id, raw[i].count);
      }

      return LoadersService.getResults(ids, map);
    };
  }

  /**
   * Post Comments Loader
   *
   * Get paginated comments of post.
   */
  public postCommentsLoader() {
    return async (
      data: ILoader<PostEntity, FilterRelationDto>[],
    ): Promise<IPaginated<CommentEntity>[]> => {
      if (data.length === 0) return [];

      const { first, order } = data[0].params;
      const ids = LoadersService.getEntityIds(data);
      const knex = this.postsRepository.getKnex();
      const postId = this.postAlias + '.id';
      const postRef = knex.ref(postId);
      const commentsCountQuery = this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .count(`${this.commentAlias}.id`)
        .where({
          post: {
            $in: postRef,
          },
        })
        .as('comments_count');
      const commentsQuery = this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .where({ post: { $in: postRef } })
        .orderBy({
          id: order,
        })
        .limit(first)
        .as('comments');
      const raw: IPostCommentsResult[] = await this.postsRepository
        .createQueryBuilder(this.postAlias)
        .select([postId, commentsCountQuery, commentsQuery])
        .where({ id: { $in: ids } })
        .groupBy([postId, `${this.commentAlias}.id`])
        .execute();
      const map = new Map<number, IPaginated<CommentEntity>>();

      for (let i = 0; i < raw.length; i++) {
        const { comments_count, comments, id } = raw[i];
        const commentsArray: CommentEntity[] = [];

        for (let j = 0; j < comments.length; j++) {
          commentsArray.push(this.commentsRepository.map(comments[j]));
        }

        map.set(
          id,
          this.commonService.paginate(
            commentsArray,
            comments_count,
            0,
            'id',
            first,
          ),
        );
      }
    };
  }

  //_________ COMMENTS LOADERS __________

  public commentsLikesCountLoader() {
    return async (data: ILoader<CommentEntity>[]) => {
      if (data.length === 0) return [];

      const ids = LoadersService.getEntityIds(data);
      const commentId = this.commentAlias + '.id';
      const knex = this.commentLikesRepository.getKnex();
      const commentRef = knex.ref(commentId);
      const likesCount = this.commentLikesRepository
        .createQueryBuilder(this.commentLikeAlias)
        .count(`${this.commentLikeAlias}.id`)
        .where({ comment: { $in: commentRef } })
        .as('count');
      const raw: ICountResult[] = await this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .select([`${this.commentAlias}.id`, likesCount])
        .where({ id: { $in: ids } })
        .groupBy(`${this.commentAlias}.id`)
        .execute();
      const map = new Map<number, number>();

      for (let i = 0; i < raw.length; i++) {
        map.set(raw[i].id, raw[i].count);
      }

      return LoadersService.getResults(ids, map);
    };
  }

  public commentsLikesLoader() {
    return async (
      data: ILoader<CommentEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      if (data.length === 0) return [];

      const { first, order } = data[0].params;
      const ids = LoadersService.getEntityIds(data);
      const knex = this.commentsRepository.getKnex();
      const commentId = this.commentAlias + '.id';
      const commentRef = knex.ref(commentId);
      const likesCountQuery = this.commentLikesRepository
        .createQueryBuilder(this.commentLikeAlias)
        .count(`${this.commentLikeAlias}.user_id`)
        .where({ comment: { $in: commentRef } })
        .as('likes_count');
      const usersQuery = this.usersRepository
        .createQueryBuilder(this.userAlias)
        .leftJoin(`${this.userAlias}.likedComments`, this.commentLikeAlias)
        .where({ likedComments: { $in: commentRef } })
        .orderBy({
          username: order,
        })
        .limit(first)
        .as('users');
      const raw: ILikesResult[] = await this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .select([commentId, likesCountQuery, usersQuery])
        .where({ id: { $in: ids } })
        .groupBy([commentId, `${this.commentLikeAlias}.id`])
        .execute();
      const map = new Map<number, IPaginated<UserEntity>>();

      for (let i = 0; i < raw.length; i++) {
        const { likes_count, users, id } = raw[i];
        const usersArr: UserEntity[] = [];

        for (let j = 0; j < users.length; j++) {
          usersArr.push(this.usersRepository.map(users[j]));
        }

        map.set(
          id,
          this.commonService.paginate(usersArr, likes_count, 0, 'id', first),
        );
      }

      return LoadersService.getResults(ids, map);
    };
  }

  public commentsRepliesCountLoader() {
    return async (
      data: ILoader<CommentEntity, FilterRelationDto>[],
    ): Promise<number[]> => {
      // @todo: edit this loader with the repliesRepository

      if (data.length === 0) return [];

      const { first, order } = data[0].params;
      const ids = LoadersService.getEntityIds(data);
      const knex = this.commentsRepository.getKnex();
      const commentId = this.commentAlias + '.id';
      const commentRef = knex.ref(commentId);
      const repliesCount = this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .count(`${this.commentAlias}.id`)
        .where({ parent: { $in: commentRef } })
        .as('count');
      const raw: ICountResult[] = await this.commentsRepository
        .createQueryBuilder(this.commentAlias)
        .select([commentId, repliesCount])
        .where({ id: { $in: ids } })
        .groupBy(commentId)
        .execute();
      const map = new Map<number, number>();

      for (let i = 0; i < raw.length; i++) {
        map.set(raw[i].id, raw[i].count);
      }

      return LoadersService.getResults(ids, map);
    };
  }

  //_________ GENERIC LOADERS __________

  /**
   * Comments Post Loader
   *
   * Get post relation.
   */
  public authorRelation<T extends IBase & { author: IUser }>() {
    return async (data: ILoader<T>[]): Promise<UserEntity[]> => {
      if (data.length === 0) return [];

      const ids = LoadersService.getRelationIds(data, 'author');
      const users = await this.usersRepository.find({
        id: {
          $in: ids,
        },
      });
      const map = LoadersService.getEntityMap(users);
      return LoadersService.getResults(ids, map);
    };
  }
}
