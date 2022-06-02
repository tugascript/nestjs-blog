import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../common/gql-types/change.type';
import { ReplyType } from './reply.type';

@ObjectType('ReplyChange')
export abstract class ReplyChangeType extends Change<ReplyType>(ReplyType) {}
