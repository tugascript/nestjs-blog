import { LocalBaseEntity } from './base.entity';
import { IAuthored } from '../interfaces/authored.interface';
import { Entity, ManyToOne } from '@mikro-orm/core';
import { UserEntity } from '../../users/entities/user.entity';
import { IsNotEmpty } from 'class-validator';

@Entity({ abstract: true })
export abstract class AuthoredEntity
  extends LocalBaseEntity
  implements IAuthored
{
  @ManyToOne({
    entity: () => UserEntity,
    onDelete: 'cascade',
  })
  @IsNotEmpty()
  public author!: UserEntity;
}
