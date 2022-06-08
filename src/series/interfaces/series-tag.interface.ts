import { ITag } from '../../tags/interfaces/tag.interface';
import { ISeries } from './series.interface';

export interface ISeriesTag {
  series: ISeries;
  tag: ITag;
  createdAt: Date;
}
