import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { TypeOrmExceptionFilter } from './config/typeorm-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  await app.register(helmet);
  // TODO: Add request-response compression (Preferred: Fastify Compression)
  // TODO: Add CORS configuration (Preferred: Fastify CORS)
  // TODO: Add rate limiting (Preferred: Fastify Rate Limit)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new TypeOrmExceptionFilter());
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
  });

  const configService: ConfigService<unknown, boolean> = app.get(ConfigService);

  const port: number | undefined = configService.get<number>('server.port');
  await app.listen(port ?? 3000);
}

bootstrap(); // TODO: Add error handling and logging for application startup
