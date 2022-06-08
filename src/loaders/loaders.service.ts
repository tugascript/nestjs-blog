import { Injectable, Type } from '@nestjs/common';
import { UserEntity } from '../users/entities/user.entity';
import { EntityManager } from '@mikro-orm/postgresql';
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
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { ICountResult } from './interfaces/count-result.interface';
import { ReplyEntity } from '../comments/entities/reply.entity';
import { IPageResult } from './interfaces/page-result.interface';
import { ICreation } from '../common/interfaces/creation.interface';
import { IAuthored } from '../common/interfaces/authored.interface';
import { PostLikeEntity } from '../posts/entities/post-like.entity';
import { SeriesFollowerEntity } from '../series/entities/series-follower.entity';
import { ReplyLikeEntity } from '../comments/entities/reply-like.entity';
import { CommentLikeEntity } from '../comments/entities/comment-like.entity';
import { SeriesTagEntity } from '../series/entities/series-tag.entity';
import { PostTagEntity } from '../posts/entities/post-tag.entity';
import { ISeries } from '../series/interfaces/series.interface';
import { IPost } from '../posts/interfaces/post.interface';
import { IComment } from '../comments/interfaces/comments.interface';
import { IReply } from '../comments/interfaces/reply.interface';

@Injectable()
export class LoadersService {
  private readonly seriesAlias = 's';
  private readonly seriesTagAlias = 'st';
  private readonly postAlias = 'p';
  private readonly postTagAlias = 'pt';
  private readonly tagAlias = 't';

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

  public getLoaders() {
    return {
      Series: {
        author: this.authorRelationLoader<ISeries>(),
        tags: this.seriesTagsLoader(),
        posts: this.seriesPostsLoader(),
        followersCount: this.seriesFollowersCountLoader(),
        followers: this.seriesFollowersLoader(),
      },
      Post: {
        author: this.authorRelationLoader<IPost>(),
        tags: this.postTagsLoader(),
        likesCount: this.postLikesCountLoader(),
        likes: this.postLikesLoader(),
        commentsCount: this.postCommentsCountLoader(),
        comments: this.postCommentsLoader(),
      },
      Comment: {
        author: this.authorRelationLoader<IComment>(),
        likesCount: this.commentLikesCountLoader(),
        likes: this.commentLikesLoader(),
        repliesCount: this.commentRepliesCountLoader(),
        replies: this.commentRepliesLoader(),
        post: this.commentPostLoader(),
      },
      Reply: {
        author: this.authorRelationLoader<IReply>(),
        likesCount: this.replyLikesCountLoader(),
        likes: this.replyLikesLoader(),
        mention: this.replyMentionLoader(),
      },
      User: {
        likedPostsCount: this.userLikedPostsCountLoader(),
        likedPosts: this.userLikedPostsLoader(),
        followedSeriesCount: this.usersFollowedSeriesCountLoader(),
        followedSeries: this.usersFollowedSeriesLoader(),
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
      await this.em.populate(series, ['tags', 'tags.tag']);
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
        UserEntity,
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
  private seriesPostsLoader() {
    return async (
      data: ILoader<SeriesEntity, FilterPostsRelationDto>[],
    ): Promise<IPaginated<PostEntity>[]> => {
      if (data.length === 0) return [];

      const { cursor, order, first } = data[0].params;
      const ids = LoadersService.getEntityIds(data);
      const knex = this.em.getKnex();
      const seriesId = this.seriesAlias + '.id';
      const seriesRef = knex.ref(seriesId);
      const seriesTagsQuery = this.em
        .createQueryBuilder(SeriesTagEntity, this.seriesTagAlias)
        .select([`${this.seriesTagAlias}.tag_id`])
        .where({ series: seriesRef })
        .getKnexQuery();
      const postsCountQuery = await this.em
        .createQueryBuilder(PostTagEntity, this.postTagAlias)
        .count(`${this.postTagAlias}.post_id`)
        .where({
          tag: {
            $in: seriesTagsQuery,
          },
        })
        .as('posts_count');
      const strCursor = getQueryCursor(cursor);
      const postsQuery = this.em
        .createQueryBuilder(PostEntity, this.postAlias)
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
      const raw: ISeriesPostsResult[] = await this.em
        .createQueryBuilder(SeriesEntity, this.seriesAlias)
        .select([seriesId, postsCountQuery, postsQuery])
        .where({ id: { $in: ids } })
        .groupBy([seriesId, `${this.postAlias}.id`])
        .execute();
      const resultMap = new Map<number, IPaginated<PostEntity>>();

      for (let i = 0; i < raw.length; i++) {
        const { posts, posts_count, id } = raw[i];
        const entities: PostEntity[] = [];

        for (let j = 0; j < posts.length; j++) {
          entities.push(this.em.map(PostEntity, posts[j]));
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
        UserEntity,
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
      return this.basicPaginator(data, PostEntity, CommentEntity, 'post', 'id');
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
        UserEntity,
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

  //_________ COMMENTS LOADERS __________

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
    return async (data: ILoader<ReplyEntity, FilterRelationDto>[]) => {
      return this.pivotPaginator(
        data,
        ReplyEntity,
        ReplyLikeEntity,
        UserEntity,
        'reply',
        'user',
        'username',
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
        results.push(replies[i].mention ?? null);
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
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.pivotPaginator(
        data,
        UserEntity,
        PostLikeEntity,
        PostEntity,
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

  //_________ GENERIC LOADERS __________

  private usersFollowedSeriesLoader() {
    return async (data: ILoader<UserEntity, FilterRelationDto>[]) => {
      return this.pivotPaginator(
        data,
        UserEntity,
        SeriesFollowerEntity,
        SeriesEntity,
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
      .count(`pt.${strPivotChild}_id`)
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
    const ids = LoadersService.getEntityIds(data);

    const countQuery = this.em
      .createQueryBuilder(child, childAlias)
      .count(childId)
      .where({ [childRelation]: { $in: parentRef } })
      .as('count');
    const entitiesQuery = this.em
      .createQueryBuilder(child, childAlias)
      .where({ [childRelation]: { $in: parentRef } })
      .orderBy({ [cursor]: order })
      .limit(first)
      .as('entities');
    const raw: IPageResult<C>[] = await this.em
      .createQueryBuilder(parent, 'p')
      .select([parentId, countQuery, entitiesQuery])
      .where({ id: { $in: ids } })
      .groupBy([parentId, childId])
      .execute();

    return this.getPaginationResults<C>(first, child, cursor, ids, raw);
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
    child: Type<C>,
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
    const knex = this.em.getKnex();
    const parentRef = knex.ref(parentId);
    const ids = LoadersService.getEntityIds(data);

    const countQuery = this.em
      .createQueryBuilder(pivot, 'pt')
      .count(`pt.${strPivotChild}_id`)
      .where({ [strPivotParent]: { $in: parentRef } })
      .as('count');
    const pivotQuery = this.em
      .createQueryBuilder(pivot, 'pt')
      .select(`pt.${strPivotChild}_id`)
      .where({ [strPivotParent]: { $in: parentRef } })
      .getKnexQuery();
    const entitiesQuery = this.em
      .createQueryBuilder(child, 'c')
      .select('c.*')
      .where({ id: { $in: pivotQuery } })
      .orderBy({ [cursor]: order })
      .limit(first)
      .as('entities');
    const raw: IPageResult<C>[] = await this.em
      .createQueryBuilder(parent, 'p')
      .select([parentId, countQuery, entitiesQuery])
      .where({ id: { $in: ids } })
      .groupBy([parentId, 'c.id'])
      .execute();

    return this.getPaginationResults<C>(first, child, cursor, ids, raw);
  }

  private getPaginationResults<T extends IBase>(
    first: number,
    child: Type<T>,
    cursor: keyof T,
    ids: number[],
    raw: IPageResult<T>[],
  ): IPaginated<T>[] {
    const map = new Map<number, IPaginated<T>>();

    for (let i = 0; i < raw.length; i++) {
      const { id, count, entities } = raw[i];
      const entitiesArr: T[] = [];

      for (let j = 0; j < entities.length; j++) {
        entitiesArr.push(this.em.map(child, entities[j]));
      }

      map.set(
        id,
        this.commonService.paginate(entitiesArr, count, 0, cursor, first),
      );
    }

    return LoadersService.getResults(ids, map);
  }
}
