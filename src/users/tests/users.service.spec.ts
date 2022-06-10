import { faker } from '@faker-js/faker';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/sqlite';
import { CacheModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { RegisterDto } from '../../auth/dtos/register.dto';
import { CommonModule } from '../../common/common.module';
import { CommonService } from '../../common/common.service';
import { QueryOrderEnum } from '../../common/enums/query-order.enum';
import { LocalMessageType } from '../../common/gql-types/message.type';
import { config } from '../../config/config';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { validationSchema } from '../../config/validation';
import { UploaderModule } from '../../uploader/uploader.module';
import { UsersService } from '../users.service';
import { UserEntity } from '../entities/user.entity';
import {
  getUserQueryCursor,
  QueryCursorEnum,
} from '../../common/enums/query-cursor.enum';

const PASSWORD = 'Ab123456';

describe('UsersService', () => {
  let usersService: UsersService,
    commonService: CommonService,
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
        MikroOrmModule.forFeature([UserEntity]),
        CommonModule,
        UploaderModule,
      ],
      providers: [
        UsersService,
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

    usersService = module.get<UsersService>(UsersService);
    commonService = module.get<CommonService>(CommonService);
    usersRepository = module.get<EntityRepository<UserEntity>>(
      getRepositoryToken(UserEntity),
    );
  });

  describe('create users for pagination', () => {
    it('should create 50 users', async () => {
      const nonFlushUserCreation = async ({
        name,
        email,
        password1,
      }: RegisterDto) => {
        return usersRepository.create({
          name,
          email,
          username: commonService.generatePointSlug(name),
          password: await hash(password1, 10),
          confirmed: true,
        });
      };

      const userArr: UserEntity[] = [];
      for (let i = 0; i < 50; i++) {
        userArr.push(
          await nonFlushUserCreation({
            name: faker.name.findName(),
            email: faker.internet.email(),
            password1: PASSWORD,
            password2: PASSWORD,
          }),
        );
      }
      await usersRepository.persistAndFlush(userArr);
    });
  });

  let idToDelete: number;
  describe('findUsers', () => {
    it('should get all users containing the letter a', async () => {
      jest
        .spyOn(usersService, 'filterUsers')
        .mockImplementation(async ({ search, order, cursor, first, after }) => {
          const name = 'u';

          const qb = usersRepository.createQueryBuilder(name).where({
            confirmed: true,
          });

          if (search) {
            qb.andWhere({
              name: {
                $like: commonService.formatSearch(search),
              },
            });
          }

          return await commonService.queryBuilderPagination(
            name,
            getUserQueryCursor(cursor) as keyof UserEntity,
            first,
            order,
            qb,
            after,
          );
        });

      const paginated = await usersService.filterUsers({
        order: QueryOrderEnum.DESC,
        cursor: QueryCursorEnum.DATE,
        first: 20,
      });

      expect(paginated.edges.length).toBeDefined();
      expect(paginated.pageInfo).toBeDefined();
      expect(paginated.currentCount).toBeGreaterThanOrEqual(50);
      expect(paginated.previousCount).toBe(0);
      expect(paginated.pageInfo.hasNextPage).toBe(true);
      expect(paginated.pageInfo.hasPreviousPage).toBe(false);

      const paginated2 = await usersService.filterUsers({
        order: QueryOrderEnum.DESC,
        cursor: QueryCursorEnum.DATE,
        first: 10,
        after: paginated.pageInfo.endCursor,
      });

      expect(paginated2.edges.length).toBeDefined();
      expect(paginated2.pageInfo).toBeDefined();
      expect(paginated2.currentCount).toBeGreaterThanOrEqual(30);
      expect(paginated2.previousCount).toBe(20);
      expect(paginated2.pageInfo.hasNextPage).toBe(true);
      expect(paginated2.pageInfo.hasPreviousPage).toBe(true);

      idToDelete = paginated.edges[0]?.node.id;
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and return a local message', async () => {
      const message = await usersService.deleteUser(idToDelete ?? 1, PASSWORD);

      expect(message).toBeInstanceOf(LocalMessageType);
      expect(message.message).toBe('Account deleted successfully');
    });
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
    expect(commonService).toBeDefined();
    expect(usersRepository).toBeDefined();
  });
});
