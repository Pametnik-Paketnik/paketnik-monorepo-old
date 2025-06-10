import { Test, TestingModule } from '@nestjs/testing';
import { TotpAuthService } from './totp-auth.service';

describe('TotpAuthService', () => {
  let service: TotpAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TotpAuthService],
    }).compile();

    service = module.get<TotpAuthService>(TotpAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
