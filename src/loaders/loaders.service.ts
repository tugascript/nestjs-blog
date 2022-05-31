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

@Injectable()
export class LoadersService {
  private readonly seriesAlias = 's';
  private readonly postsAlias = 'p';
  private readonly tagAlias = 't';

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: EntityRepository<UserEntity>,
    @InjectRepository(SeriesEntity)
    private readonly seriesRepository: EntityRepository<SeriesEntity>,
    @InjectRepository(SeriesFollowerEntity)
    private readonly seriesFollowerRepository: EntityRepository<SeriesFollowerEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepository: EntityRepository<PostEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentsRepository: EntityRepository<CommentEntity>,
    private readonly commonService: CommonService,
  ) {}

  //_________ SERIES LOADERS _________

  /**
   * Series Author Loader
   *
   * Get author relation.
   */
  public seriesAuthorLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<UserEntity[]> => {
      const ids = this.getRelationIds(data, 'author');
      const users = await this.usersRepository.find({
        id: {
          $in: ids,
        },
      });
      const map = this.getEntityMap(users);
      return this.getResults(ids, map);
    };
  }

  /**
   * Series Tags Loader
   *
   * Get tags relation.
   */
  public seriesTagsLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<TagEntity[][]> => {
      if (data.length === 0) return [];

      const series = this.getEntities(data);
      await this.seriesRepository.populate(series, ['tags']);
      const tags: TagEntity[][] = [];

      for (let i = 0; i < series.length; i++) {
        tags.push(series[i].tags.getItems());
      }

      return tags;
    };
  }

  public seriesFollowerCountLoader() {
    return async (data: ILoader<SeriesEntity>[]): Promise<number[]> => {
      // @todo: implement this relation
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
      const ids = this.getEntityIds(data);
      const seriesId = this.seriesAlias + '.id';
      const postId = this.postsAlias + '.id';
      const postTags = this.postsAlias + '.tags';
      const knex = this.seriesRepository.getKnex();
      const seriesRef = knex.ref(seriesId);
      const tagsQuery = this.seriesRepository
        .createQueryBuilder(this.seriesAlias)
        .select([`${this.seriesAlias}.tags.id`])
        .leftJoin(`${this.seriesAlias}.tags`, this.tagAlias)
        .where({ id: seriesRef })
        .getKnexQuery();
      const postsCountQuery = await this.postRepository
        .createQueryBuilder(this.postsAlias)
        .count(postId)
        .leftJoin(postTags, this.tagAlias)
        .where({
          tags: {
            id: {
              $in: tagsQuery,
            },
          },
        })
        .as('posts_count');
      const strCursor = getQueryCursor(cursor);
      const postsQuery = this.postRepository
        .createQueryBuilder(this.postsAlias)
        .leftJoin(postTags, this.tagAlias)
        .select(`${this.postsAlias}.*`)
        .where({
          tags: {
            id: {
              $in: tagsQuery,
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
        .execute();
      const resultMap = new Map<number, IPaginated<PostEntity>>();

      for (let i = 0; i < raw.length; i++) {
        const { posts, posts_count, id } = raw[i];
        const entities: PostEntity[] = [];

        for (let j = 0; j < posts.length; j++) {
          entities.push(this.postRepository.map(posts[j]));
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

      return this.getResults(ids, resultMap);
    };
  }

  private getEntities<T extends IBase, P = undefined>(
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
  private getEntityIds<T extends IBase, P = undefined>(
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
  private getRelationIds<T extends IBase>(
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
  private getEntityMap<T extends IBase>(entities: T[]): Map<number, T> {
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
  private getResults<T>(ids: number[], map: Map<number, T>): T[] {
    const results: T[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      results.push(map.get(id));
    }

    return results;
  }
}
