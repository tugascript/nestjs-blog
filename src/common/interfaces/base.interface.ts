import { ICreation } from './creation.interface';

export interface IBase extends ICreation {
  id: number;
  updatedAt: Date;
}
