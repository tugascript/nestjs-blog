import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppNotificationEntity } from './entities/app-notification.entity';

@Module({
  imports: [MikroOrmModule.forFeature([AppNotificationEntity])],
  providers: [NotificationsResolver, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
