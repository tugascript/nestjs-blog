import { RoleEnum } from '../../users/enums/role.enum';

export interface IAccessPayload {
  id: number;
  role: RoleEnum;
}

export interface IAccessPayloadResponse extends IAccessPayload {
  iat: number;
  exp: number;
}
