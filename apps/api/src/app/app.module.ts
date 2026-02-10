import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '@org/auth';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditLog, Organization, Task, User } from './entities';
import { TasksModule } from './tasks/tasks.module';
import { AuditModule } from './audit/audit.module';

const envPath = (() => {
  const root = join(process.cwd(), '.env.local');
  const fromAppsApi = join(process.cwd(), '..', '..', '.env.local');
  return [root, fromAppsApi];
})();

/**
 * TypeORM: synchronize is true only in development.
 * Production: use migrations (e.g. typeorm migration:generate / migration:run) and set synchronize: false.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envPath,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, Organization, Task, AuditLog],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TasksModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    PermissionsGuard,
    RolesGuard,
  ],
})
export class AppModule {}
