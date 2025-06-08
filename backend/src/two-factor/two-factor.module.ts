import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { User } from '../users/entities/user.entity';
import { CryptoService } from '../common/services/crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, CryptoService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
