import { Field, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from '../../common/gql-types/base.type';
import { INotification } from '../interfaces/notification.interface';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { PostType } from '../../posts/gql-types/post.type';
import { CommentType } from '../../comments/gql-types/comment.type';
import { UserType } from '../../users/gql-types/user.type';

@ObjectType('AppNotification')
export class NotificationType extends LocalBaseType implements INotification {
  @Field(() => NotificationTypeEnum)
  public notificationType: NotificationTypeEnum;

  @Field(() => Boolean)
  public read: boolean;

  @Field(() => PostType)
  public post: PostType;

  @Field(() => UserType)
  public issuer: UserType;

  @Field(() => CommentType, { nullable: true })
  public comment?: CommentType;

  @Field(() => CommentType, { nullable: true })
  public reply?: CommentType;
}
