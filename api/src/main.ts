import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as basicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration - Allow all origins in development
  const isDev = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: isDev ? true : (process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3002',
      'https://leedz.vercel.app',
      'https://leedz-opthupsa-5935s-projects.vercel.app',
    ]),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Agent-Id'],
  });

  // Swagger documentation (enabled if SWAGGER_ENABLED=1)
  const swaggerEnabled = process.env.SWAGGER_ENABLED === '1';
  const httpAdapter = app.getHttpAdapter();

  if (swaggerEnabled) {
    // Protect Swagger with Basic Auth in production
    const swaggerUser = process.env.SWAGGER_USER || 'admin';
    const swaggerPass = process.env.SWAGGER_PASS || 'changeme';

    httpAdapter.use(
      '/api/docs',
      basicAuth({
        challenge: true,
        users: { [swaggerUser]: swaggerPass },
      }),
    );

    const config = new DocumentBuilder()
      .setTitle('Leedz API')
      .setDescription('Leedz SaaS Multi-tenant Backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('users', 'User management')
      .addTag('invites', 'Team invitations')
      .addTag('jobs', 'Job management')
      .addTag('agent', 'Extension Runner/Agent endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    // Root redirects to docs when Swagger enabled
    httpAdapter.get('/', (req: any, res: any) => {
      res.redirect('/api/docs');
    });
  } else {
    // Root returns JSON info when Swagger disabled
    httpAdapter.get('/', (req: any, res: any) => {
      res.json({
        name: 'Leedz API',
        version: '1.0.0',
        status: 'running',
        health: '/health',
      });
    });
  }

  // Bind to 0.0.0.0 for Render compatibility
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Leedz API running on port ${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
