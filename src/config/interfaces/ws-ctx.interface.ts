import { IAccessPayload } from '../../auth/interfaces/access-payload.interface';

export interface IWsCtx extends IAccessPayload {
  sessionId: string;
}
