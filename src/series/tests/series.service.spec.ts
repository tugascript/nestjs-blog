import { Test } from '@nestjs/testing';
import { SeriesService } from '../series.service';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { SeriesEntity } from '../entities/series.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { SeriesFollowerEntity } from '../entities/series-follower.entity';
import { SeriesTagEntity } from '../entities/series-tag.entity';
import { CommonModule } from '../../common/common.module';
import { CommonService } from '../../common/common.service';
import { EntityRepository } from '@mikro-orm/sqlite';
import { TagsModule } from '../../tags/tags.module';
import { UploaderModule } from '../../uploader/uploader.module';
import { TagsService } from '../../tags/tags.service';
import { UsersModule } from '../../users/users.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { v4 as uuidV4 } from 'uuid';
import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import { createReadStream } from 'fs';
import { join } from 'path';
import { FileUpload } from 'graphql-upload';
import { PubSub } from 'mercurius';
import { UploaderService } from '../../uploader/uploader.service';
import { QueryCursorEnum } from '../../common/enums/query-cursor.enum';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';
import { LocalMessageType } from '../../common/gql-types/message.type';

class MockPubSub implements PubSub {
  public publish = jest.fn();
  public subscribe = jest.fn();
}

const pubsub = new MockPubSub();

const fileStream = () =>
  createReadStream(join(__dirname, '..', '..', '..', 'test/files/test.jpeg'));

const file: FileUpload = {
  createReadStream: () => fileStream(),
  filename: 'test_image',
  mimetype: 'image/jpeg',
  encoding: 'JPEG',
};

const picture = (): Promise<FileUpload> =>
  new Promise<FileUpload>((resolve) => resolve(file));

const fakeName = (): string =>
  `${faker.name.findName()} ${uuidV4().substring(0, 4)}`;

describe('SeriesService', () => {
  let seriesService: SeriesService,
    commonService: CommonService,
    tagsService: TagsService,
    uploaderService: UploaderService,
    seriesRepository: EntityRepository<SeriesEntity>,
    seriesFollowersRepository: EntityRepository<SeriesFollowerEntity>,
    seriesTagsRepository: EntityRepository<SeriesTagEntity>,
    usersRepository: EntityRepository<UserEntity>;

  beforeEach(async () => {
    const [module] = await Promise.all([
      Test.createTestingModule({
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
          MikroOrmModule.forFeature([
            SeriesEntity,
            SeriesFollowerEntity,
            SeriesTagEntity,
            UserEntity,
          ]),
          CommonModule,
          TagsModule,
          UploaderModule,
          UsersModule,
          NotificationsModule,
        ],
        providers: [
          SeriesService,
          {
            provide: 'CommonModule',
            useClass: CommonModule,
          },
          {
            provide: 'UploaderModule',
            useClass: UploaderModule,
          },
        ],
      }).compile(),
    ]);

    seriesService = module.get<SeriesService>(SeriesService);
    commonService = module.get<CommonService>(CommonService);
    tagsService = module.get<TagsService>(TagsService);
    uploaderService = module.get<UploaderService>(UploaderService);
    seriesRepository = module.get<EntityRepository<SeriesEntity>>(
      getRepositoryToken(SeriesEntity),
    );
    seriesFollowersRepository = module.get<
      EntityRepository<SeriesFollowerEntity>
    >(getRepositoryToken(SeriesFollowerEntity));
    seriesTagsRepository = module.get<EntityRepository<SeriesTagEntity>>(
      getRepositoryToken(SeriesTagEntity),
    );
    usersRepository = module.get<EntityRepository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
  });

  let userId: number;
  describe('User creation', () => {
    it('should create a new user', async () => {
      const name = faker.name.findName();
      const user = usersRepository.create({
        name,
        email: faker.internet.email(),
        username: commonService.generatePointSlug(name),
        password: await hash('Ab123456', 10),
        confirmed: true,
      });
      await usersRepository.persistAndFlush(user);
      userId = user.id;
    });
  });

  describe('Series CRUD', () => {
    let seriesId: number;
    it('should create a new series', async () => {
      const tagIds: number[] = [];

      for (let i = 0; i < 5; i++) {
        const name = fakeName();
        const tag = await tagsService.createTag(userId, name);
        tagIds.push(tag.id);
      }

      const title = fakeName();
      const series = await seriesService.createSeries(userId, {
        title,
        picture: picture(),
        tagIds,
      });
      expect(series).toBeInstanceOf(SeriesEntity);
      expect(series.title).toBe(commonService.formatTitle(title));
      seriesId = series.id;
      await expect(
        seriesService.createSeries(userId, {
          title,
          picture: picture(),
          tagIds,
        }),
      ).rejects.toThrowError();
    });

    let seriesSlug: string;
    it('Update Series', async () => {
      const series = await seriesService.seriesById(seriesId);
      const oldTitle = series.title;
      const title = fakeName();
      const updatedSeries = await seriesService.updateSeries(userId, {
        seriesId,
        title,
      });
      expect(updatedSeries).toBeInstanceOf(SeriesEntity);
      expect(updatedSeries.title).not.toStrictEqual(oldTitle);
      expect(updatedSeries.title).toBe(commonService.formatTitle(title));
      seriesSlug = updatedSeries.slug;
    });

    it('Update Series Picture', async () => {
      const series = await seriesService.seriesById(seriesId);
      const oldPicture = series.picture;
      const updatedSeries = await seriesService.updateSeriesPicture(userId, {
        seriesId,
        picture: picture(),
      });
      expect(updatedSeries.picture).not.toStrictEqual(oldPicture);
    });

    let tagId: number;
    it('Add Tag to Series', async () => {
      const series = await seriesRepository.findOne(
        { author: userId, id: seriesId },
        { populate: ['tags'] },
      );
      const seriesTagsLen = series.tags.count();
      const tag = await tagsService.createTag(
        userId,
        `${faker.name.findName()} ${uuidV4().substring(0, 4)}`,
      );
      tagId = tag.id;
      const updatedSeries = await seriesService.addTagToSeries(userId, {
        seriesId,
        tagId,
      });
      const updatedTagsLen = await updatedSeries.tags.loadCount();
      expect(seriesTagsLen).toBeLessThan(updatedTagsLen);
      await expect(
        seriesService.addTagToSeries(userId, {
          seriesId,
          tagId,
        }),
      ).rejects.toThrowError();
    });

    it('Remove Tag from Series', async () => {
      const series = await seriesRepository.findOne(
        { author: userId, id: seriesId },
        { populate: ['tags'] },
      );
      const seriesTagsLen = series.tags.count();
      const updatedSeries = await seriesService.removeTagFromSeries(userId, {
        seriesId,
        tagId,
      });
      const updatedTagsLen = await updatedSeries.tags.loadCount();
      expect(seriesTagsLen).toBeGreaterThan(updatedTagsLen);
    });

    it('Follow Series', async () => {
      const series = await seriesService.followSeries(pubsub, userId, seriesId);
      expect(await series.followers.loadCount()).toBe(1);
      await expect(
        seriesService.followSeries(pubsub, userId, seriesId),
      ).rejects.toThrowError();
    });

    it('Unfollow Series', async () => {
      const series = await seriesService.unfollowSeries(
        pubsub,
        userId,
        seriesId,
      );
      expect(await series.followers.loadCount()).toBe(0);
      await expect(
        seriesService.unfollowSeries(pubsub, userId, seriesId),
      ).rejects.toThrowError();
    });

    it('Find Series by ID', async () => {
      const series = await seriesService.seriesById(seriesId);
      expect(series).toBeInstanceOf(SeriesEntity);
      expect(series.id).toBe(seriesId);
      await expect(seriesService.seriesById(10000000)).rejects.toThrowError();
    });

    it('Finds Series by Slug', async () => {
      const series = await seriesService.seriesBySlug(seriesSlug);
      expect(series).toBeInstanceOf(SeriesEntity);
      expect(series.slug).toBe(seriesSlug);
      await expect(seriesService.seriesBySlug(uuidV4())).rejects.toThrowError();
    });

    it('Filter Series', async () => {
      const series = await seriesService.seriesById(seriesId);
      const picture = series.picture;
      const seriesArr: SeriesEntity[] = [];

      for (let i = 0; i < 15; i++) {
        const title = commonService.formatTitle(fakeName());
        seriesArr.push(
          seriesRepository.create({
            title,
            picture,
            slug: commonService.generateSlug(title),
            author: userId,
          }),
        );
      }

      await seriesRepository.persistAndFlush(seriesArr);
      const filteredSeries = await seriesService.filterSeries({
        cursor: QueryCursorEnum.ALPHA,
        order: QueryOrderEnum.ASC,
        first: 10,
        authorId: userId,
      });
      expect(filteredSeries.edges.length).toBe(10);
      expect(filteredSeries.currentCount).toBe(16);
      expect(filteredSeries.previousCount).toBe(0);
      expect(filteredSeries.pageInfo.hasNextPage).toBe(true);
      expect(filteredSeries.pageInfo.hasPreviousPage).toBe(false);

      const filteredSeries2 = await seriesService.filterSeries({
        cursor: QueryCursorEnum.ALPHA,
        order: QueryOrderEnum.ASC,
        first: 10,
        after: filteredSeries.pageInfo.endCursor,
        authorId: userId,
      });
      expect(filteredSeries2.edges.length).toBe(6);
      expect(filteredSeries2.currentCount).toBe(6);
      expect(filteredSeries2.previousCount).toBe(10);
      expect(filteredSeries2.pageInfo.hasPreviousPage).toBe(true);
      expect(filteredSeries2.pageInfo.hasNextPage).toBe(false);
    });

    it('Filter Followed Series', async () => {
      const series = await seriesRepository.find({ author: userId });
      const following: SeriesFollowerEntity[] = [];

      for (let i = 0; i < 10; i++) {
        const seriesId = series[i].id;
        following.push(
          seriesFollowersRepository.create({ series: seriesId, user: userId }),
        );
      }

      await seriesFollowersRepository.persistAndFlush(following);
      const filteredSeries = await seriesService.filterFollowedSeries(userId, {
        cursor: QueryCursorEnum.ALPHA,
        order: QueryOrderEnum.ASC,
        first: 5,
      });
      expect(filteredSeries.edges.length).toBe(5);
      expect(filteredSeries.currentCount).toBe(10);
      expect(filteredSeries.previousCount).toBe(0);
      expect(filteredSeries.pageInfo.hasNextPage).toBe(true);
      expect(filteredSeries.pageInfo.hasPreviousPage).toBe(false);

      const filteredSeries2 = await seriesService.filterFollowedSeries(userId, {
        cursor: QueryCursorEnum.ALPHA,
        order: QueryOrderEnum.ASC,
        first: 5,
        after: filteredSeries.pageInfo.endCursor,
      });
      expect(filteredSeries2.edges.length).toBe(5);
      expect(filteredSeries2.currentCount).toBe(5);
      expect(filteredSeries2.previousCount).toBe(5);
      expect(filteredSeries2.pageInfo.hasNextPage).toBe(false);
      expect(filteredSeries2.pageInfo.hasPreviousPage).toBe(true);
    });

    it('Get Series Tags', async () => {
      const series = await seriesRepository.findOne(
        { id: seriesId },
        { populate: ['tags'] },
      );
      const tagCount = series.tags.count();
      const tags = await seriesService.seriesTags(seriesId);
      expect(tags.length).toBe(tagCount);
    });

    it('Delete Series', async () => {
      const message = await seriesService.deleteSeries(userId, seriesId);
      expect(message).toBeInstanceOf(LocalMessageType);
      expect(message.message).toBe('Series deleted successfully');
      await expect(seriesService.seriesById(seriesId)).rejects.toThrowError();
    });
  });

  it('should be defined', () => {
    expect(seriesService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(tagsService).toBeDefined();
    expect(uploaderService).toBeDefined();
    expect(seriesRepository).toBeDefined();
    expect(seriesFollowersRepository).toBeDefined();
    expect(seriesTagsRepository).toBeDefined();
    expect(usersRepository).toBeDefined();
  });
});
