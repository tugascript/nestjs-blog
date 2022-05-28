import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/gql-types/paginated.type';
import { SeriesType } from './series.type';

@ObjectType('PaginatedSeries')
export abstract class PaginatedSeriesType extends Paginated(SeriesType) {}
