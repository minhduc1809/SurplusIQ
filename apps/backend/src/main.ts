import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS for Web Dashboard & Android App
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('SurplusIQ Engine API')
    .setDescription(
      'Hệ thống ra quyết định chống lãng phí thực phẩm: Dự báo, Định giá động, Cứu Món',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'SurplusIQ API Docs',
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[SurplusIQ Backend] Server running on: http://localhost:${port}/api/v1`);
  console.log(`[SurplusIQ Swagger] API Docs at: http://localhost:${port}/docs`);
}
bootstrap();
