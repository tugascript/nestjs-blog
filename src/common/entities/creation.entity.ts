import { Entity, Property } from '@mikro-orm/core';

@Entity({ abstract: true })
export abstract class CreationEntity {
  @Property({ onCreate: () => new Date() })
  public createdAt: Date = new Date();
}
