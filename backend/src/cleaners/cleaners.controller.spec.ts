import { Test, TestingModule } from '@nestjs/testing';
import { CleanersController } from './cleaners.controller';
import { CleanersService } from './cleaners.service';

describe('CleanersController', () => {
  let controller: CleanersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleanersController],
      providers: [
        {
          provide: CleanersService,
          useValue: {
            createCleaner: jest.fn(),
            getCleanersForHost: jest.fn(),
            getCleanerById: jest.fn(),
            updateCleaner: jest.fn(),
            deleteCleaner: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CleanersController>(CleanersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
