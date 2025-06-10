import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { TotpAuthModule } from '../totp-auth/totp-auth.module';
import { FaceAuthModule } from '../face-auth/face-auth.module';
import { FaceAuthRequest } from './entities/face-auth-request.entity';
import { FaceAuthRequestService } from './services/face-auth-request.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { WebSocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [
    UsersModule,
    TotpAuthModule,
    FaceAuthModule,
    FirebaseModule,
    WebSocketsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    TypeOrmModule.forFeature([FaceAuthRequest]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    TokenBlacklistService,
    JwtAuthGuard,
    FaceAuthRequestService,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, FaceAuthRequestService],
})
export class AuthModule {}
