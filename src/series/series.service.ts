import { Injectable } from '@nestjs/common';
import { CreateSeriesInput } from './inputs/create-series.input';
import { UpdateSeriesInput } from './inputs/update-series.input';
import { InjectRepository } from '@mikro-orm/nestjs';
import { SeriesEntity } from './entities/series.entity';
import { EntityRepository } from '@mikro-orm/postgresql';
import { CommonService } from '../common/common.service';
import { UploaderService } from '../uploader/uploader.service';
import { TagsService } from '../tags/tags.service';
import { RatioEnum } from '../common/enums/ratio.enum';
import { UpdateSeriesPictureInput } from './inputs/update-series-picture.input';
import { SeriesTagInput } from './inputs/series-tag.input';
import { SearchDto } from '../common/dtos/search.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';
import {
  getQueryCursor,
  QueryCursorEnum,
} from '../common/enums/query-cursor.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { SeriesFollowerEntity } from './entities/series-follower.entity';
import { FilterDto } from '../common/dtos/filter.dto';
import { SeriesTagEntity } from './entities/series-tag.entity';
import { TagEntity } from '../tags/entities/tag.entity';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { FilterSeriesLikesDto } from './dtos/filter-series-likes.dto';

@Injectable()
export class SeriesService {
  private readonly seriesAlias = 's';
  private readonly seriesLikeAlias = 'sl';

  constructor(
    @InjectRepository(SeriesEntity)
    private readonly seriesRepository: EntityRepository<SeriesEntity>,
    @InjectRepository(SeriesFollowerEntity)
    private readonly seriesFollowersRepository: EntityRepository<SeriesFollowerEntity>,
    @InjectRepository(SeriesTagEntity)
    private readonly seriesTagsRepository: EntityRepository<SeriesTagEntity>,
    private readonly tagsService: TagsService,
    private readonly commonService: CommonService,
    private readonly uploaderService: UploaderService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create Series
   *
   * Create CRUD action for Series.
   */
  public async createSeries(
    userId: number,
    { title, picture, tagIds }: CreateSeriesInput,
  ) {
    title = this.commonService.formatTitle(title);
    const series = await this.seriesRepository.create({
      title,
      slug: this.commonService.generateSlug(title),
      author: userId,
    });
    series.picture = await this.uploaderService.uploadImage(
      userId,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.seriesRepository, series, true);
    const tags = await this.tagsService.findTagsByIds(userId, tagIds);
    const seriesTags: SeriesTagEntity[] = [];

    for (let i = 0; i < tags.length; i++) {
      seriesTags.push(
        this.seriesTagsRepository.create({
          series,
          tag: tags[i],
        }),
      );
    }

    await this.commonService.throwDuplicateError(
      this.seriesTagsRepository.persistAndFlush(seriesTags),
    );
    return series;
  }

  /**
   * Update Series
   *
   * Update CRUD action for Series.
   */
  public async updateSeries(
    userId: number,
    { seriesId, title }: UpdateSeriesInput,
  ): Promise<SeriesEntity> {
    const series = await this.authorsSeriesById(userId, seriesId);
    title = this.commonService.formatTitle(title);
    series.title = title;
    series.slug = this.commonService.generateSlug(title);
    await this.commonService.saveEntity(this.seriesRepository, series);
    return series;
  }

  /**
   * Update Series Picture
   *
   * Update CRUD action for Series.
   * Updates the picture so there is no extra picture in the bucket.
   */
  public async updateSeriesPicture(
    userId: number,
    { seriesId, picture }: UpdateSeriesPictureInput,
  ): Promise<SeriesEntity> {
    const series = await this.authorsSeriesById(userId, seriesId);
    const toDelete = series.picture;
    series.picture = await this.uploaderService.uploadImage(
      userId,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.seriesRepository, series);
    this.uploaderService.deleteFile(toDelete);
    return series;
  }

  /**
   * Add Tag To Series
   *
   * Update CRUD action for Series.
   * Adds a new tag to a given series.
   */
  public async addTagToSeries(
    userId: number,
    { seriesId, tagId }: SeriesTagInput,
  ): Promise<SeriesEntity> {
    const series = await this.authorsSeriesById(userId, seriesId);
    const tag = await this.tagsService.tagById(userId, tagId);
    const seriesTag = await this.seriesTagsRepository.create({
      series,
      tag,
    });
    await this.commonService.saveEntity(
      this.seriesTagsRepository,
      seriesTag,
      true,
    );
    return series;
  }

  /**
   * Remove Tag From Series
   *
   * Update CRUD action for Series.
   * Removes a tag from a given series.
   */
  public async removeTagFromSeries(
    userId: number,
    { seriesId, tagId }: SeriesTagInput,
  ): Promise<SeriesEntity> {
    const series = await this.authorsSeriesById(userId, seriesId);
    const seriesTag = await this.seriesTagByPKs(seriesId, tagId);
    await this.commonService.removeEntity(this.seriesTagsRepository, seriesTag);
    return series;
  }

  /**
   * Follow Series
   *
   * Creates a follower for a given series by ID.
   */
  public async followSeries(
    userId: number,
    seriesId: number,
  ): Promise<SeriesEntity> {
    const series = await this.seriesById(seriesId);
    const follower = await this.seriesFollowerByPKs(userId, seriesId);
    await this.commonService.saveEntity(
      this.seriesFollowersRepository,
      follower,
      true,
    );
    return series;
  }

  /**
   * Unfollow Series
   *
   * Deletes a follower for a given series by ID.
   */
  public async unfollowSeries(
    userId: number,
    seriesId: number,
  ): Promise<SeriesEntity> {
    const series = await this.seriesById(seriesId);
    const follower = await this.seriesFollowerByPKs(userId, seriesId);
    await this.commonService.removeEntity(
      this.seriesFollowersRepository,
      follower,
    );
    return series;
  }

  /**
   * Delete Series
   *
   * Delete CRUD action for Series.
   */
  public async deleteSeries(
    userId: number,
    seriesId: number,
  ): Promise<LocalMessageType> {
    const series = await this.authorsSeriesById(userId, seriesId);
    await this.commonService.removeEntity(this.seriesRepository, series);
    this.uploaderService.deleteFile(series.picture);
    return new LocalMessageType('Series deleted successfully');
  }

  /**
   * Series By ID
   *
   * Single Read CRUD action for Series.
   */
  public async seriesById(seriesId: number): Promise<SeriesEntity> {
    const series = await this.seriesRepository.findOne({ id: seriesId });
    this.commonService.checkExistence('Series', series);
    return series;
  }

  /**
   * Series By Slug
   *
   * Single Read CRUD action for Series.
   */
  public async seriesBySlug(slug: string): Promise<SeriesEntity> {
    const series = await this.seriesRepository.findOne({ slug });
    this.commonService.checkExistence('Series', series);
    return series;
  }

  /**
   * Filter Series
   *
   * Multi Read CRUD action for Series.
   */
  public async filterSeries({
    cursor,
    search,
    order,
    first,
    after,
  }: SearchDto): Promise<IPaginated<SeriesEntity>> {
    const qb = this.seriesRepository.createQueryBuilder(this.seriesAlias);

    if (search) {
      qb.where({
        title: {
          $ilike: this.commonService.formatSearch(search),
        },
      });
    }

    return this.commonService.queryBuilderPagination(
      this.seriesAlias,
      getQueryCursor(cursor),
      first,
      order,
      qb,
      after,
      cursor === QueryCursorEnum.DATE,
    );
  }

  /**
   * Filter Followed Series
   *
   * Multi Read CRUD action for Series.
   * Filters paginated Series by the ones followed by a given user.
   */
  public async filterFollowedSeries(
    userId: number,
    { cursor, order, first, after }: FilterDto,
  ): Promise<IPaginated<SeriesEntity>> {
    const following = await this.seriesFollowersRepository.find({
      user: userId,
    });

    if (following.length === 0) {
      return {
        currentCount: 0,
        previousCount: 0,
        edges: [],
        pageInfo: {
          endCursor: '',
          startCursor: '',
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    }

    const ids: number[] = [];

    for (let i = 0; i < following.length; i++) {
      ids.push(following[i].series.id);
    }

    const qb = this.seriesRepository
      .createQueryBuilder(this.seriesAlias)
      .where({
        id: {
          $in: ids,
        },
      });
    return this.commonService.queryBuilderPagination(
      this.seriesAlias,
      getQueryCursor(cursor),
      first,
      order,
      qb,
      after,
      cursor === QueryCursorEnum.DATE,
    );
  }

  /**
   * Series Tags
   *
   * Gets the tags of a series by ID.
   */
  public async seriesTags(seriesId: number): Promise<TagEntity[]> {
    const series = await this.seriesWithTags(seriesId);
    const ids: number[] = [];

    for (const tag of series.tags) {
      ids.push(tag.tag.id);
    }

    return await this.tagsService.findTagsByIds(series.author.id, ids);
  }

  public async seriesLikes({
    seriesId,
    first,
    after,
    order,
  }: FilterSeriesLikesDto): Promise<IPaginated<UserEntity>> {
    const likesQuery = this.seriesFollowersRepository
      .createQueryBuilder(this.seriesLikeAlias)
      .select(`${this.seriesLikeAlias}.user_id`)
      .where({
        series: seriesId,
      })
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

  /**
   * Series With Tags
   *
   * Fetch series by ID with a left join for tags.
   */
  public async seriesWithTags(seriesId: number): Promise<SeriesEntity> {
    const series = await this.seriesRepository.findOne(
      { id: seriesId },
      { populate: ['tags'] },
    );
    this.commonService.checkExistence('Series', series);
    return series;
  }

  /**
   * Author's Series By ID
   *
   * Single Read CRUD action for Series.
   * Finds a single series by ID of the current user.
   */
  private async authorsSeriesById(
    userId: number,
    seriesId: number,
  ): Promise<SeriesEntity> {
    const series = await this.seriesRepository.findOne({
      id: seriesId,
      author: userId,
    });
    this.commonService.checkExistence('Series', series);
    return series;
  }

  /**
   * Series' Follower by PKs
   *
   * Finds a single series follower by user and series IDs.
   */
  private async seriesFollowerByPKs(
    userId: number,
    seriesId: number,
  ): Promise<SeriesFollowerEntity> {
    const follower = await this.seriesFollowersRepository.findOne({
      user: userId,
      series: seriesId,
    });
    this.commonService.checkExistence("Series' Follower", follower);
    return follower;
  }

  /**
   * Series' Follower by PKs
   *
   * Finds a single series follower by user and series IDs.
   */
  private async seriesTagByPKs(
    seriesId: number,
    tagId: number,
  ): Promise<SeriesTagEntity> {
    const tag = await this.seriesTagsRepository.findOne({
      series: seriesId,
      tag: tagId,
    });
    this.commonService.checkExistence("Series' Tag", tag);
    return tag;
  }
}
