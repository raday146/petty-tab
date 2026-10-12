import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
// The largest body is a push subscription (about 500 bytes).
app.useBodyParser('json', { limit: '8kb' });
app.setGlobalPrefix('api');
app.enableShutdownHooks();
await app.listen(process.env.API_PORT ?? 3001);
