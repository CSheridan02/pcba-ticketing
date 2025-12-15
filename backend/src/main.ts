import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });
  
  // Enable CORS - allow localhost and production domains
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  // Add production frontend URL if configured
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Increase body size limit for file uploads (30MB to handle multiple 5MB files)
  app.use((req: any, res: any, next: any) => {
    if (req.url === '/tickets/upload') {
      req.setTimeout(120000); // 2 minute timeout for uploads
    }
    next();
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on port ${port}`);
}
bootstrap();
