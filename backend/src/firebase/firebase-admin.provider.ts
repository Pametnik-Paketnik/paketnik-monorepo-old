import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

export const FIREBASE_ADMIN_TOKEN = 'FIREBASE_ADMIN';

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN_TOKEN,
  useFactory: (configService: ConfigService): admin.app.App => {
    try {
      const serviceAccountPath = configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_PATH',
      );

      if (!serviceAccountPath) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not configured');
      }

      // Resolve the path (can be relative or absolute)
      const resolvedPath = serviceAccountPath.startsWith('/')
        ? serviceAccountPath
        : join(process.cwd(), serviceAccountPath);

      // Read and parse the service account JSON
      const serviceAccountData = readFileSync(resolvedPath, 'utf8');
      const serviceAccount = JSON.parse(
        serviceAccountData,
      ) as admin.ServiceAccount;

      // Check if Firebase Admin is already initialized
      if (admin.apps.length > 0) {
        return admin.app();
      }

      // Initialize Firebase Admin SDK
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(
        `Failed to initialize Firebase Admin SDK: ${errorMessage}`,
      );
    }
  },
  inject: [ConfigService],
};
