import { registerEnumType } from '@nestjs/graphql';

export enum ChangeTypeEnum {
  NEW = 'NEW',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

registerEnumType(ChangeTypeEnum, {
  name: 'ChangeType',
});
