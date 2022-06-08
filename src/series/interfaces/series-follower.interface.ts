import { IUser } from '../../users/interfaces/user.interface';
import { ISeries } from './series.interface';

export interface ISeriesFollower {
  series: ISeries;
  user: IUser;
  createdAt: Date;
}
