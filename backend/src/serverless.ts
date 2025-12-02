import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@vendia/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';

let server: Handler | null = null;
let bootstrapPromise: Promise<Handler> | null = null;

async function bootstrap(): Promise<Handler> {
  // Use promise-based lock to prevent race conditions with concurrent requests
  if (bootstrapPromise) {
    return bootstrapPromise;
  }
  
  if (server) {
    return server;
  }
  
  bootstrapPromise = (async () => {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS
    app.enableCors({
      origin: true, // Allow all origins in serverless (Vercel handles this)
      credentials: true,
    });
    
    // Enable validation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));
    
    await app.init();
    
    const expressApp = app.getHttpAdapter().getInstance();
    server = serverlessExpress({ app: expressApp });
    return server;
  })();
  
  return bootstrapPromise;
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  const serverHandler = await bootstrap();
  return serverHandler(event, context, callback);
};

