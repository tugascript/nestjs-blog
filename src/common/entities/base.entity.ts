import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { IBase } from '../interfaces/base.interface';
import { CreationEntity } from './creation.entity';

@Entity({ abstract: true })
export abstract class LocalBaseEntity extends CreationEntity implements IBase {
  @PrimaryKey()
  public id: number;

  @Property({ onUpdate: () => new Date() })
  public updatedAt: Date = new Date();
}
