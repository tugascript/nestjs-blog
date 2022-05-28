import { IBase } from '../../common/interfaces/base.interface';
import { Collection } from '@mikro-orm/core';
import { ITag } from '../../tags/interfaces/tag.interface';
import { IUser } from '../../users/interfaces/user.interface';

export interface ISeries extends IBase {
  title: string;
  slug: string;
  picture: string;
  tags: Collection<any, any> | ITag[];
  author?: IUser;
}
