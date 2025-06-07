import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleanersController } from './cleaners.controller';
import { CleanersService } from './cleaners.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [CleanersController],
  providers: [CleanersService],
  exports: [CleanersService],
})
export class CleanersModule {}
