import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RevshareModule } from 'src/revshare/revshare.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CompletedGame, CompletedGameSchema } from './schema/completed-game.schema';
import { RedisService } from 'src/redis/redis.provider';
import { UsersModule } from 'src/users/users.module';
import { AdminModule } from 'src/admin/admin.module';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CompletedGame.name, schema: CompletedGameSchema }]),
    RevshareModule,
    UsersModule,
    AdminModule,
    BotModule
  ],
  providers: [GameGateway, RedisService],
})
export class GameModule { }
