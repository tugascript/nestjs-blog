import { ISeries } from './series.interface';
import { ITag } from '../../tags/interfaces/tag.interface';

export interface ISeriesTag {
  series: ISeries;
  tag: ITag;
  createdAt: Date;
}
