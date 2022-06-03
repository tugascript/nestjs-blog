import { Field, ObjectType } from '@nestjs/graphql';
import { LocalBaseType } from '../../common/gql-types/base.type';
import { INotification } from '../interfaces/notification.interface';
import { UserType } from '../../users/gql-types/user.type';
import { IUser } from '../../users/interfaces/user.interface';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { NotificationEntityEnum } from '../enums/notification-entity.enum';
import { NotificationBodyType } from './notification-body.type';
import { IComment } from '../../comments/interfaces/comments.interface';
import { IPost } from '../../posts/interfaces/post.interface';
import { IReply } from '../../comments/interfaces/reply.interface';
import { ISeries } from '../../series/interfaces/series.interface';

@ObjectType('Notification')
export class NotificationType
  extends LocalBaseType
  implements Partial<INotification>
{
  @Field(() => NotificationTypeEnum)
  public notificationType: NotificationTypeEnum;

  @Field(() => NotificationEntityEnum)
  public notificationEntity: NotificationEntityEnum;

  @Field(() => NotificationBodyType)
  public body: ISeries | IPost | IComment | IReply;

  @Field(() => Boolean)
  public read: boolean;

  @Field(() => UserType)
  public issuer: IUser;
}
