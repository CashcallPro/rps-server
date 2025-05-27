import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [BotController],
  providers: [BotService],
  imports: [UsersModule]
})
export class BotModule {}