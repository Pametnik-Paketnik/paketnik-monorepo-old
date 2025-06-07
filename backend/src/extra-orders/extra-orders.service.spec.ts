import { Test, TestingModule } from '@nestjs/testing';
import { ExtraOrdersService } from './extra-orders.service';

describe('ExtraOrdersService', () => {
  let service: ExtraOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtraOrdersService],
    }).compile();

    service = module.get<ExtraOrdersService>(ExtraOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
