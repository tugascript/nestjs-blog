import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NotificationEntity } from './entities/notification.entity';

@Module({
  imports: [MikroOrmModule.forFeature([NotificationEntity])],
  providers: [NotificationsResolver, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
