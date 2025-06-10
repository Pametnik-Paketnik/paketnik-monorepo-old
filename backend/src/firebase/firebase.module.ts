import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseService } from './firebase.service';
import { FirebaseAdminProvider } from './firebase-admin.provider';
import { FirebaseController } from './firebase.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FirebaseController],
  providers: [FirebaseAdminProvider, FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
