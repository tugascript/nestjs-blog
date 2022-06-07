import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonService } from '../../common/common.service';
import { TagsService } from '../tags.service';
import { EntityRepository } from '@mikro-orm/sqlite';
import { TagEntity } from '../entities/tag.entity';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { CommonModule } from '../../common/common.module';
import { UserEntity } from '../../users/entities/user.entity';
import { hash } from 'bcrypt';
import { v4 as uuidV4 } from 'uuid';
import { LocalMessageType } from '../../common/gql-types/message.type';

describe('TagsService', () => {
  let tagsService: TagsService,
    commonService: CommonService,
    tagsRepository: EntityRepository<TagEntity>,
    usersRepository: EntityRepository<UserEntity>;

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
        MikroOrmModule.forFeature([TagEntity, UserEntity]),
        CommonModule,
      ],
      providers: [
        TagsService,
        {
          provide: 'CommonModule',
          useClass: CommonModule,
        },
      ],
    }).compile();

    tagsService = module.get<TagsService>(TagsService);
    commonService = module.get<CommonService>(CommonService);
    tagsRepository = module.get<EntityRepository<TagEntity>>(
      getRepositoryToken(TagEntity),
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

  describe('Tags CRUD', () => {
    const ids: number[] = [];
    it('Create Tag', async () => {
      for (let i = 0; i < 51; i++) {
        const name = `${faker.name.findName()} ${uuidV4().substring(0, 4)}`;

        if (i === 50) {
          await expect(
            tagsService.createTag(userId, name),
          ).rejects.toThrowError('Each user can only have 50 tags');
        } else {
          const tag = await tagsService.createTag(userId, name);
          expect(tag).toBeInstanceOf(TagEntity);
          expect(tag.name).toBe(commonService.formatTitle(name));
          ids.push(tag.id);
        }
      }
    });

    it('Update Tag', async () => {
      const oldName = (await tagsService.tagById(userId, ids[0])).name;
      const newName = `${faker.name.findName()} ${uuidV4().substring(0, 5)}`;
      const tag = await tagsService.updateTag(userId, {
        tagId: ids[0],
        name: newName,
      });
      expect(tag).toBeInstanceOf(TagEntity);
      expect(tag.name).toBe(commonService.formatTitle(newName));
      expect(tag.name).not.toBe(commonService.formatTitle(oldName));
    });

    it('Delete Tag', async () => {
      const tag = await tagsService.deleteTag(userId, ids[0]);
      expect(tag).toBeInstanceOf(LocalMessageType);
      expect(tag.message).toBe('Tag deleted successfully');
      await expect(tagsService.tagById(userId, ids[0])).rejects.toThrowError(
        'Tag not found',
      );
    });

    it('Find all tags', async () => {
      const tags = await tagsService.findAllTags(userId);

      for (let i = 0; i < ids.length; i++) {
        if (i > 0) {
          expect(tags[i - 1].id).toBe(ids[i]);
        }
      }

      expect(tags.length).toBe(49);
    });

    it('Find Tags By Ids', async () => {
      await expect(tagsService.findTagsByIds(userId, ids)).rejects.toThrowError(
        'One or more tags do not exist',
      );
      ids.shift();
      const tags = await tagsService.findTagsByIds(userId, ids);
      expect(tags.length).toBe(ids.length);
    });

    it('Find Tags By Id', async () => {
      const tag = await tagsService.tagById(userId, ids[1]);
      expect(tag).toBeInstanceOf(TagEntity);
    });

    it('Admin Edit Tag', async () => {
      const oldName = (await tagsService.tagById(userId, ids[0])).name;
      const newName = `${faker.name.findName()} ${uuidV4().substring(0, 5)}`;
      const tag = await tagsService.adminEditTag({
        tagId: ids[1],
        name: newName,
      });
      expect(tag).toBeInstanceOf(TagEntity);
      expect(tag.name).toBe(commonService.formatTitle(newName));
      expect(tag.name).not.toBe(commonService.formatTitle(oldName));
    });
  });

  it('should be defined', () => {
    expect(tagsService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(tagsRepository).toBeDefined();
    expect(usersRepository).toBeDefined();
  });
});
