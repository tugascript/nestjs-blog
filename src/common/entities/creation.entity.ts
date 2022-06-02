import { Entity, Property } from '@mikro-orm/core';
import { ICreation } from '../interfaces/creation.interface';

@Entity({ abstract: true })
export abstract class CreationEntity implements ICreation {
  @Property({ onCreate: () => new Date() })
  public createdAt: Date = new Date();
}
