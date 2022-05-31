import { registerEnumType } from '@nestjs/graphql';

export enum NotificationTypeEnum {
  POST_LIKE = 'POST_LIKE',
  COMMENT_LIKE = 'COMMENT_LIKE',
  REPLY_LIKE = 'REPLY_LIKE',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  MENTION = 'MENTION',
}

registerEnumType(NotificationTypeEnum, {
  name: 'NotificationType',
});
