import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { RedisService } from './redis/redis.provider';
import { GameService } from './game/game.service';
import { GameGateway } from './game/game.gateway';
import { BotService } from './bot/bot.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotController } from './bot/bot.controller';
import { BotModule } from './bot/bot.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CompletedGame, CompletedGameSchema } from './game/schema/completed-game.schema';
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
    // Register the schema for use in the GameGateway's module context
    // If GameGateway is in its own GameModule, this forFeature import should be there.
    MongooseModule.forFeature([{ name: CompletedGame.name, schema: CompletedGameSchema }]),

    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GameModule,
    BotModule,
    UsersModule,
    AdminModule, // <-- Add AdminModule here
    RevshareModule,
  ],
  controllers: [AppController],
  providers: [AppService, RedisService, GameGateway],
})
export class AppModule { }
