import { IAuthored } from './authored.interface';

export interface IExtendedBase extends IAuthored {
  title: string;
  slug: string;
  picture: string;
  mute: boolean;
}
