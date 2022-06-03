import { registerEnumType } from '@nestjs/graphql';

export enum NotificationEntityEnum {
  SERIES = 'SERIES',
  POST = 'POST',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
}

registerEnumType(NotificationEntityEnum, {
  name: 'NotificationEntity',
});
