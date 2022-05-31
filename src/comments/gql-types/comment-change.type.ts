import { ObjectType } from '@nestjs/graphql';
import { Change } from '../../common/gql-types/change.type';
import { CommentType } from './comment.type';

@ObjectType('CommentChange')
export abstract class CommentChangeType extends Change<CommentType>(
  CommentType,
) {}
