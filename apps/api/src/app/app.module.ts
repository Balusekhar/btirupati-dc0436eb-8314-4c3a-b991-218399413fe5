import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const envPath = (() => {
  const root = join(process.cwd(), '.env.local');
  const fromAppsApi = join(process.cwd(), '..', '..', '.env.local');
  return [root, fromAppsApi];
})();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envPath,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
