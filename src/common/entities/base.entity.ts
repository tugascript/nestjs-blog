import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { CreationEntity } from './creation.entity';
import { IBase } from '../interfaces/base.interface';

@Entity({ abstract: true })
export abstract class LocalBaseEntity extends CreationEntity implements IBase {
  @PrimaryKey()
  public id: number;

  @Property({ onUpdate: () => new Date() })
  public updatedAt: Date = new Date();
}
