import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, Type } from '@nestjs/common';
import { CommentLikeEntity } from '../comments/entities/comment-like.entity';
import { CommentEntity } from '../comments/entities/comment.entity';
import { IComment } from '../comments/interfaces/comments.interface';
import { CommonService } from '../common/common.service';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { IAuthored } from '../common/interfaces/authored.interface';
import { IBase } from '../common/interfaces/base.interface';
import { ICreation } from '../common/interfaces/creation.interface';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { PostLikeEntity } from '../posts/entities/post-like.entity';
import { PostEntity } from '../posts/entities/post.entity';
import { IPost } from '../posts/interfaces/post.interface';
import { ReplyLikeEntity } from '../replies/entities/reply-like.entity';
import { ReplyEntity } from '../replies/entities/reply.entity';
import { IReply } from '../replies/interfaces/reply.interface';
import { SeriesFollowerEntity } from '../series/entities/series-follower.entity';
import { SeriesEntity } from '../series/entities/series.entity';
import { ISeries } from '../series/interfaces/series.interface';
import { TagEntity } from '../tags/entities/tag.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ICountResult } from './interfaces/count-result.interface';
import { ILoader } from './interfaces/loader.interface';
import { IGqlCtx } from '../common/interfaces/gql-ctx.interface';
import { contextToUser } from '../common/helpers/context-to-user';
import { ISeriesFollowedResult } from './interfaces/series-followed-result.interface';
import { ILikedResult } from './interfaces/liked-result.interface';
import { QueryOrder } from '@mikro-orm/core';
import { SeriesTagEntity } from '../series/entities/series-tag.entity';
import { PostTagEntity } from '../posts/entities/post-tag.entity';

@Injectable()
export class LoadersService {
  private readonly seriesAlias = 's';
  private readonly seriesTagAlias = 'st';
  private readonly postTagAlias = 'pt';

  constructor(
    private readonly em: EntityManager,
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
  private static getResults<T>(
    ids: number[],
    map: Map<number, T>,
    defaultValue: T | null = null,
  ): T[] {
    const results: T[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      results.push(map.get(id) ?? defaultValue);
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

    return LoadersService.getResults(ids, map, 0);
  }

  public getLoaders() {
    return {
      Series: {
        author: this.authorRelationLoader<ISeries>(),
        tags: this.seriesTagsLoader(),
        postsCount: this.seriesPostsCountLoader(),
        followersCount: this.seriesFollowersCountLoader(),
        followers: this.seriesFollowersLoader(),
        followed: this.seriesFollowedLoader(),
      },
      Post: {
        author: this.authorRelationLoader<IPost>(),
        tags: this.postTagsLoader(),
        likesCount: this.postLikesCountLoader(),
        likes: this.postLikesLoader(),
        commentsCount: this.postCommentsCountLoader(),
        comments: this.postCommentsLoader(),
        liked: this.postLikedLoader(),
      },
      Comment: {
        author: this.authorRelationLoader<IComment>(),
        likesCount: this.commentLikesCountLoader(),
        likes: this.commentLikesLoader(),
        repliesCount: this.commentRepliesCountLoader(),
        replies: this.commentRepliesLoader(),
        post: this.commentPostLoader(),
        liked: this.commentLikedLoader(),
      },
      Reply: {
        author: this.authorRelationLoader<IReply>(),
        likesCount: this.replyLikesCountLoader(),
        likes: this.replyLikesLoader(),
        mention: this.replyMentionLoader(),
        liked: this.replyLikedLoader(),
      },
      User: {
        likedPostsCount: this.userLikedPostsCountLoader(),
        likedPosts: this.userLikedPostsLoader(),
        followedSeriesCount: this.usersFollowedSeriesCountLoader(),
        followedSeries: this.usersFollowedSeriesLoader(),
        writtenSeries: this.usersWrittenSeriesLoader(),
        writtenPosts: this.usersWrittenPostsLoader(),
        writtenComments: this.usersWrittenCommentsLoader(),
      },
    };
  }

  //_________ SERIES LOADERS _________
  /**
   * Series Tags Loader
   *
   * Get tags relation.
   */
  private seriesTagsLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<TagEntity[][]> => {
      if (data.length === 0) return [];

      const series = LoadersService.getEntities(data);
      await this.em.populate(series, ['tags', 'tags.tag'], {
        orderBy: {
          tags: {
            tag: {
              name: QueryOrder.ASC,
            },
          },
        },
      });
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
  private seriesFollowersCountLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<number[]> => {
      return this.pivotCounter(
        data,
        SeriesEntity,
        SeriesFollowerEntity,
        'series',
        'user',
      );
    };
  }

  private seriesFollowersLoader() {
    return async (
      data: ILoader<SeriesEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        SeriesEntity,
        SeriesFollowerEntity,
        'followers',
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
  private seriesPostsCountLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<number[]> => {
      if (data.length === 0) return [];

      const ids = LoadersService.getEntityIds(data);
      const knex = this.em.getKnex();
      const seriesId = this.seriesAlias + '.id';
      const seriesRef = knex.ref(seriesId);

      const tagsQuery = this.em
        .createQueryBuilder(SeriesTagEntity, this.seriesTagAlias)
        .select(`${this.seriesTagAlias}.tag_id`)
        .where({
          series: seriesRef,
        })
        .getKnexQuery();
      const countQuery = this.em
        .createQueryBuilder(PostTagEntity, this.postTagAlias)
        .count(`${this.postTagAlias}.tag_id`, true)
        .where({
          tag: {
            $in: tagsQuery,
          },
        })
        .as('count');
      const raw: ICountResult[] = await this.em
        .createQueryBuilder(SeriesEntity, this.seriesAlias)
        .select([seriesId, countQuery])
        .where({
          id: {
            $in: ids,
          },
        })
        .execute();

      return LoadersService.getCounterResults(ids, raw);
    };
  }

  private seriesFollowedLoader() {
    return async (
      data: ILoader<SeriesEntity>[],
      ctx: IGqlCtx,
    ): Promise<(boolean | null)[]> => {
      if (data.length === 0) return [];

      const userId = contextToUser(ctx);

      if (!userId) return new Array(data.length).fill(null);

      const ids = LoadersService.getEntityIds(data);
      const caseString = `
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM series_followers 'sf'
              WHERE 'sf'.series_id = '${this.seriesAlias}'.id
              AND 'sf'.user_id = ${userId}
          )
          THEN 1
          ELSE 0
        END AS 'followed'
      `;
      const result: ISeriesFollowedResult[] = await this.em
        .createQueryBuilder(SeriesEntity, this.seriesAlias)
        .select([`${this.seriesAlias}.id`, caseString])
        .where({ id: { $in: ids } })
        .execute();
      const resultMap = new Map<number, boolean>();

      for (let i = 0; i < result.length; i++) {
        const { id, followed } = result[i];
        resultMap.set(id, followed === 1);
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
  private postTagsLoader() {
    return async (data: ILoader<PostEntity>[]): Promise<TagEntity[][]> => {
      if (data.length === 0) return [];

      const posts = LoadersService.getEntities(data);
      await this.em.populate(posts, ['tags', 'tags.tag']);
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
  private postLikesCountLoader() {
    return async (data: ILoader<PostEntity>[]): Promise<number[]> => {
      return this.pivotCounter(
        data,
        PostEntity,
        PostLikeEntity,
        'post',
        'user',
      );
    };
  }

  /**
   * Post Likes Loader
   *
   * Get paginated users of likes relation.
   */
  private postLikesLoader() {
    return async (
      data: ILoader<PostEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        PostEntity,
        PostLikeEntity,
        'likes',
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
  private postCommentsCountLoader() {
    return async (data: ILoader<PostEntity>[]) => {
      return this.basicCounter(data, PostEntity, CommentEntity, 'post');
    };
  }

  /**
   * Post Comments Loader
   *
   * Get paginated comments of post.
   */
  private postCommentsLoader() {
    return async (
      data: ILoader<PostEntity, FilterRelationDto>[],
    ): Promise<IPaginated<CommentEntity>[]> => {
      return this.basicPaginator(
        data,
        PostEntity,
        CommentEntity,
        'comments',
        'post',
        'id',
      );
    };
  }

  private postLikedLoader() {
    return async (
      data: ILoader<PostEntity>[],
      ctx: IGqlCtx,
    ): Promise<(boolean | null)[]> => {
      return this.getLikedResults(
        data,
        ctx,
        PostEntity,
        'post_likes',
        'post_id',
      );
    };
  }

  //_________ COMMENTS LOADERS __________

  private commentLikesCountLoader() {
    return async (data: ILoader<CommentEntity>[]) => {
      return this.pivotCounter(
        data,
        CommentEntity,
        CommentLikeEntity,
        'comment',
        'user',
      );
    };
  }

  private commentLikesLoader() {
    return async (
      data: ILoader<CommentEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        CommentEntity,
        CommentLikeEntity,
        'likes',
        'comment',
        'user',
        'username',
      );
    };
  }

  private commentRepliesCountLoader() {
    return async (data: ILoader<CommentEntity>[]): Promise<number[]> => {
      return this.basicCounter(data, CommentEntity, ReplyEntity, 'comment');
    };
  }

  private commentRepliesLoader() {
    return async (data: ILoader<CommentEntity, FilterRelationDto>[]) => {
      // comments replies loader
      return this.basicPaginator(
        data,
        CommentEntity,
        ReplyEntity,
        'replies',
        'comment',
        'id',
      );
    };
  }

  private commentPostLoader() {
    return async (data: ILoader<CommentEntity>[]): Promise<PostEntity[]> => {
      if (data.length === 0) return [];

      const ids = LoadersService.getRelationIds(data, 'post');
      const posts = await this.em.find(PostEntity, { id: { $in: ids } });
      const map = LoadersService.getEntityMap(posts);
      return LoadersService.getResults(ids, map);
    };
  }

  private commentLikedLoader() {
    return async (
      data: ILoader<CommentEntity>[],
      ctx: IGqlCtx,
    ): Promise<(boolean | null)[]> => {
      return this.getLikedResults(
        data,
        ctx,
        CommentEntity,
        'comment_likes',
        'comment_id',
      );
    };
  }

  //_________ REPLIES LOADERS __________

  private replyLikesCountLoader() {
    return async (data: ILoader<ReplyEntity>[]) => {
      return this.pivotCounter(
        data,
        ReplyEntity,
        ReplyLikeEntity,
        'reply',
        'user',
      );
    };
  }

  private replyLikesLoader() {
    return async (
      data: ILoader<ReplyEntity, FilterRelationDto>[],
    ): Promise<IPaginated<UserEntity>[]> => {
      return this.pivotPaginator(
        data,
        ReplyEntity,
        ReplyLikeEntity,
        'likes',
        'reply',
        'user',
        'username',
      );
    };
  }

  private replyLikedLoader() {
    return async (
      data: ILoader<ReplyEntity>[],
      ctx: IGqlCtx,
    ): Promise<(boolean | null)[]> => {
      return this.getLikedResults(
        data,
        ctx,
        ReplyEntity,
        'reply_likes',
        'reply_id',
      );
    };
  }

  // USERS LOADERS

  private replyMentionLoader() {
    return async (data: ILoader<ReplyEntity>[]) => {
      if (data.length === 0) return [];

      const replies = LoadersService.getEntities(data);
      await this.em.populate(replies, ['mention']);
      const results: (UserEntity | null)[] = [];

      for (let i = 0; i < replies.length; i++) {
        results.push(replies[i]?.mention ?? null);
      }

      return results;
    };
  }

  private userLikedPostsCountLoader() {
    return async (data: ILoader<UserEntity>[]) => {
      return this.pivotCounter(
        data,
        UserEntity,
        PostLikeEntity,
        'user',
        'post',
      );
    };
  }

  private userLikedPostsLoader() {
    return async (
      data: ILoader<UserEntity, FilterRelationDto>[],
    ): Promise<IPaginated<PostEntity>[]> => {
      return this.pivotPaginator(
        data,
        UserEntity,
        PostLikeEntity,
        'likedPosts',
        'user',
        'post',
        'id',
      );
    };
  }

  private usersFollowedSeriesCountLoader() {
    return async (data: ILoader<UserEntity>[]) => {
      return this.pivotCounter(
        data,
        UserEntity,
        SeriesFollowerEntity,
        'user',
        'series',
      );
    };
  }

  private usersWrittenPostsLoader() {
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.basicPaginator(
        data,
        UserEntity,
        PostEntity,
        'writtenPosts',
        'author',
        'id',
      );
    };
  }

  private usersWrittenSeriesLoader() {
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.basicPaginator(
        data,
        UserEntity,
        SeriesEntity,
        'writtenSeries',
        'author',
        'id',
      );
    };
  }

  private usersWrittenCommentsLoader() {
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.basicPaginator(
        data,
        UserEntity,
        CommentEntity,
        'writtenComments',
        'author',
        'id',
      );
    };
  }

  //_________ GENERIC LOADERS __________

  private usersFollowedSeriesLoader() {
    return async (
      data: ILoader<UserEntity, FilterRelationDto>[],
    ): Promise<IPaginated<SeriesEntity>[]> => {
      return this.pivotPaginator(
        data,
        UserEntity,
        SeriesFollowerEntity,
        'followedSeries',
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
  private authorRelationLoader<T extends IAuthored>() {
    return async (data: ILoader<T>[]): Promise<UserEntity[]> => {
      if (data.length === 0) return [];

      const ids = LoadersService.getRelationIds(data, 'author');
      const users = await this.em.find(UserEntity, {
        id: {
          $in: ids,
        },
      });
      const map = LoadersService.getEntityMap(users);
      return LoadersService.getResults(ids, map);
    };
  }

  /**
   * Basic Counter
   *
   * Loads the count of one-to-many relationships.
   */
  private async basicCounter<T extends IBase, C extends IBase>(
    data: ILoader<T>[],
    parent: Type<T>,
    child: Type<C>,
    childRelation: keyof C,
  ): Promise<number[]> {
    if (data.length === 0) return [];

    const parentId = 'p.id';
    const knex = this.em.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = this.em
      .createQueryBuilder(child, 'c')
      .count('c.id')
      .where({ [childRelation]: { $in: parentRef } })
      .as('count');
    const raw: ICountResult[] = await this.em
      .createQueryBuilder(parent, 'p')
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
  private async pivotCounter<T extends IBase, P extends ICreation>(
    data: ILoader<T>[],
    parent: Type<T>,
    pivot: Type<P>,
    pivotParent: keyof P,
    pivotChild: keyof P,
  ): Promise<number[]> {
    if (data.length === 0) return [];

    const strPivotChild = String(pivotChild);
    const parentId = 'p.id';
    const knex = this.em.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = this.em
      .createQueryBuilder(pivot, 'pt')
      .count(`pt.${strPivotChild}_id`, true)
      .where({ [pivotParent]: { $in: parentRef } })
      .as('count');
    const raw: ICountResult[] = await this.em
      .createQueryBuilder(parent, 'p')
      .select([parentId, countQuery])
      .where({ id: { $in: ids } })
      .groupBy(parentId)
      .execute();

    return LoadersService.getCounterResults(ids, raw);
  }

  /**
   * Basic Paginator
   *
   * Loads paginated one-to-many relationships
   */
  private async basicPaginator<T extends IBase, C extends IBase>(
    data: ILoader<T, FilterRelationDto>[],
    parent: Type<T>,
    child: Type<C>,
    parentRelation: keyof T,
    childRelation: keyof C,
    cursor: keyof C,
  ): Promise<IPaginated<C>[]> {
    if (data.length === 0) return [];

    const { first, order } = data[0].params;
    const parentId = 'p.id';
    const childAlias = 'c';
    const childId = 'c.id';
    const knex = this.em.getKnex();
    const parentRef = knex.ref(parentId);
    const parentRel = String(parentRelation);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = this.em
      .createQueryBuilder(child, childAlias)
      .count(childId)
      .where({
        [childRelation]: parentRef,
      })
      .as('count');
    const entitiesQuery = this.em
      .createQueryBuilder(child, childAlias)
      .select(`${childAlias}.id`)
      .where({
        [childRelation]: {
          id: parentRef,
        },
      })
      .orderBy({ [cursor]: order })
      .limit(first)
      .getKnexQuery();
    const results = await this.em
      .createQueryBuilder(parent, 'p')
      .select([parentId, countQuery])
      .leftJoinAndSelect(`p.${parentRel}`, childAlias)
      .groupBy([parentId, childId])
      .where({
        id: { $in: ids },
        [parentRelation]: { $in: entitiesQuery },
      })
      .orderBy({ [parentRelation]: { [cursor]: order } })
      .getResult();
    const map = new Map<number, IPaginated<C>>();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      map.set(
        result.id,
        this.commonService.paginate(
          result[parentRelation].getItems(),
          result.count,
          0,
          cursor,
          first,
        ),
      );
    }

    return LoadersService.getResults(
      ids,
      map,
      this.commonService.paginate([], 0, 0, cursor, first),
    );
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
    parent: Type<T>,
    pivot: Type<P>,
    pivotName: keyof T,
    pivotParent: keyof P,
    pivotChild: keyof P,
    cursor: keyof C,
  ): Promise<IPaginated<C>[]> {
    if (data.length === 0) return [];

    // Because of runtime
    const strPivotName = String(pivotName);
    const strPivotChild = String(pivotChild);
    const strPivotParent = String(pivotParent);

    const { first, order } = data[0].params;
    const parentId = 'p.id';
    const knex = this.em.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = this.em
      .createQueryBuilder(pivot, 'pt')
      .count(`pt.${strPivotChild}_id`, true)
      .where({ [strPivotParent]: parentRef })
      .as('count');
    const pivotQuery = this.em
      .createQueryBuilder(pivot, 'pt')
      .select('pc.id')
      .leftJoin(`pt.${strPivotChild}`, 'pc')
      .where({ [strPivotParent]: parentRef })
      .orderBy({
        [strPivotChild]: { [cursor]: order },
      })
      .limit(first)
      .getKnexQuery();
    const results = await this.em
      .createQueryBuilder(parent, 'p')
      .select([parentId, countQuery])
      .leftJoinAndSelect(`p.${strPivotName}`, 'e')
      .leftJoinAndSelect(`e.${strPivotChild}`, 'f')
      .where({
        id: { $in: ids },
        [strPivotName]: {
          [strPivotChild]: { $in: pivotQuery },
        },
      })
      .orderBy({
        [strPivotName]: {
          [strPivotChild]: { [cursor]: order },
        },
      })
      .groupBy([`e.${strPivotParent}_id`, 'f.id'])
      .getResult();
    const map = new Map<number, IPaginated<C>>();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pivots: P[] = result[strPivotName];
      const entities: C[] = [];

      for (const pivot of pivots) {
        entities.push(pivot[strPivotChild]);
      }

      map.set(
        result.id,
        this.commonService.paginate(entities, result.count, 0, cursor, first),
      );
    }

    return LoadersService.getResults(
      ids,
      map,
      this.commonService.paginate([], 0, 0, cursor, first),
    );
  }

  private async getLikedResults<T extends IBase>(
    data: ILoader<T>[],
    ctx: IGqlCtx,
    parent: Type<T>,
    pivotTable: string,
    tableColumn: string,
  ): Promise<(boolean | null)[]> {
    if (data.length === 0) return [];

    const userId = contextToUser(ctx);

    if (!userId) return new Array(data.length).fill(null);

    const ids = LoadersService.getEntityIds(data);
    const caseString = `
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM ${pivotTable} 'pt'
              WHERE 'pt'.${tableColumn} = 'p'.id
              AND pt.user_id = ${userId}
          )
          THEN 1
          ELSE 0
        END AS 'liked'
      `;
    const raw: ILikedResult[] = await this.em
      .createQueryBuilder(parent, 'p')
      .select(['p.id', caseString])
      .where({ id: { $in: ids } })
      .execute();
    const map = new Map<number, boolean>();

    for (let i = 0; i < raw.length; i++) {
      const { id, liked } = raw[i];
      map.set(id, liked === 1);
    }

    return LoadersService.getResults(ids, map);
  }
}
