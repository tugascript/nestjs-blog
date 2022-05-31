import { IBase } from './base.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { Collection } from '@mikro-orm/core';
import { ITag } from '../../tags/interfaces/tag.interface';

export interface IExtendedBase extends IBase {
  title: string;
  slug: string;
  picture: string;
  author: IUser;
  tags: Collection<any, any> | ITag[];
}
