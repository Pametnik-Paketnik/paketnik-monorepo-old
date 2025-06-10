import { Test, TestingModule } from '@nestjs/testing';
import { TotpAuthController } from './totp-auth.controller';

describe('TotpAuthController', () => {
  let controller: TotpAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TotpAuthController],
    }).compile();

    controller = module.get<TotpAuthController>(TotpAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
