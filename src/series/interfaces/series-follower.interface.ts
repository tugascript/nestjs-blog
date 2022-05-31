import { ISeries } from './series.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface ISeriesFollower {
  series: ISeries;
  user: IUser;
  createdAt: Date;
}
