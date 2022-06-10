import { Test, TestingModule } from '@nestjs/testing';
import { LoadersService } from '../loaders.service';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from '../../config/validation';
import { config } from '../../config/config';
import { CacheModule } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroOrmConfig } from '../../config/mikroorm.config';
import { CommonModule } from '../../common/common.module';
import { UploaderModule } from '../../uploader/uploader.module';
import { EntityManager } from '@mikro-orm/sqlite';

describe('LoadersService', () => {
  let loadersService: LoadersService, em: EntityManager;

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
        CommonModule,
        UploaderModule,
      ],
      providers: [
        LoadersService,
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

    loadersService = module.get<LoadersService>(LoadersService);
    em = module.get<EntityManager>(EntityManager);
  });

  it('should be defined', () => {
    expect(loadersService).toBeDefined();
    expect(em).toBeDefined();
  });
});
