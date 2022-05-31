import { ChangeTypeEnum } from '../enums/change-type.enum';
import { IEdge } from './paginated.interface';

export interface IChange<T> {
  type: ChangeTypeEnum;
  edge: IEdge<T>;
}
