import { registerEnumType } from '@nestjs/graphql';

export enum RoleEnum {
  USER = 'USER',
  ADMIN = 'ADMIN',
  PUBLISHER = 'PUBLISHER',
}

registerEnumType(RoleEnum, { name: 'Role' });
