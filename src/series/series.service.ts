import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileUpload } from 'graphql-upload';
import { Knex } from 'knex';
import { PubSub } from 'mercurius';
import { CommonService } from '../common/common.service';
import { ExtendedSearchDto } from '../common/dtos/extended-search.dto';
import { FilterDto } from '../common/dtos/filter.dto';
import {
  getQueryCursor,
  QueryCursorEnum,
} from '../common/enums/query-cursor.enum';
import { RatioEnum } from '../common/enums/ratio.enum';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { NotificationTypeEnum } from '../notifications/enums/notification-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { TagEntity } from '../tags/entities/tag.entity';
import { TagsService } from '../tags/tags.service';
import { UploaderService } from '../uploader/uploader.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { FilterSeriesFollowersDto } from './dtos/filter-series-followers.dto';
import { SeriesFollowerEntity } from './entities/series-follower.entity';
import { SeriesTagEntity } from './entities/series-tag.entity';
import { SeriesEntity } from './entities/series.entity';
import { CreateSeriesInput } from './inputs/create-series.input';
import { SeriesTagInput } from './inputs/series-tag.input';
import { UpdateSeriesPictureInput } from './inputs/update-series-picture.input';
import { UpdateSeriesInput } from './inputs/update-series.input';

@Injectable()
export class SeriesService {
  private readonly seriesAlias = 's';
  private readonly seriesFollowersAlias = 'sf';
  private readonly seriesTagsAlias = 'st';

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
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create Series
   *
   * Create CRUD action for Series.
   */
  public async createSeries(
    userId: number,
    { title, picture, tagIds, description }: CreateSeriesInput,
  ) {
    title = this.commonService.formatTitle(title);
    const count = await this.seriesRepository.count({ title, author: userId });

    if (count > 0)
      throw new BadRequestException('Series with this title already exists.');

    const series = await this.seriesRepository.create({
      title,
      description,
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
    { seriesId, title, description }: UpdateSeriesInput,
  ): Promise<SeriesEntity> {
    const series = await this.authorsSeriesById(userId, seriesId);
    await this.updateSeriesLogic(series, title, description);
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
    await this.updateSeriesPictureLogic(series, picture);
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
    const count = await this.seriesTagsRepository.count({
      series: seriesId,
      tag: tagId,
    });

    if (count > 0)
      throw new BadRequestException('Tag already added to series.');

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
    pubsub: PubSub,
    userId: number,
    seriesId: number,
  ): Promise<SeriesEntity> {
    const series = await this.seriesById(seriesId);
    const count = await this.seriesFollowersRepository.count({
      series: seriesId,
      user: userId,
    });

    if (count > 0)
      throw new BadRequestException("You're already following this series");

    const follower = await this.seriesFollowersRepository.create({
      series: seriesId,
      user: userId,
    });
    await this.commonService.saveEntity(
      this.seriesFollowersRepository,
      follower,
      true,
    );
    await this.notificationsService.createNotification(
      pubsub,
      NotificationTypeEnum.FOLLOW,
      userId,
      series.author.id,
      series,
    );
    return series;
  }

  /**
   * Unfollow Series
   *
   * Deletes a follower for a given series by ID.
   */
  public async unfollowSeries(
    pubsub: PubSub,
    userId: number,
    seriesId: number,
  ): Promise<SeriesEntity> {
    const series = await this.seriesById(seriesId);
    const follower = await this.seriesFollowerByPKs(userId, seriesId);
    await this.commonService.removeEntity(
      this.seriesFollowersRepository,
      follower,
    );
    await this.notificationsService.removeNotification(
      pubsub,
      NotificationTypeEnum.FOLLOW,
      userId,
      series.author.id,
      series,
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
    authorId,
  }: ExtendedSearchDto): Promise<IPaginated<SeriesEntity>> {
    const qb = this.seriesRepository.createQueryBuilder(this.seriesAlias);

    if (search) {
      qb.where({
        title: {
          $ilike: this.commonService.formatSearch(search),
        },
      });
    }

    if (authorId) {
      qb.andWhere({
        author: authorId,
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
    const idsQuery = this.seriesFollowersRepository
      .createQueryBuilder(this.seriesFollowersAlias)
      .select(`${this.seriesFollowersAlias}.series_id`)
      .where({
        user: userId,
      })
      .getKnexQuery();

    const qb = this.seriesRepository
      .createQueryBuilder(this.seriesAlias)
      .where({
        id: {
          $in: idsQuery,
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
    await this.checkSeriesExistence(seriesId);
    return await this.tagsService.findTagsByIdsQuery(
      this.seriesTagsQuery(seriesId),
    );
  }

  public async seriesFollowers({
    seriesId,
    first,
    after,
    order,
  }: FilterSeriesFollowersDto): Promise<IPaginated<UserEntity>> {
    await this.checkSeriesExistence(seriesId);
    const followersQuery = this.seriesFollowersRepository
      .createQueryBuilder(this.seriesFollowersAlias)
      .select(`${this.seriesFollowersAlias}.user_id`)
      .where({
        series: seriesId,
      })
      .getKnexQuery();
    const qb = this.usersService
      .usersQueryBuilder()
      .where({ id: { $in: followersQuery } });
    return this.commonService.queryBuilderPagination(
      'u',
      'username',
      first,
      order,
      qb,
      after,
    );
  }

  public async checkSeriesExistence(seriesId: number): Promise<void> {
    const count = await this.seriesRepository.count({ id: seriesId });
    if (count === 0) throw new NotFoundException('Series not found');
  }

  //_______ FOR ADMIN SERVICE ______

  public async adminDeleteSeries(seriesId: number): Promise<LocalMessageType> {
    const series = await this.seriesById(seriesId);
    await this.commonService.removeEntity(this.seriesRepository, series);
    return new LocalMessageType('Series deleted successfully');
  }

  public async adminEditSeries({
    seriesId,
    title,
    description,
  }: UpdateSeriesInput): Promise<SeriesEntity> {
    const series = await this.seriesById(seriesId);
    await this.updateSeriesLogic(series, title, description);
    return series;
  }

  public async adminEditSeriesPicture({
    seriesId,
    picture,
  }: UpdateSeriesPictureInput): Promise<SeriesEntity> {
    const series = await this.seriesById(seriesId);
    await this.updateSeriesPictureLogic(series, picture);
    return series;
  }

  /**
   * Series' Tags Query
   *
   * Gets the tag IDS knex sub query for a given series.
   */
  public seriesTagsQuery(seriesId: number): Knex.QueryBuilder {
    return this.seriesTagsRepository
      .createQueryBuilder(this.seriesTagsAlias)
      .select(`${this.seriesTagsAlias}.tag_id`)
      .where({ series: seriesId })
      .getKnexQuery();
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

  private async updateSeriesLogic(
    series: SeriesEntity,
    title?: string,
    description?: string,
  ) {
    if (title) {
      title = this.commonService.formatTitle(title);
      series.title = title;
      series.slug = this.commonService.generateSlug(title);
    }

    if (description) series.description = description;

    await this.commonService.saveEntity(this.seriesRepository, series);
  }

  private async updateSeriesPictureLogic(
    series: SeriesEntity,
    picture: Promise<FileUpload>,
  ): Promise<void> {
    const toDelete = series.picture;
    series.picture = await this.uploaderService.uploadImage(
      series.author.id,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.seriesRepository, series);
    this.uploaderService.deleteFile(toDelete);
  }
}
