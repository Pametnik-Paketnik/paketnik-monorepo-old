import { Test, TestingModule } from '@nestjs/testing';
import { ExtraOrdersController } from './extra-orders.controller';
import { ExtraOrdersService } from './extra-orders.service';

describe('ExtraOrdersController', () => {
  let controller: ExtraOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtraOrdersController],
      providers: [ExtraOrdersService],
    }).compile();

    controller = module.get<ExtraOrdersController>(ExtraOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
