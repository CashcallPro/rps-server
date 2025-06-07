import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { RedisService } from './redis/redis.provider';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotModule } from './bot/bot.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module'; // <-- Add this import
import { RevshareModule } from './revshare/revshare.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'), // Ensure MONGODB_URI is in your .env
        // Add other Mongoose options here if needed
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GameModule,
    BotModule,
    UsersModule,
    AdminModule,
    RevshareModule,
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule { }
