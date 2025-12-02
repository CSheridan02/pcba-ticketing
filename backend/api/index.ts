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
    
    // CORS is handled manually at the Vercel handler level
    // to properly handle origin arrays and credentials with wildcards
    
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

/**
 * Safely extract origin string from request headers.
 * Node.js headers can be string | string[] | undefined.
 * Origin header should always be a single string value.
 */
function getOriginString(origin: string | string[] | undefined): string | undefined {
  if (!origin) {
    return undefined;
  }
  // If it's an array, use the first element
  if (Array.isArray(origin)) {
    return origin[0];
  }
  return origin;
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = getOriginString(req.headers.origin);
  
  // CORS spec: Cannot use wildcard (*) with credentials
  // Only set credentials header when we have a specific origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // No origin header (e.g., same-origin, server-to-server, curl)
    // Use wildcard but without credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
    return;
  }

  // Set CORS headers for all responses
  setCorsHeaders(req, res);

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
