import { IBase } from './base.interface';

export interface IExtendedBase extends IBase {
  title: string;
  slug: string;
  picture: string;
}
