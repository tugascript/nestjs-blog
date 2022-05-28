import { FastifyRequest } from 'fastify';
import { IAccessPayload } from './access-payload.interface';

export interface IExtendedRequest extends FastifyRequest {
  user?: IAccessPayload;
}
