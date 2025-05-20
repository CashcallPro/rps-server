import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameModule } from './game/game.module';
import { RedisService } from './redis/redis.provider';
import { GameService } from './game/game.service';
import { GameGateway } from './game/game.gateway';
import { BotService } from './bot/bot.service';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './bot/bot.controller';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GameModule,
    BotModule
  ],
  controllers: [AppController],
  providers: [AppService, RedisService, GameGateway],
})
export class AppModule { }
