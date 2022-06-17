import { IExtendedRequest } from '../../auth/interfaces/extended-request.interface';
import { IGqlCtx } from '../interfaces/gql-ctx.interface';

export const contextToUser = (ctx: IGqlCtx): number | undefined => {
  return ctx.ws.id ?? (ctx.reply.request as IExtendedRequest)?.user?.id;
};
