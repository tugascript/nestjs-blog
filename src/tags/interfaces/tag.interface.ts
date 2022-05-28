import { IBase } from '../../common/interfaces/base.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface ITag extends IBase {
  name: string;
  author?: IUser;
}
