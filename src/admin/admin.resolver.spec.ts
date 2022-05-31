import { Test, TestingModule } from '@nestjs/testing';
import { AdminResolver } from './admin.resolver';
import { AdminService } from './admin.service';

describe('AdminResolver', () => {
  let resolver: AdminResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminResolver, AdminService],
    }).compile();

    resolver = module.get<AdminResolver>(AdminResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
