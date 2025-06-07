import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CleanersService } from './cleaners.service';
import { User } from '../users/entities/user.entity';

describe('CleanersService', () => {
  let service: CleanersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CleanersService>(CleanersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
