import { UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Mutation,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PubSub } from 'mercurius';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PublisherGuard } from '../auth/guards/publisher.guard';
import { IAccessPayload } from '../auth/interfaces/access-payload.interface';
import { ExtendedSearchDto } from '../common/dtos/extended-search.dto';
import { FilterRelationDto } from '../common/dtos/filter-relation.dto';
import { FilterDto } from '../common/dtos/filter.dto';
import { SlugDto } from '../common/dtos/slug.dto';
import { LocalMessageType } from '../common/gql-types/message.type';
import { IPaginated } from '../common/interfaces/paginated.interface';
import { TagEntity } from '../tags/entities/tag.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PaginatedUsersType } from '../users/gql-types/paginated-users.type';
import { FilterSeriesFollowersDto } from './dtos/filter-series-followers.dto';
import { SeriesDto } from './dtos/series.dto';
import { SeriesEntity } from './entities/series.entity';
import { PaginatedSeriesType } from './gql-types/paginated-series.type';
import { SeriesType } from './gql-types/series.type';
import { CreateSeriesInput } from './inputs/create-series.input';
import { SeriesTagInput } from './inputs/series-tag.input';
import { UpdateSeriesPictureInput } from './inputs/update-series-picture.input';
import { UpdateSeriesInput } from './inputs/update-series.input';
import { SeriesService } from './series.service';
import { TagType } from '../tags/gql-types/tag.type';

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

  @Mutation(() => SeriesType)
  public async followSeries(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: SeriesDto,
  ): Promise<SeriesEntity> {
    return this.seriesService.followSeries(pubsub, user.id, dto.seriesId);
  }

  @Mutation(() => SeriesType)
  public async unfollowSeries(
    @Context('pubsub') pubsub: PubSub,
    @CurrentUser() user: IAccessPayload,
    @Args() dto: SeriesDto,
  ): Promise<SeriesEntity> {
    return this.seriesService.unfollowSeries(pubsub, user.id, dto.seriesId);
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
    @Args() dto: ExtendedSearchDto,
  ): Promise<IPaginated<SeriesEntity>> {
    return this.seriesService.filterSeries(dto);
  }

  @Public()
  @Query(() => PaginatedSeriesType)
  public async filterFollowedSeries(
    @CurrentUser() user: IAccessPayload,
    @Args() dto: FilterDto,
  ): Promise<IPaginated<SeriesEntity>> {
    return this.seriesService.filterFollowedSeries(user.id, dto);
  }

  @Public()
  @Query(() => [TagType])
  public async seriesTags(@Args() dto: SeriesDto): Promise<TagEntity[]> {
    return this.seriesService.seriesTags(dto.seriesId);
  }

  @Public()
  @Query(() => PaginatedUsersType)
  public async seriesFollowers(
    @Args() dto: FilterSeriesFollowersDto,
  ): Promise<IPaginated<UserEntity>> {
    return this.seriesService.seriesFollowers(dto);
  }

  //_____ ADMIN _____

  @Mutation(() => SeriesType)
  @UseGuards(AdminGuard)
  public async adminEditSeries(
    @Args('input') input: UpdateSeriesInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.adminEditSeries(input);
  }

  @Mutation(() => SeriesType)
  @UseGuards(AdminGuard)
  public async adminEditSeriesPicture(
    @Args('input') input: UpdateSeriesPictureInput,
  ): Promise<SeriesEntity> {
    return this.seriesService.adminEditSeriesPicture(input);
  }

  @Mutation(() => LocalMessageType)
  @UseGuards(AdminGuard)
  public async adminDeleteSeries(
    @Args() dto: SeriesDto,
  ): Promise<LocalMessageType> {
    return this.seriesService.adminDeleteSeries(dto.seriesId);
  }

  // RESOLVE FIELDS FOR LOADERS

  @ResolveField('followers', () => PaginatedUsersType)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getFollowers(@Args() _: FilterRelationDto) {
    return;
  }
}
