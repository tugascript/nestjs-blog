import { registerEnumType } from '@nestjs/graphql';
import { IUser } from '../../users/interfaces/user.interface';
import { IExtendedBase } from '../interfaces/extended-base.interface';

export enum QueryCursorEnum {
  DATE = 'DATE',
  ALPHA = 'ALPHA',
}

registerEnumType(QueryCursorEnum, {
  name: 'QueryCursor',
});

export const getQueryCursor = (cursor: QueryCursorEnum): keyof IExtendedBase =>
  cursor === QueryCursorEnum.DATE ? 'id' : 'slug';

export const getUserQueryCursor = (cursor: QueryCursorEnum): keyof IUser =>
  cursor === QueryCursorEnum.DATE ? 'id' : 'username';
