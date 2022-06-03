import { registerEnumType } from '@nestjs/graphql';

export enum NotificationTypeEnum {
  LIKE = 'LIKE',
  FOLLOW = 'FOLLOW',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  MENTION = 'MENTION',
}

registerEnumType(NotificationTypeEnum, {
  name: 'NotificationType',
});
