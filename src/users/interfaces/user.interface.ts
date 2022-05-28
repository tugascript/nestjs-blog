import { IBase } from '../../common/interfaces/base.interface';
import { OnlineStatusEnum } from '../enums/online-status.enum';
import { RoleEnum } from '../enums/role.enum';

export interface IUser extends IBase {
  name: string;
  username: string;
  email: string;
  role?: RoleEnum;
  picture?: string;
  onlineStatus: OnlineStatusEnum;
  lastOnline: Date;
}
