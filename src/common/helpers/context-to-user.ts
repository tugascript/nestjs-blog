import { IExtendedRequest } from 'src/auth/interfaces/extended-request.interface';
import { IGqlCtx } from '../interfaces/gql-ctx.interface';

export const contextToUser = (ctx: IGqlCtx): number => {
  return ctx.ws.id ?? (ctx.reply.request as IExtendedRequest).user.id;
};
