import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SeriesService } from './series.service';
import { CreateSeriesInput } from './inputs/create-series.input';
import { UpdateSeriesInput } from './inputs/update-series.input';
import { SeriesType } from './gql-types/series.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { UseGuards } from '@nestjs/common';
import { PublisherGuard } from '../auth/guards/publisher.guard';
import { SeriesDto } from './dtos/series.dto';
import { SeriesEntity } from './entities/series.entity';
import { LocalMessageType } from '../common/gql-types/message.type';
import { Public } from '../auth/decorators/public.decorator';
import { SlugDto } from '../common/dtos/slug.dto';
import { PaginatedSeriesType } from './gql-types/paginated-series.type';
import { SearchDto } from '../common/dtos/search.dto';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { SeriesTagInput } from './inputs/series-tag.input';
import { UpdateSeriesPictureInput } from './inputs/update-series-picture.input';

@Resolver(() => SeriesType)
export class SeriesResolver {
  constructor(private readonly seriesService: SeriesService) {}

  @UseGuards(PublisherGuard)
  @Mutation(() => SeriesType)
  public async createSeries(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: CreateSeriesInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.createSeries(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => SeriesType)
  public async updateSeries(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: UpdateSeriesInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.updateSeries(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => SeriesType)
  public async updateSeriesPicture(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: UpdateSeriesPictureInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.updateSeriesPicture(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => SeriesType)
  public async addTagToSeries(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: SeriesTagInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.addTagToSeries(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => SeriesType)
  public async removeTagFromSeries(
    @CurrentUser() user: IAccessPayload,
    @Args('input') input: SeriesTagInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.removeTagFromSeries(user.id, input);
  }

  @UseGuards(PublisherGuard)
  @Mutation(() => LocalMessageType)
  public async deleteSeries(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: SeriesDto,
  ): Promise<LocalMessageType> {
    return this.seriesService.deleteSeries(user.id, dto.seriesId);
  }

  @Public()
  @Query(() => SeriesType)
  public async seriesById(@Args() dto: SeriesDto): Promise<SeriesEntity> {
    return this.seriesService.seriesById(dto.seriesId);
  }

  @Public()
  @Query(() => SeriesType)
  public async seriesBySlug(@Args() dto: SlugDto): Promise<SeriesEntity> {
    return this.seriesService.seriesBySlug(dto.slug);
  }

  @Public()
  @Query(() => PaginatedSeriesType)
  public async filterSeries(
    @Args() dto: SearchDto,
  ): Promise<IPaginated<SeriesEntity>> {
    return this.seriesService.filterSeries(dto);
  }
}
