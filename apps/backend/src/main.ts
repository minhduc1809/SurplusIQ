import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RealtimeService } from './modules/realtime/realtime.service';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve thư mục ảnh tải lên
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

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

  // Global API Prefix (mặc định chạy trực tiếp tại root '/', hoặc theo API_PREFIX nếu có)
  if (process.env.API_PREFIX) {
    app.setGlobalPrefix(process.env.API_PREFIX);
  }

  // Swagger chỉ bật ngoài production (hoặc khi SWAGGER_ENABLED=true) để không công khai toàn bộ API (BUG-019)
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('SurplusIQ Engine API')
      .setDescription(
        'Hệ thống ra quyết định chống lãng phí thực phẩm: Dự báo, Định giá động, Cứu Món',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
      customSiteTitle: 'SurplusIQ API Docs',
    });
  }

  const port = process.env.PORT || 4000;
  const server = await app.listen(port);
  const rootUrl = `http://localhost:${port}`;

  // Gắn WebSocket Server vào HTTP server chính
  const realtimeService = app.get(RealtimeService);
  realtimeService.init(server);

  console.log(`[SurplusIQ Backend] Server running on: ${rootUrl}`);
  console.log(`[SurplusIQ WebSocket] Realtime Gateway at: ws://localhost:${port}/ws`);
  console.log(`[SurplusIQ Swagger] API Docs at: ${rootUrl}/api`);
}
bootstrap();
