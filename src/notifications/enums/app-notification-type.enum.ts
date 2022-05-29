import { registerEnumType } from '@nestjs/graphql';

export enum AppNotificationTypeEnum {
  POST_LIKE = 'POST_LIKE',
  COMMENT_LIKE = 'COMMENT_LIKE',
  REPLY_LIKE = 'REPLY_LIKE',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  MENTION = 'MENTION',
}

registerEnumType(AppNotificationTypeEnum, {
  name: 'AppNotificationType',
});
