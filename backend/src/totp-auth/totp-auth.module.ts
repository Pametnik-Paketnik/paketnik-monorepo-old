import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TotpAuthService } from './totp-auth.service';
import { TotpAuthController } from './totp-auth.controller';
import { User } from '../users/entities/user.entity';
import { CryptoService } from '../common/services/crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [TotpAuthController],
  providers: [TotpAuthService, CryptoService],
  exports: [TotpAuthService],
})
export class TotpAuthModule {}
