import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// Support BigInt serialization for JSON responses
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(BigInt.prototype as any).toJSON = function () {
  return this.toString(); // eslint-disable-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );

  // Bật CORS cho phép Frontend gọi API
  const allowedOrigins = [
    frontendUrl.replace(/\/$/, ''),
    'https://nova-booking-vert.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173', // Cho Vite nếu cần
  ];

  console.log('🚀 Allowed Origins:', allowedOrigins);

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // --- Swagger Configuration ---
  const config = new DocumentBuilder()
    .setTitle('NOVA Booking API')
    .setDescription('The core booking engine for Nova Badminton Management')
    .setVersion('1.0')
    .addBearerAuth() // Required for JWT-protected routes
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // QUAN TRỌNG: Lắng nghe trên 0.0.0.0 để Docker/Render có thể truy cập
  const port = process.env.PORT || 3001;
  const host = '0.0.0.0';

  console.log(`🚀 Attempting to start server on ${host}:${port}...`);

  await app.listen(port, host);

  console.log('✅ Nest application successfully started');
  console.log(`📡 Backend is running on: http://${host}:${port}`);
  console.log(`📚 Swagger documentation: http://${host}:${port}/api`);
}
bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
