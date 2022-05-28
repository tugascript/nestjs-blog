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

@Injectable()
export class SeriesService {
  private readonly seriesAlias = 's';

  constructor(
    @InjectRepository(SeriesEntity)
    private readonly seriesRepository: EntityRepository<SeriesEntity>,
    private readonly tagsService: TagsService,
    private readonly commonService: CommonService,
    private readonly uploaderService: UploaderService,
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
    const series = await this.seriesRepository.create({
      title,
      slug: this.commonService.generateSlug(title),
      author: userId,
    });
    const tags = await this.tagsService.findTagsByIds(userId, tagIds);
    series.tags.set(tags);
    series.picture = await this.uploaderService.uploadImage(
      userId,
      picture,
      RatioEnum.BANNER,
    );
    await this.commonService.saveEntity(this.seriesRepository, series, true);
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
    series.tags.add(tag);
    await this.commonService.saveEntity(this.seriesRepository, series);
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
    const tag = await this.tagsService.tagById(userId, tagId);
    series.tags.remove(tag);
    await this.commonService.saveEntity(this.seriesRepository, series);
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

    return await this.commonService.queryBuilderPagination(
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
}
