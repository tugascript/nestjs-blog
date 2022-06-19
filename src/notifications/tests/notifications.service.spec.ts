import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { CommonModule } from '../../common/common.module';
import { UploaderModule } from '../../uploader/uploader.module';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { NotificationEntity } from '../entities/notification.entity';
import { CommonService } from '../../common/common.service';
import { UploaderService } from '../../uploader/uploader.service';
import { EntityManager, EntityRepository } from '@mikro-orm/sqlite';
import { fakeName, MockPubSub, picture } from '../../common/tests/mocks';
import { UserEntity } from '../../users/entities/user.entity';
import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import { RoleEnum } from '../../users/enums/role.enum';
import { PostEntity } from '../../posts/entities/post.entity';
import { RatioEnum } from '../../common/enums/ratio.enum';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { PostLikeEntity } from '../../posts/entities/post-like.entity';
import { NotificationEntityEnum } from '../enums/notification-entity.enum';
import { CommentEntity } from '../../comments/entities/comment.entity';
import { SeriesEntity } from '../../series/entities/series.entity';
import { SeriesFollowerEntity } from '../../series/entities/series-follower.entity';

const pubsub = new MockPubSub();
describe('NotificationsService', () => {
  let notificationsService: NotificationsService,
    commonService: CommonService,
    uploaderService: UploaderService,
    notificationsRepository: EntityRepository<NotificationEntity>,
    em: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validationSchema,
          load: [config],
        }),
        CacheModule.register({
          isGlobal: true,
          ttl: parseInt(process.env.REDIS_CACHE_TTL, 10),
        }),
        MikroOrmModule.forRootAsync({
          imports: [ConfigModule],
          useClass: MikroOrmConfig,
        }),
        MikroOrmModule.forFeature([NotificationEntity]),
        CommonModule,
        UploaderModule,
      ],
      providers: [
        NotificationsService,
        {
          provide: 'CommonModule',
          useClass: CommonModule,
        },
        {
          provide: 'UploaderModule',
          useClass: UploaderModule,
        },
      ],
    }).compile();

    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    commonService = module.get<CommonService>(CommonService);
    uploaderService = module.get<UploaderService>(UploaderService);
    notificationsRepository = module.get<EntityRepository<NotificationEntity>>(
      getRepositoryToken(NotificationEntity),
    );
    em = module.get<EntityManager>(EntityManager);
  });

  const userIds: number[] = [];
  describe('Users Creation', () => {
    it('Should create 2 users', async () => {
      const users: UserEntity[] = [];

      for (let i = 0; i < 2; i++) {
        const name = fakeName();
        users.push(
          em.create(UserEntity, {
            name,
            email: faker.internet.email(),
            username: commonService.generatePointSlug(name),
            password: await hash('Ab123456', 5),
            confirmed: true,
            role: i === 0 ? RoleEnum.PUBLISHER : RoleEnum.USER,
          }),
        );
      }

      await em.persistAndFlush(users);
      userIds.push(...users.map((user) => user.id));
    });
  });

  let postId: number;
  describe('Post notifications', () => {
    it('Should create a post', async () => {
      const title = fakeName();
      const post = em.create(PostEntity, {
        title,
        slug: commonService.generateSlug(title),
        content: faker.lorem.words(2),
        picture: await uploaderService.uploadImage(
          userIds[0],
          picture(),
          RatioEnum.BANNER,
        ),
        author: userIds[0],
      });
      await em.persistAndFlush(post);
      postId = post.id;
    });

    it('Should like the post', async () => {
      const userId = userIds[1];
      const post = await em.findOne(PostEntity, { id: postId });
      const postLike = em.create(PostLikeEntity, {
        post: postId,
        user: userId,
      });
      await em.persistAndFlush(postLike);
      await notificationsService.createNotification(
        pubsub,
        NotificationTypeEnum.LIKE,
        userId,
        post.author.id,
        post,
      );
      const postNotification = await em.findOne(NotificationEntity, {
        recipient: post.author.id,
        issuer: userId,
        notificationType: NotificationTypeEnum.LIKE,
      });
      expect(postNotification).toBeDefined();
      expect(postNotification.notificationEntity).toBe(
        NotificationEntityEnum.POST,
      );
    });
  });

  describe('Comment notification', () => {
    it('Should create a comment', async () => {
      const userId = userIds[1];
      const post = await em.findOne(PostEntity, { id: postId });
      const comment = em.create(CommentEntity, {
        content: faker.lorem.words(2),
        post: postId,
        author: userId,
      });
      await em.persistAndFlush(comment);
      await notificationsService.createNotification(
        pubsub,
        NotificationTypeEnum.COMMENT,
        userId,
        post.author.id,
        comment,
      );
      const commentNotification = await em.findOne(NotificationEntity, {
        recipient: post.author.id,
        issuer: userId,
        notificationType: NotificationTypeEnum.COMMENT,
      });
      expect(commentNotification).toBeDefined();
      expect(commentNotification.notificationEntity).toBe(
        NotificationEntityEnum.COMMENT,
      );
    });
  });

  let seriesNotificationId: number;
  describe('Series Notifications', () => {
    let seriesId: number;
    it('Should create a series', async () => {
      const title = fakeName();
      const series = em.create(SeriesEntity, {
        title,
        author: userIds[0],
        slug: commonService.generateSlug(title),
        description: faker.lorem.words(2),
        picture: await uploaderService.uploadImage(
          userIds[0],
          picture(),
          RatioEnum.BANNER,
        ),
      });
      await em.persistAndFlush(series);
      seriesId = series.id;
    });

    it('Should Follow the series', async () => {
      const userId = userIds[1];
      const series = await em.findOne(SeriesEntity, { id: seriesId });
      const seriesFollower = em.create(SeriesFollowerEntity, {
        series: seriesId,
        user: userId,
      });
      await em.persistAndFlush(seriesFollower);
      await notificationsService.createNotification(
        pubsub,
        NotificationTypeEnum.LIKE,
        userId,
        series.author.id,
        series,
      );
      const seriesNotification = await em.findOne(NotificationEntity, {
        recipient: series.author.id,
        issuer: userId,
        notificationType: NotificationTypeEnum.LIKE,
        series: seriesId,
      });
      expect(seriesNotification).toBeDefined();
      expect(seriesNotification.notificationEntity).toBe(
        NotificationEntityEnum.SERIES,
      );
      seriesNotificationId = seriesNotification.id;
    });
  });

  describe('Notifications CRUD', () => {
    let notificationId: number;
    it('Find notifications of an user', async () => {
      const paginatedNotifications =
        await notificationsService.filterNotifications(userIds[0], {
          first: 2,
          unreadOnly: false,
        });
      expect(paginatedNotifications.edges.length).toBe(2);
      expect(paginatedNotifications.pageInfo.hasNextPage).toBe(true);
      expect(paginatedNotifications.pageInfo.hasPreviousPage).toBe(false);
      expect(paginatedNotifications.currentCount).toBe(3);
      notificationId = paginatedNotifications.edges[0].node.id;
    });

    it('Read notification', async () => {
      const notification = await notificationsService.readNotification(
        userIds[0],
        notificationId,
      );
      expect(notification.read).toBe(true);
      await expect(
        notificationsService.readNotification(userIds[0], notificationId),
      ).rejects.toThrowError();
      const paginatedNotifications =
        await notificationsService.filterNotifications(userIds[0], {
          first: 2,
          unreadOnly: true,
        });
      expect(paginatedNotifications.pageInfo.hasNextPage).toBe(false);
      expect(paginatedNotifications.pageInfo.hasPreviousPage).toBe(false);
      expect(paginatedNotifications.currentCount).toBe(2);
    });

    it('Delete notification', async () => {
      const message = await notificationsService.deleteNotification(
        userIds[0],
        notificationId,
      );
      expect(message.message).toBe('Notification deleted successfully');
      expect(
        await notificationsRepository.findOne({ id: notificationId }),
      ).toBeNull();
    });

    it('Remove notification', async () => {
      const series = await em.findOne(SeriesEntity, { author: userIds[0] });
      await notificationsService.removeNotification(
        pubsub,
        NotificationTypeEnum.FOLLOW,
        userIds[1],
        series.author.id,
        series,
      );
      expect(
        await notificationsRepository.findOne({ id: seriesNotificationId }),
      ).toBeNull();
    });
  });

  it('should be defined', () => {
    expect(notificationsService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(uploaderService).toBeDefined();
    expect(notificationsRepository).toBeDefined();
    expect(em).toBeDefined();
  });
});
