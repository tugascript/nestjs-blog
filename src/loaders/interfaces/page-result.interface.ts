import { EntityDictionary } from '@mikro-orm/core';

export interface IPageResult<T> {
  id: number;
  count: number;
  entities: EntityDictionary<T>;
}
