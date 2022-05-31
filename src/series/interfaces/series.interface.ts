import { Collection } from '@mikro-orm/core';
import { ITag } from '../../tags/interfaces/tag.interface';
import { IExtendedBase } from '../../common/interfaces/extended-base.interface';

export interface ISeries extends IExtendedBase {
  tags: Collection<any, any> | ITag[];
  followersCount?: number;
  followers?: Collection<any, any>;
}
