import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import compression from '@fastify/compress';
import helmet from '@fastify/helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const configService: ConfigService<unknown, boolean> = app.get(ConfigService);

  await app.register(helmet);
  await app.enableCors({
    origin: "*",
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(compression);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
  });

  const port: number | undefined = configService.get<number>('server.port');
  await app.listen(port ?? 3000, '0.0.0.0');
}

bootstrap().then(r => {
  console.log('Server is running');
}).catch(error => {
  console.error('Error starting server:', error);
});
