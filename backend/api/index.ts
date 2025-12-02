import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const server = express();
let app: any;

async function bootstrap() {
  if (!app) {
    const expressAdapter = new ExpressAdapter(server);
    app = await NestFactory.create(AppModule, expressAdapter);
    
    app.enableCors({
      origin: true,
      credentials: true,
    });
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    
    await app.init();
  }
  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressServer = await bootstrap();
  return new Promise((resolve, reject) => {
    expressServer(req as any, res as any);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}

