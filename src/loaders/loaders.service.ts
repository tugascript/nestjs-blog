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
import { SeriesTagEntity } from '../series/entities/series-tag.entity';
import { PostTagEntity } from '../posts/entities/post-tag.entity';
import { PostLikeEntity } from '../posts/entities/post-like.entity';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { ICountResult } from './interfaces/count-result.interface';
import { CommentLikeEntity } from '../comments/entities/comment-like.entity';
import { ReplyEntity } from '../comments/entities/reply.entity';
import { ReplyLikeEntity } from '../comments/entities/reply-like.entity';
import { IPageResult } from './interfaces/page-result.interface';
import { ICreation } from '../common/interfaces/creation.interface';
import { IAuthored } from '../common/interfaces/authored.interface';

@Injectable()
export class LoadersService {
  private readonly seriesAlias = 's';
  private readonly seriesTagAlias = 'st';
  private readonly postAlias = 'p';
  private readonly postTagAlias = 'pt';
  private readonly tagAlias = 't';

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: EntityRepository<UserEntity>,
    @InjectRepository(SeriesEntity)
    private readonly seriesRepository: EntityRepository<SeriesEntity>,
    @InjectRepository(SeriesFollowerEntity)
    private readonly seriesFollowersRepository: EntityRepository<SeriesFollowerEntity>,
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

  private static getCounterResults(
    ids: number[],
    raw: ICountResult[],
  ): number[] {
    const map = new Map<number, number>();

    for (let i = 0; i < raw.length; i++) {
      const count = raw[i];
      map.set(count.id, count.count);
    }

    return LoadersService.getResults(ids, map);
  }

  /**
   * Basic Counter
   *
   * Loads the count of one-to-many relationships.
   */
  private static async basicCounter<T extends IBase, C extends IBase>(
    data: ILoader<T>[],
    parentRepo: EntityRepository<T>,
    childRepo: EntityRepository<C>,
    childRelation: keyof C,
  ): Promise<number[]> {
    if (data.length === 0) return [];

    const parentId = 'p.id';
    const knex = parentRepo.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = childRepo
      .createQueryBuilder('c')
      .count('c.id')
      .where({ [childRelation]: { $in: parentRef } })
      .as('count');
    const raw: ICountResult[] = await parentRepo
      .createQueryBuilder('p')
      .select([parentId, countQuery])
      .where({ id: { $in: ids } })
      .groupBy(parentId)
      .execute();

    return LoadersService.getCounterResults(ids, raw);
  }

  /**
   * Pivot Counter
   *
   * Loads the count of many-to-many relationships.
   */
  private static async pivotCounter<T extends IBase, P extends ICreation>(
    data: ILoader<T>[],
    parentRepo: EntityRepository<T>,
    pivotRepo: EntityRepository<P>,
    pivotParent: keyof P,
    pivotChild: keyof P,
  ): Promise<number[]> {
    if (data.length === 0) return [];

    const strPivotChild = String(pivotChild);
    const parentId = 'p.id';
    const knex = parentRepo.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = pivotRepo
      .createQueryBuilder('pt')
      .count(`pt.${strPivotChild}_id`)
      .where({ [pivotParent]: { $in: parentRef } })
      .as('count');
    const raw: ICountResult[] = await parentRepo
      .createQueryBuilder('p')
      .select([parentId, countQuery])
      .where({ id: { $in: ids } })
      .groupBy(parentId)
      .execute();

    return LoadersService.getCounterResults(ids, raw);
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

  //_________ POSTS LOADERS _________

  /**
   * Series Followers Count Loader
   *
   * Get followers count relation.
   */
  public seriesFollowersCountLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<number[]> => {
      return LoadersService.pivotCounter(
        data,
        this.seriesRepository,
        this.seriesFollowersRepository,
        'series',
        'user',
      );
    };
  }

  public seriesFollowersLoader() {
    return async (
      data: ILoader<SeriesEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        this.seriesRepository,
        this.seriesFollowersRepository,
        this.usersRepository,
        'series',
        'user',
        'username',
      );
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
      return LoadersService.pivotCounter(
        data,
        this.postsRepository,
        this.postLikesRepository,
        'post',
        'user',
      );
    };
  }

  //_________ COMMENTS LOADERS __________

  /**
   * Post Likes Loader
   *
   * Get paginated users of likes relation.
   */
  public postLikesLoader() {
    return async (
      data: ILoader<PostEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        this.postsRepository,
        this.postLikesRepository,
        this.usersRepository,
        'post',
        'user',
        'username',
      );
    };
  }

  /**
   * Post Comments Count Loader
   *
   * Get comments count relation.
   */
  public postCommentsCountLoader() {
    return async (data: ILoader<PostEntity>[]) => {
      return LoadersService.basicCounter(
        data,
        this.postsRepository,
        this.commentsRepository,
        'post',
      );
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
      return this.basicPaginator(
        data,
        this.postsRepository,
        this.commentsRepository,
        'post',
        'id',
      );
    };
  }

  public commentLikesCountLoader() {
    return async (data: ILoader<CommentEntity>[]) => {
      return LoadersService.pivotCounter(
        data,
        this.commentsRepository,
        this.commentLikesRepository,
        'comment',
        'user',
      );
    };
  }

  // REPLY LOADERS

  public commentLikesLoader() {
    return async (
      data: ILoader<CommentEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        this.commentsRepository,
        this.commentLikesRepository,
        this.usersRepository,
        'comment',
        'user',
        'username',
      );
    };
  }

  public commentRepliesCountLoader() {
    return async (data: ILoader<CommentEntity>[]): Promise<number[]> => {
      return LoadersService.basicCounter(
        data,
        this.commentsRepository,
        this.repliesRepository,
        'comment',
      );
    };
  }

  public commentRepliesLoader() {
    return async (data: ILoader<CommentEntity, FilterRelationDto>[]) => {
      // comments replies loader
      return this.basicPaginator(
        data,
        this.commentsRepository,
        this.repliesRepository,
        'comment',
        'id',
      );
    };
  }

  // USERS LOADERS

  public replyLikesCountLoader() {
    return async (data: ILoader<ReplyEntity>[]) => {
      return LoadersService.pivotCounter(
        data,
        this.repliesRepository,
        this.replyLikesRepository,
        'reply',
        'user',
      );
    };
  }

  public replyLikesLoader() {
    return async (data: ILoader<ReplyEntity, FilterRelationDto>[]) => {
      return this.pivotPaginator(
        data,
        this.repliesRepository,
        this.replyLikesRepository,
        this.usersRepository,
        'reply',
        'user',
        'username',
      );
    };
  }

  public replyMentionLoader() {
    return async (data: ILoader<ReplyEntity>[]) => {
      if (data.length === 0) return [];

      const replies = LoadersService.getEntities(data);
      await this.repliesRepository.populate(replies, ['mention']);
      const results: (UserEntity | null)[] = [];

      for (let i = 0; i < replies.length; i++) {
        results.push(replies[i].mention ?? null);
      }

      return results;
    };
  }

  public userLikedPostsCountLoader() {
    return async (data: ILoader<UserEntity>[]) => {
      return LoadersService.pivotCounter(
        data,
        this.usersRepository,
        this.postLikesRepository,
        'user',
        'post',
      );
    };
  }

  //_________ GENERIC LOADERS __________

  public userLikedPostsLoader() {
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.pivotPaginator(
        data,
        this.usersRepository,
        this.postLikesRepository,
        this.postsRepository,
        'user',
        'post',
        'id',
      );
    };
  }

  public usersFollowedSeriesCountLoader() {
    return async (data: ILoader<UserEntity>[]) => {
      return LoadersService.pivotCounter(
        data,
        this.usersRepository,
        this.seriesFollowersRepository,
        'user',
        'series',
      );
    };
  }

  public usersFollowedSeriesLoader() {
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.pivotPaginator(
        data,
        this.usersRepository,
        this.seriesFollowersRepository,
        this.seriesRepository,
        'user',
        'series',
        'id',
      );
    };
  }

  /**
   * Author Relation Loader
   *
   * Gets every author relation.
   */
  public authorRelationLoader<T extends IAuthored>() {
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

  /**
   * Basic Paginator
   *
   * Loads paginated one-to-many relationships
   */
  private async basicPaginator<T extends IBase, C extends IBase>(
    data: ILoader<T, FilterRelationDto>[],
    parentRepo: EntityRepository<T>,
    childRepo: EntityRepository<C>,
    childRelation: keyof C,
    cursor: keyof C,
  ): Promise<IPaginated<C>[]> {
    if (data.length === 0) return [];

    const { first, order } = data[0].params;
    const parentId = 'p.id';
    const childAlias = 'c';
    const childId = 'c.id';
    const knex = parentRepo.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = childRepo
      .createQueryBuilder(childAlias)
      .count(childId)
      .where({ [childRelation]: { $in: parentRef } })
      .as('count');
    const entitiesQuery = childRepo
      .createQueryBuilder(childAlias)
      .where({ [childRelation]: { $in: parentRef } })
      .orderBy({ [cursor]: order })
      .limit(first)
      .as('entities');
    const raw: IPageResult<C>[] = await parentRepo
      .createQueryBuilder('p')
      .select([parentId, countQuery, entitiesQuery])
      .where({ id: { $in: ids } })
      .groupBy([parentId, childId])
      .execute();

    return this.getPaginationResults<C>(first, childRepo, cursor, ids, raw);
  }

  /**
   * Pivot Paginator
   *
   * Loads paginated many-to-many relationships
   */
  private async pivotPaginator<
    T extends IBase,
    P extends ICreation,
    C extends IBase,
  >(
    data: ILoader<T, FilterRelationDto>[],
    parentRepo: EntityRepository<T>,
    pivotRepo: EntityRepository<P>,
    childRepo: EntityRepository<C>,
    pivotParent: keyof P,
    pivotChild: keyof P,
    cursor: keyof C,
  ): Promise<IPaginated<C>[]> {
    if (data.length === 0) return [];

    // Because of runtime
    const strPivotChild = String(pivotChild);
    const strPivotParent = String(pivotParent);

    const { first, order } = data[0].params;
    const parentId = 'p.id';
    const knex = parentRepo.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = pivotRepo
      .createQueryBuilder('pt')
      .count(`pt.${strPivotChild}_id`)
      .where({ [strPivotParent]: { $in: parentRef } })
      .as('count');
    const pivotQuery = pivotRepo
      .createQueryBuilder('pt')
      .select(`pt.${strPivotChild}_id`)
      .where({ [strPivotParent]: { $in: parentRef } })
      .getKnexQuery();
    const entitiesQuery = childRepo
      .createQueryBuilder('c')
      .select('c.*')
      .where({ id: { $in: pivotQuery } })
      .orderBy({ [cursor]: order })
      .limit(first)
      .as('entities');
    const raw: IPageResult<C>[] = await parentRepo
      .createQueryBuilder('p')
      .select([parentId, countQuery, entitiesQuery])
      .where({ id: { $in: ids } })
      .groupBy([parentId, 'c.id'])
      .execute();

    return this.getPaginationResults<C>(first, childRepo, cursor, ids, raw);
  }

  private getPaginationResults<T extends IBase>(
    first: number,
    childRepo: EntityRepository<T>,
    cursor: keyof T,
    ids: number[],
    raw: IPageResult<T>[],
  ): IPaginated<T>[] {
    const map = new Map<number, IPaginated<T>>();

    for (let i = 0; i < raw.length; i++) {
      const { id, count, entities } = raw[i];
      const entitiesArr: T[] = [];

      for (let j = 0; j < entities.length; j++) {
        entitiesArr.push(childRepo.map(entities[j]));
      }

      map.set(
        id,
        this.commonService.paginate(entitiesArr, count, 0, cursor, first),
      );
    }

    return LoadersService.getResults(ids, map);
  }
}
