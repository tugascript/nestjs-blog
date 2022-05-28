import { MercuriusContext } from 'mercurius';
import { IAccessPayload } from '../../auth/interfaces/access-payload.interface';

export type IExtendedContext = MercuriusContext & { user?: IAccessPayload };
