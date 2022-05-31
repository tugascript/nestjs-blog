import { IBase } from './base.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface IExtendedBase extends IBase {
  title: string;
  slug: string;
  picture: string;
  author: IUser;
}
