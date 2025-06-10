import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaceAuthController } from './face-auth.controller';
import { FaceAuthService } from './face-auth.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('FACE_AUTH_SERVICE_URL'),
        timeout: configService.get<number>('FACE_AUTH_TIMEOUT'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [FaceAuthController],
  providers: [FaceAuthService],
  exports: [FaceAuthService],
})
export class FaceAuthModule {}
