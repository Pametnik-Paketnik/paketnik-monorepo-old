import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { join } from 'path';
import { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  // Enable CORS (allow file:// for local testing and all localhost ports)
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^file:\/\//, // Allow file:// protocol for local HTML files
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Serve static files for testing
  app.useStaticAssets(join(__dirname, '..', 'test'), {
    prefix: '/test/',
  });

  // Serve Firebase service worker at root (required by Firebase)
  app.use('/firebase-messaging-sw.js', (req: Request, res: Response) => {
    res.sendFile(join(__dirname, '..', 'test', 'firebase-messaging-sw.js'));
  });

  // global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // Enable transformation for class-transformer
    }),
  );

  // Enable class-transformer serialization
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Paketnik')
    .setDescription('Paketnik API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  await app.listen(port ?? 3000);

  console.log(`🚀 Server is running on http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
});
