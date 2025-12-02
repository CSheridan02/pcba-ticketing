import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { RequestHandler } from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const expressApp = express();
let appHandler: RequestHandler | null = null;
let bootstrapPromise: Promise<RequestHandler> | null = null;

async function bootstrap(): Promise<RequestHandler> {
  // Use promise-based lock to prevent race conditions
  if (bootstrapPromise) {
    return bootstrapPromise;
  }
  
  if (appHandler) {
    return appHandler;
  }
  
  bootstrapPromise = (async () => {
    const expressAdapter = new ExpressAdapter(expressApp);
    const app = await NestFactory.create(AppModule, expressAdapter);
    
    app.enableCors({
      origin: true,
      credentials: true,
    });
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    
    await app.init();
    
    // Return the Express app's request handler
    appHandler = expressApp;
    return appHandler;
  })();
  
  return bootstrapPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestHandler = await bootstrap();
  
  return new Promise<void>((resolve, reject) => {
    // Use Express app as middleware - it accepts (req, res, next)
    requestHandler(req as any, res as any, (err?: any) => {
      if (err) {
        reject(err);
      }
    });
    res.on('finish', () => resolve());
    res.on('error', reject);
  });
}

