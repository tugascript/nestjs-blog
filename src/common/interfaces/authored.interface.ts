import { IBase } from './base.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IAuthored extends IBase {
  author: IUser;
}
