import { forwardRef, Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { UsersModule } from 'src/users/users.module';
import { RevshareModule } from 'src/revshare/revshare.module';

@Module({
  controllers: [BotController],
  providers: [BotService],
  imports: [
    UsersModule,
    forwardRef(() => RevshareModule)
  ],
  exports: [BotService]
})
export class BotModule { }