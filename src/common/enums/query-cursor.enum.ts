import { registerEnumType } from '@nestjs/graphql';
import { ExtendedBaseEntity } from '../entities/extended-base.entity';
import { UserEntity } from '../../users/entities/user.entity';

export enum QueryCursorEnum {
  DATE = 'DATE',
  ALPHA = 'ALPHA',
}

registerEnumType(QueryCursorEnum, {
  name: 'QueryCursor',
});

export const getQueryCursor = (
  cursor: QueryCursorEnum,
): keyof ExtendedBaseEntity =>
  cursor === QueryCursorEnum.DATE ? 'id' : 'slug';

export const getUserQueryCursor = (cursor: QueryCursorEnum): keyof UserEntity =>
  cursor === QueryCursorEnum.DATE ? 'id' : 'username';
